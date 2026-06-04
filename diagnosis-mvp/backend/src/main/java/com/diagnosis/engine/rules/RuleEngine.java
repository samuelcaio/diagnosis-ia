package com.diagnosis.engine.rules;

import com.diagnosis.engine.dto.EngineContext;
import com.diagnosis.engine.dto.EngineResult;
import com.diagnosis.engine.dto.ProtocolRuleV3;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@Component
@Slf4j
@RequiredArgsConstructor
public class RuleEngine {

    private final ObjectMapper objectMapper;
    private List<ProtocolRuleV3> rules = new ArrayList<>();

    @PostConstruct
    public void init() {
        try (InputStream is = getClass().getResourceAsStream("/clinical_protocols_v3.json")) {
            if (is != null) {
                rules = objectMapper.readValue(is, new TypeReference<List<ProtocolRuleV3>>() {});
                log.info("Carregado(s) {} protocolo(s) clínico(s) estritos.", rules.size());
            }
        } catch (Exception e) {
            log.error("Erro ao carregar protocolos clínicos V3", e);
        }
    }

    public List<EngineResult> evaluate(EngineContext ctx) {
        List<EngineResult> results = new ArrayList<>();
        List<String> patientSymptoms = ctx.getExtractedSymptoms();

        for (ProtocolRuleV3 rule : rules) {
            // Regras Demográficas de Segurança (Hardcoded conforme solicitação de Camada de Segurança)
            if (ctx.getPatient() != null) {
                // Exclusão por Sexo
                if ("MASCULINO".equalsIgnoreCase(ctx.getPatient().getGender())) {
                    if (rule.getNome().toUpperCase().contains("GRAVIDEZ") || 
                        rule.getNome().toUpperCase().contains("ECLÂMPSIA") || 
                        rule.getNome().toUpperCase().contains("ECLAMPSIA") || 
                        rule.getNome().toUpperCase().contains("HIPERÊMESE")) {
                        results.add(EngineResult.block(rule, "Camada de Segurança: Doença obstétrica incompatível com sexo masculino."));
                        continue;
                    }
                }
                
                // Exclusão por Idade
                int age = getAgeFromBirthDate(ctx.getPatient().getBirthDate());
                if (age < 12) {
                    if (rule.getCid().startsWith("I2") || rule.getCid().startsWith("I6") || rule.getCid().startsWith("J44")) {
                        results.add(EngineResult.block(rule, "Camada de Segurança: Doença de exclusividade adulta incompatível com pediatria (<12 anos)."));
                        continue;
                    }
                }
            }

            // 1. Verificação de Critérios Obrigatórios
            boolean hasAllObrigatorios = true;
            List<String> missingObrigatorios = new ArrayList<>();
            for (String obr : rule.getCriteriosObrigatorios()) {
                if (!patientSymptoms.contains(obr)) {
                    hasAllObrigatorios = false;
                    missingObrigatorios.add(obr);
                }
            }

            if (!hasAllObrigatorios) {
                // Regra Fundamental: Bloquear
                results.add(EngineResult.block(rule, "Ausência de critério obrigatório: " + String.join(", ", missingObrigatorios)));
                continue;
            }

            // 2. Verificação de Critérios Excludentes
            boolean hasExcludente = false;
            String excludenteFound = "";
            for (String exc : rule.getCriteriosExcludentes()) {
                if (patientSymptoms.contains(exc)) {
                    hasExcludente = true;
                    excludenteFound = exc;
                    break;
                }
            }

            if (hasExcludente) {
                results.add(EngineResult.block(rule, "Presença de critério excludente: " + excludenteFound));
                continue;
            }

            // 3. Sistema de Pontuação
            int score = 0;
            List<String> evidenciasEncontradas = new ArrayList<>();
            List<String> evidenciasAusentes = new ArrayList<>();

            java.util.Map<String, Integer> pesoMap = rule.getPeso();

            for (String obr : rule.getCriteriosObrigatorios()) {
                score += pesoMap != null ? pesoMap.getOrDefault(obr, 30) : 30;
                evidenciasEncontradas.add(obr);
            }

            for (String forte : rule.getCriteriosFortes()) {
                if (patientSymptoms.contains(forte)) {
                    score += pesoMap != null ? pesoMap.getOrDefault(forte, 15) : 15;
                    evidenciasEncontradas.add(forte);
                } else {
                    evidenciasAusentes.add(forte);
                }
            }

            // Regras Demográficas (Bônus Idosos)
            if (ctx.getPatient() != null && getAgeFromBirthDate(ctx.getPatient().getBirthDate()) > 60) {
                if (rule.getCid().startsWith("I2") || rule.getCid().startsWith("I6")) {
                    score += 10; // Bônus prevalência idosos
                }
            }

            // Regra de Confiança: Máxima de 95%
            if (score > 95) score = 95;

            if (score > 0) {
                results.add(EngineResult.builder()
                        .cid(rule.getCid())
                        .diagnostico(rule.getNome())
                        .score(score)
                        .confianca(score)
                        .evidenciasEncontradas(evidenciasEncontradas)
                        .evidenciasAusentes(evidenciasAusentes)
                        .conduta(rule.getConduta())
                        .examesPermitidos(rule.getExamesPermitidos())
                        .prescricoesPermitidas(rule.getPrescricoesPermitidas())
                        .motivoDaSugestao("Critérios obrigatórios satisfeitos. Score clínico: " + score)
                        .isBloqueado(false)
                        .sourceRule(rule)
                        .build());
            }
        }

        // Ordenar por score decrescente
        results.sort((a, b) -> Integer.compare(b.getScore(), a.getScore()));
        return results;
    }

    private int getAgeFromBirthDate(Object birthDateObj) {
        if (birthDateObj == null) return 30; // default
        try {
            if (birthDateObj instanceof java.time.LocalDate) {
                return java.time.Period.between((java.time.LocalDate) birthDateObj, java.time.LocalDate.now()).getYears();
            } else if (birthDateObj instanceof String) {
                String birthDate = (String) birthDateObj;
                if (birthDate.isEmpty()) return 30;
                java.time.LocalDate birth = java.time.LocalDate.parse(birthDate);
                return java.time.Period.between(birth, java.time.LocalDate.now()).getYears();
            }
            return 30;
        } catch (Exception e) {
            return 30;
        }
    }
}
