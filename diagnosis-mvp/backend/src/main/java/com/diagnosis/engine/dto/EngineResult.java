package com.diagnosis.engine.dto;

import lombok.Builder;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
public class EngineResult {
    private String cid;
    private String diagnostico;
    private int score;
    private int confianca; // percentage max 95
    private List<String> evidenciasEncontradas;
    private List<String> evidenciasAusentes;
    private String conduta;
    private List<String> examesPermitidos;
    private List<String> prescricoesPermitidas;
    private String motivoDaSugestao;
    private boolean isBloqueado;
    private String motivoBloqueio;
    private ProtocolRuleV3 sourceRule;

    public static EngineResult block(ProtocolRuleV3 rule, String motivo) {
        return EngineResult.builder()
                .cid(rule.getCid())
                .diagnostico(rule.getNome())
                .isBloqueado(true)
                .motivoBloqueio(motivo)
                .sourceRule(rule)
                .build();
    }
}
