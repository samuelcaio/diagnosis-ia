package com.diagnosis.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertResult {

    private String alert;
    private String cid;
    private Integer probability;
    private Map<String, Integer> factors;
    private List<String> exams;
    private String conduct;
    private List<String> contraindications;
    private List<AlertResult> alternativeHypotheses;
    
    // Novos campos de explicabilidade do CDSS
    private List<String> evidenciasEncontradas;
    private List<String> evidenciasAusentes;
    private String motivoDaSugestao;

    // Camada 10: Geração SOAP Estruturada e Blindada
    private String soapSubjetivo;
    private String soapObjetivo;
    private String soapAvaliacao;
    private String soapPlano;

    public static AlertResult lowRisk() {
        return AlertResult.builder()
                .alert("Baixo Risco Cardiovascular")
                .cid("Z00.0")
                .probability(8)
                .factors(Map.of("Parâmetros Normais", 100))
                .exams(Collections.emptyList())
                .conduct("Manter acompanhamento de rotina na UBS e hábitos saudáveis.")
                .contraindications(Collections.emptyList())
                .alternativeHypotheses(Collections.emptyList())
                .build();
    }
}
