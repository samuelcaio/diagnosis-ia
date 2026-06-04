package com.diagnosis.engine;

import com.diagnosis.engine.audit.ClinicalAuditLogger;
import com.diagnosis.engine.dto.EngineContext;
import com.diagnosis.engine.dto.EngineResult;
import com.diagnosis.engine.rules.ConsistencyEngine;
import com.diagnosis.engine.rules.RiskEngine;
import com.diagnosis.engine.rules.RuleEngine;
import com.diagnosis.engine.rules.SymptomExtractor;
import com.diagnosis.model.Condition;
import com.diagnosis.model.MedicalRecord;
import com.diagnosis.model.Observation;
import com.diagnosis.model.Patient;
import com.diagnosis.model.Triage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClinicalDecisionPipeline {

    private final SymptomExtractor symptomExtractor;
    private final RuleEngine ruleEngine;
    private final ConsistencyEngine consistencyEngine;
    private final RiskEngine riskEngine;
    private final ClinicalAuditLogger auditLogger;

    public List<EngineResult> executePipeline(String userEmail, Patient patient, List<Condition> conditions, 
                                              List<Observation> observations, List<Triage> triages, MedicalRecord latestRecord, String rawText,
                                              String queixaPrincipal, java.util.Map<String, String> questionarioDinamico,
                                              List<String> sintomasAssociados, List<String> fatoresDeRiscoSelecionados,
                                              String observacaoComplementar) {
        log.info("Iniciando Pipeline de Decisão Clínica Estrita para paciente: {}", patient != null ? patient.getId() : "N/A");

        // 1. Contexto e Extração (Anamnese -> Extração de Sintomas)
        EngineContext context = EngineContext.builder()
                .patient(patient)
                .conditions(conditions)
                .observations(observations)
                .triages(triages)
                .latestRecord(latestRecord)
                .currentText(rawText)
                .queixaPrincipal(queixaPrincipal)
                .questionarioDinamico(questionarioDinamico)
                .sintomasAssociados(sintomasAssociados)
                .fatoresDeRiscoSelecionados(fatoresDeRiscoSelecionados)
                .observacaoComplementar(observacaoComplementar)
                .build();
        
        symptomExtractor.extractSymptoms(context);

        // 2. Motor de Regras Clínicas
        List<EngineResult> ruleResults = ruleEngine.evaluate(context);

        // 3. Motor de Consistência
        List<EngineResult> consistencyResults = consistencyEngine.validate(context, ruleResults);

        // 4. Motor de Risco
        List<EngineResult> finalResults = riskEngine.evaluateRisk(context, consistencyResults);

        // 5. Regra de Auditoria
        auditLogger.logDecision(userEmail, context, finalResults);

        // Retornar apenas os que não foram bloqueados para a IA formatar depois
        return finalResults.stream().filter(r -> !r.isBloqueado()).toList();
    }
}
