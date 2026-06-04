package com.diagnosis.engine.rules;

import com.diagnosis.engine.dto.EngineContext;
import com.diagnosis.engine.dto.EngineResult;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

/**
 * CAMADA 10 - GERAÇÃO SOAP BLINDADA
 * A IA jamais poderá inventar informação. Somente utilizar dados digitados e validados pelo Motor.
 */
@Component
public class AiSoapGenerator {

    public String[] generateSoap(EngineContext ctx, EngineResult result) {
        String[] soap = new String[4];

        // S: Subjetivo (Gerado a partir das opções estruturadas)
        StringBuilder subjetivo = new StringBuilder();
        if (ctx.getQueixaPrincipal() != null && !ctx.getQueixaPrincipal().isBlank()) {
            subjetivo.append("Queixa Principal: ").append(ctx.getQueixaPrincipal()).append("\n");
        }
        if (ctx.getQuestionarioDinamico() != null && !ctx.getQuestionarioDinamico().isEmpty()) {
            subjetivo.append("Detalhes da Queixa:\n");
            ctx.getQuestionarioDinamico().forEach((k, v) -> subjetivo.append("- ").append(k).append(": ").append(v).append("\n"));
        }
        if (ctx.getSintomasAssociados() != null && !ctx.getSintomasAssociados().isEmpty()) {
            subjetivo.append("Sintomas Associados: ").append(String.join(", ", ctx.getSintomasAssociados())).append("\n");
        }
        if (ctx.getObservacaoComplementar() != null && !ctx.getObservacaoComplementar().isBlank()) {
            subjetivo.append("Observação Complementar: ").append(ctx.getObservacaoComplementar()).append("\n");
        }
        if (subjetivo.length() == 0) {
            String rawText = ctx.getLatestRecord() != null ? ctx.getLatestRecord().getContent() : "Sem registro principal.";
            subjetivo.append("Motivo da Consulta / Queixa: ").append(rawText).append("\n");
        }
        
        String extractedSintomas = String.join(", ", ctx.getExtractedSymptoms());
        subjetivo.append("\nSintomas Extraídos (Normalizados): ").append(extractedSintomas.isEmpty() ? "Nenhum" : extractedSintomas);
        
        soap[0] = subjetivo.toString().trim();

        // O: Objetivo (Apenas sinais vitais e dados concretos)
        StringBuilder objetivo = new StringBuilder();
        if (ctx.getTriages() != null && !ctx.getTriages().isEmpty()) {
            var t = ctx.getTriages().get(0);
            objetivo.append("Sinais Vitais da Triagem:\n");
            if (t.getBloodPressure() != null) objetivo.append("- PA: ").append(t.getBloodPressure()).append(" mmHg\n");
            if (t.getHeartRate() != null) objetivo.append("- FC: ").append(t.getHeartRate()).append(" bpm\n");
            if (t.getRespiratoryRate() != null) objetivo.append("- FR: ").append(t.getRespiratoryRate()).append(" irpm\n");
            if (t.getOxygenSaturation() != null) objetivo.append("- SatO2: ").append(t.getOxygenSaturation()).append("%\n");
            if (t.getTemperature() != null) objetivo.append("- Temp: ").append(t.getTemperature()).append(" °C\n");
        } else {
            objetivo.append("Sinais vitais não registrados na triagem.");
        }
        soap[1] = objetivo.toString().trim();

        // A: Avaliação (Estritamente a hipótese validada pelo Motor de Regras e Consistência)
        String avaliacao = "Hipótese Diagnóstica Primária (Validada pelo CDSS): " + result.getDiagnostico() + " (CID-10: " + result.getCid() + ")\n"
                + "Nível de Confiança Clínico: " + result.getScore() + "%\n"
                + "Evidências Corroboradas: " + String.join(", ", result.getEvidenciasEncontradas());
        if (result.getSourceRule() != null && result.getSourceRule().isEmergencia()) {
            avaliacao += "\n[!] ALERTA CRÍTICO: QUADRO DE EMERGÊNCIA DETECTADO PELO RISK ENGINE.";
        }
        soap[2] = avaliacao;

        // P: Plano (Restrito às condutas e exames permitidos pelo Protocolo do Ministério da Saúde)
        String examesStr = result.getExamesPermitidos().isEmpty() ? "Nenhum exame crítico sugerido." : String.join(", ", result.getExamesPermitidos());
        
        soap[3] = "Conduta Aprovada pelo Protocolo: " + result.getConduta() + "\n"
                + "Exames Sugeridos: " + examesStr;

        return soap;
    }
}
