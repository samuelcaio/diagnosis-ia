package com.diagnosis.service;

import com.diagnosis.dto.AlertResult;
import com.diagnosis.exception.CustomException;
import com.diagnosis.model.Condition;
import com.diagnosis.model.MedicalRecord;
import com.diagnosis.model.Observation;
import com.diagnosis.model.Patient;
import com.diagnosis.model.Triage;
import com.diagnosis.repository.ConditionRepository;
import com.diagnosis.repository.MedicalRecordRepository;
import com.diagnosis.repository.ObservationRepository;
import com.diagnosis.repository.PatientRepository;
import com.diagnosis.repository.TriageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.Map;
import com.diagnosis.engine.dto.EngineContext;

@Service
@RequiredArgsConstructor
public class AiService {

    private final PatientRepository patientRepository;
    private final ConditionRepository conditionRepository;
    private final ObservationRepository observationRepository;
    private final TriageRepository triageRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final com.diagnosis.engine.ClinicalDecisionPipeline clinicalDecisionPipeline;
    private final com.diagnosis.engine.rules.AiSoapGenerator aiSoapGenerator;
    private final AuditService auditService;

    @Transactional
    public AlertResult analyze(UUID patientId, String ipAddress, String mode, String rawText,
                               String queixaPrincipal, Map<String, String> questionarioDinamico,
                               List<String> sintomasAssociados, List<String> fatoresDeRiscoSelecionados,
                               String observacaoComplementar) {
        auditService.bindDatabaseUser();

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new CustomException("Paciente não encontrado.", HttpStatus.NOT_FOUND));

        List<Condition> conditions = conditionRepository.findByPatientId(patientId);
        List<Observation> observations = observationRepository.findByPatientIdOrderByRecordedAtDesc(patientId);
        List<Triage> triages = triageRepository.findByPatientId(patientId);
        List<MedicalRecord> records = medicalRecordRepository.findByPatientIdOrderByRecordedAtDesc(patientId);

        auditService.logAccess(patient.getId(), "ANALISE_IA_DIAGNOSTICA_ALERTA", ipAddress);

        // Execute the strict Clinical Decision Pipeline
        // Wait, AiSoapGenerator needs EngineContext. Let's build a quick one since Pipeline doesn't return context.
        EngineContext ctx = EngineContext.builder()
                .patient(patient)
                .conditions(conditions)
                .observations(observations)
                .triages(triages)
                .latestRecord(records.isEmpty() ? null : records.get(0))
                .currentText(rawText)
                .queixaPrincipal(queixaPrincipal)
                .questionarioDinamico(questionarioDinamico)
                .sintomasAssociados(sintomasAssociados)
                .fatoresDeRiscoSelecionados(fatoresDeRiscoSelecionados)
                .observacaoComplementar(observacaoComplementar)
                .build();

        List<com.diagnosis.engine.dto.EngineResult> pipelineResults = clinicalDecisionPipeline.executePipeline(
                ipAddress, patient, conditions, observations, triages, records.isEmpty() ? null : records.get(0), rawText,
                queixaPrincipal, questionarioDinamico, sintomasAssociados, fatoresDeRiscoSelecionados, observacaoComplementar);

        List<AlertResult> hypotheses = pipelineResults.stream().map(r -> {
            ctx.setExtractedSymptoms(r.getEvidenciasEncontradas()); // Mock to pass to generator
            String[] soap = aiSoapGenerator.generateSoap(ctx, r);
            return AlertResult.builder()
                .alert(r.getDiagnostico())
                .cid(r.getCid())
                .probability(r.getScore())
                // O front legada usa 'factors' num map. Vamos manter mock para n quebrar, e passamos os arrays novos reais
                .factors(r.getEvidenciasEncontradas().stream().collect(Collectors.toMap(e -> e, e -> 10)))
                .exams(r.getExamesPermitidos())
                .conduct(r.getConduta())
                // As contraindicações reias de meds (se a regra n trouxer nula)
                .contraindications(List.of()) 
                .evidenciasEncontradas(r.getEvidenciasEncontradas())
                .evidenciasAusentes(r.getEvidenciasAusentes())
                .motivoDaSugestao(r.getMotivoDaSugestao())
                .soapSubjetivo(soap[0])
                .soapObjetivo(soap[1])
                .soapAvaliacao(soap[2])
                .soapPlano(soap[3])
                .build();
        }).collect(Collectors.toList());

        if ("PRECAUCAO".equalsIgnoreCase(mode)) {
            // Em modo precaução, retorna apenas alertas/precauções, sem auto-preenchimento
            if (!hypotheses.isEmpty()) {
                AlertResult primary = hypotheses.get(0);
                primary.setCid(null);
                primary.setConduct("Apenas alertas de segurança mapeados. Evolução clínica deverá ser preenchida manualmente.");
                return primary;
            }
            return AlertResult.lowRisk();
        }

        if (hypotheses.isEmpty()) {
            return AlertResult.lowRisk();
        }

        // The first hypothesis is the primary one (highest score)
        AlertResult primary = hypotheses.get(0);

        // The other hypotheses are alternative/secondary ones
        List<AlertResult> alternatives = hypotheses.stream()
                .skip(1)
                .collect(Collectors.toList());

        primary.setAlternativeHypotheses(alternatives);

        return primary;
    }
}
