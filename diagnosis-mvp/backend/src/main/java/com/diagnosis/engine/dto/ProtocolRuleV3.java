package com.diagnosis.engine.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProtocolRuleV3 {

    private String cid;
    private String nome;
    private List<String> criteriosObrigatorios;
    private List<String> criteriosFortes;
    private List<String> criteriosExcludentes;
    private Map<String, Integer> peso;
    
    private String conduta;
    private List<String> examesPermitidos;
    private List<String> prescricoesPermitidas;
    
    // Configurações de Risco (Risk Engine)
    private boolean isEmergencia;
    
    // Parâmetros de sinais vitais para ativação da regra
    private VitalCriteria vitalCriteria;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VitalCriteria {
        private Double systolicBPMin;
        private Double diastolicBPMin;
        private Double temperatureMin;
        private Double saturationMax;
        private Double heartRateMin;
        private Double heartRateMax;
    }
}
