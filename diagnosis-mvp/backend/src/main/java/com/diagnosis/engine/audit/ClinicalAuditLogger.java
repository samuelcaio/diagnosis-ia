package com.diagnosis.engine.audit;

import com.diagnosis.engine.dto.EngineContext;
import com.diagnosis.engine.dto.EngineResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class ClinicalAuditLogger {

    private final ObjectMapper objectMapper;

    public void logDecision(String userEmail, EngineContext ctx, List<EngineResult> results) {
        try {
            Map<String, Object> audit = new HashMap<>();
            audit.put("usuario", userEmail);
            audit.put("data_hora", LocalDateTime.now().toString());
            
            // Dados Recebidos
            Map<String, Object> dadosRecebidos = new HashMap<>();
            dadosRecebidos.put("sintomasExtraidos", ctx.getExtractedSymptoms());
            dadosRecebidos.put("idPaciente", ctx.getPatient() != null ? ctx.getPatient().getId() : null);
            audit.put("dados_recebidos", dadosRecebidos);

            // Resultados
            List<EngineResult> aceitos = results.stream().filter(r -> !r.isBloqueado()).toList();
            List<EngineResult> bloqueados = results.stream().filter(EngineResult::isBloqueado).toList();

            audit.put("diagnosticos_gerados", aceitos.stream().map(EngineResult::getDiagnostico).toList());
            audit.put("regras_aplicadas", aceitos.stream().map(r -> r.getSourceRule().getNome()).toList());
            audit.put("regras_rejeitadas", bloqueados.stream().map(r -> r.getDiagnostico() + " (" + r.getMotivoBloqueio() + ")").toList());
            
            audit.put("prescricoes_sugeridas", aceitos.stream().flatMap(r -> r.getPrescricoesPermitidas().stream()).distinct().toList());
            audit.put("justificativas", aceitos.stream().map(EngineResult::getMotivoDaSugestao).toList());

            String jsonLog = objectMapper.writeValueAsString(audit);
            log.info("🏥 CLINICAL AUDIT TRAIL: {}", jsonLog);
        } catch (Exception e) {
            log.error("Erro ao gerar log de auditoria clínica", e);
        }
    }
}
