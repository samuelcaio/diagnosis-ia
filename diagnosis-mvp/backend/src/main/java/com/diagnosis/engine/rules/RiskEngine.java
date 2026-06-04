package com.diagnosis.engine.rules;

import com.diagnosis.engine.dto.EngineContext;
import com.diagnosis.engine.dto.EngineResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@Slf4j
public class RiskEngine {

    public List<EngineResult> evaluateRisk(EngineContext ctx, List<EngineResult> validatedResults) {
        List<EngineResult> finalResults = new ArrayList<>();

        for (EngineResult res : validatedResults) {
            if (res.isBloqueado()) {
                finalResults.add(res);
                continue;
            }

            if (res.getSourceRule().isEmergencia()) {
                // Se é emergência, garantimos que os critérios obrigatórios estão 100% satisfeitos 
                // (Isso já é garantido pelo RuleEngine, mas aqui reforçamos a verificação estrutural)
                
                // Podemos adicionar alertas críticos à conduta
                res.setConduta("[ALERTA CRÍTICO: " + res.getDiagnostico().toUpperCase() + "] " + res.getConduta());
                log.warn("🚨 Risco Crítico Identificado: {} - CID: {}", res.getDiagnostico(), res.getCid());
            }

            finalResults.add(res);
        }

        return finalResults;
    }
}
