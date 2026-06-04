package com.diagnosis.engine.rules;

import com.diagnosis.engine.dto.EngineContext;
import com.diagnosis.engine.dto.EngineResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@Slf4j
public class ConsistencyEngine {

    public List<EngineResult> validate(EngineContext ctx, List<EngineResult> ruleResults) {
        List<EngineResult> validatedResults = new ArrayList<>();

        for (EngineResult result : ruleResults) {
            if (result.isBloqueado()) {
                validatedResults.add(result);
                continue;
            }

            // Cross-validation: Exame Físico e Sinais Vitais vs Diagnóstico
            boolean hasConflict = false;
            String conflictReason = "";

            if (result.getSourceRule() != null && result.getSourceRule().getVitalCriteria() != null) {
                var vitalCriteria = result.getSourceRule().getVitalCriteria();
                
                if (ctx.getTriages() != null && !ctx.getTriages().isEmpty()) {
                    var t = ctx.getTriages().get(0);
                    
                    // Exemplo: HAS requer pressão alta na triagem atual se estiver disponível
                    if (vitalCriteria.getSystolicBPMin() != null && t.getBloodPressure() != null) {
                        try {
                            double sys = Double.parseDouble(t.getBloodPressure().split("/")[0]);
                            if (sys < vitalCriteria.getSystolicBPMin()) {
                                hasConflict = true;
                                conflictReason = "Pressão Sistólica atual (" + sys + ") incompatível com requisito mínimo (" + vitalCriteria.getSystolicBPMin() + ")";
                            }
                        } catch (Exception ignored) {}
                    }
                }
            }

            if (hasConflict) {
                log.warn("Diagnóstico {} rejeitado pelo Consistency Engine: {}", result.getDiagnostico(), conflictReason);
                validatedResults.add(EngineResult.block(result.getSourceRule(), "ERRO DE CONSISTÊNCIA CLÍNICA: " + conflictReason));
            } else {
                validatedResults.add(result);
            }
        }

        return validatedResults;
    }
}
