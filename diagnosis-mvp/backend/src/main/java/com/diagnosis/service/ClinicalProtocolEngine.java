package com.diagnosis.service;

import com.diagnosis.dto.AlertResult;
import com.diagnosis.dto.ProtocolRule;
import com.diagnosis.model.Condition;
import com.diagnosis.model.MedicalRecord;
import com.diagnosis.model.Observation;
import com.diagnosis.model.Patient;
import com.diagnosis.model.Triage;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClinicalProtocolEngine {

    private final ObjectMapper objectMapper;
    private List<ProtocolRule> rules = new ArrayList<>();

    private static final Map<String, List<String>> SYNONYMS = Map.ofEntries(
        Map.entry("FEBRE", List.of("FEBRE", "FEVER", "HIPERTERMIA", "AQUECIDO", "ALTA TEMPERATURA", "QUENTE", "TEMPERATURA ELEVADA")),
        Map.entry("CEFALEIA", List.of("CEFALEIA", "DOR_CABECA", "DOR DE CABEÇA", "HEADACHE", "CEFALEIA_CRONICA", "CEFALEIA TENSIONAL")),
        Map.entry("TONTURA", List.of("TONTURA", "VERTIGEM", "DIZZINESS", "LABIRINTITE", "INSTABILIDADE", "TONTO", "ZONZO")),
        Map.entry("DOR_OUVIDO", List.of("DOR_OUVIDO", "DOR DE OUVIDO", "EAR_ACHE", "OTALGIA", "OUVIDO INFLAMADO")),
        Map.entry("OLHOS_LACRIMEJANDO", List.of("OLHOS_LACRIMEJANDO", "WATERY_EYES", "LACRIMEJAMENTO", "OLHOS VERMELHOS", "OLHOS LACRIMEJANDO")),
        Map.entry("MYALGIA", List.of("MYALGIA", "MIALGIA", "DOR_CORPO", "DOR NO CORPO", "DOR_MUSCULAR", "DORES MUSCULARES", "CORPO DOLORIDO")),
        Map.entry("DOR_ARTICULAR", List.of("DOR_ARTICULAR", "ARTRALGIA", "DOR NAS ARTICULACOES", "DOR_ARTICULACAO", "DOR NA JUNTA", "JUNTA INFLAMADA")),
        Map.entry("TOSSE", List.of("TOSSE", "COUGH", "EXPECTORACAO", "TOSSE SECA", "TOSSE COM CATARRO", "TOSSE PRODUTIVA")),
        Map.entry("DISPNEIA", List.of("DISPNEIA", "FALTA_AR", "FALTA DE AR", "DIFICULDADE RESPIRATORIA", "DYSPNEA", "CANSAÇO AO RESPIRAR")),
        Map.entry("DOR_GARGANTA", List.of("DOR_GARGANTA", "GARGANTA INFLAMADA", "SORE THROAT", "DOR DE GARGANTA", "ODINOFAGIA", "DIFICULDADE DE ENGOLIR")),
        Map.entry("NAUSEAS", List.of("NAUSEAS", "NAUSEA", "NÁUSEAS", "VOMITO", "ENJOO", "ANSEIA")),
        Map.entry("NÁUSEAS", List.of("NAUSEAS", "NAUSEA", "NÁUSEAS", "VOMITO", "ENJOO", "ANSEIA")),
        Map.entry("AZIA", List.of("AZIA", "QUEIMACAO", "PIROSE", "HEARTBURN", "QUEIMAÇÃO", "REFLUXO")),
        Map.entry("DOR_EPIGASTRICA", List.of("DOR_EPIGASTRICA", "DOR NO ESTOMAGO", "DOR EPIGASTRICA", "DOR NO ESTÔMAGO", "DOR DE ESTÔMAGO")),
        Map.entry("DOR_LOMBAR", List.of("DOR_LOMBAR", "LOMBALGIA", "DOR NAS COSTAS", "BACKPAIN", "DOR NA COLUNA")),
        Map.entry("DYSURIA", List.of("DYSURIA", "DISURIA", "DOR_URINAR", "DOR AO URINAR", "ARDOR AO URINAR", "ARDENCIA AO URINAR")),
        Map.entry("POLACIURIA", List.of("POLACIURIA", "AUMENTO_MICCAO", "URINAR_TODA_HORA", "URINAR MUITO", "MICTÓRIO FREQUENTE")),
        Map.entry("DOR_SUPRAPUBICA", List.of("DOR_SUPRAPUBICA", "DOR BAIXO VENTRE", "DOR SUPRAPUBICA", "DOR NO PÉ DA BARRIGA")),
        Map.entry("URINA_FÉTIDA", List.of("URINA_FETIDA", "URINA FEDIDA", "URINA_FETIDA", "URINA DE CHEIRO FORTE", "URINA MAL CHEIROSA")),
        Map.entry("TRISTEZA_PERSISTENTE", List.of("TRISTEZA_PERSISTENTE", "DEPRESSAO", "DESANIMO", "TRISTEZA", "DESÂNIMO", "MELANCOLIA", "CHORO FACIL")),
        Map.entry("INSÔNIA", List.of("INSONIA", "INSÔNIA", "DIFICULDADE_SONO", "DIFICULDADE PARA DORMIR", "SONO_RUIM", "DESPERTAR PRECOCE", "ACORDAR A NOITE")),
        Map.entry("AMENORREIA", List.of("AMENORREIA", "ATRASO_MENSTRUACAO", "ATRASO MENSTRUAL", "GRAVIDEZ", "SUSPEITA_GRAVIDEZ", "MENSTRUACAO ATRASADA", "AUSENCIA DE MENSTRUACAO")),
        Map.entry("VISAO_TURVA", List.of("VISAO_TURVA", "VISÃO TURVA", "VISÃO EMBAÇADA", "VISAO EMBAÇADA", "EMBAÇAMENTO", "BLURRED VISION")),
        Map.entry("ZUMBIDO", List.of("ZUMBIDO", "ZUMBIDO NO OUVIDO", "TINNITUS")),
        Map.entry("POLIURIA", List.of("POLIURIA", "URINA MUITO", "URINA TODA HORA", "POLIÚRIA", "URINANDO MUITO")),
        Map.entry("POLIDIPSIA", List.of("POLIDIPSIA", "SEDE EXCESSIVA", "MUITA SEDE", "POLIDÍPSIA")),
        Map.entry("PERDA_PESO", List.of("PERDA_PESO", "PERDA DE PESO", "EMAGRECIMENTO", "PERDA DE PESO INVOLUNTARIA", "EMAGRECEU")),
        Map.entry("POLIFAGIA", List.of("POLIFAGIA", "MUITA FOME", "FOME AUMENTADA", "APETITE EXAGERADO")),
        Map.entry("SOBREPESO", List.of("SOBREPESO", "IMC ALTO", "GANHO DE PESO", "OBESIDADE", "PESO ELEVADO")),
        Map.entry("ACANTOSE_NIGRICA", List.of("ACANTOSE_NIGRICA", "ACANTOSE NIGRICA", "MANCHAS ESCURAS NO PESCOCO", "ACANTOSE NÍGRICA")),
        Map.entry("APNEIA_SONO", List.of("APNEIA_SONO", "APNEIA DO SONO", "RONCO", "PARADA RESPIRATORIA SONO")),
        Map.entry("XANTELASMA", List.of("XANTELASMA", "PLACAS AMARELAS NAS PALPEBRAS")),
        Map.entry("PELE_SECA", List.of("PELE_SECA", "PELE SECA", "XEROSE", "PELE RESSECADA", "PELE DESCAMATIVA")),
        Map.entry("CONSTIPACAO", List.of("CONSTIPACAO", "CONSTIPAÇÃO", "PRISAO DE VENTRE", "INTESTINO PRESO", "INTESTINO RESSECADO")),
        Map.entry("TREMORES", List.of("TREMORES", "TREMOR", "TREMOR NAS MAOS", "TREMENDO")),
        Map.entry("PELE_PÁLIDA", List.of("PELE_PÁLIDA", "PELE PALIDA", "PELE PALIDEZ", "PALIDEZ CUTANEA", "PALIDEZ", "DESCORADO")),
        Map.entry("FORMIGAMENTO", List.of("FORMIGAMENTO", "PARESTESIA", "DORMENCIA", "ADORMECIMENTO")),
        Map.entry("DÉFICIT_COGNITIVO", List.of("DÉFICIT_COGNITIVO", "DEFICIT COGNITIVO", "DIFICULDADE MEMORIA", "ESQUECIMENTO", "CONFUSAO MENTAL")),
        Map.entry("TENSAO_MUSCULAR", List.of("TENSAO_MUSCULAR", "RIGIDEZ MUSCULAR", "DOR MUSCULAR", "CONTRATURA")),
        Map.entry("QUEDAS", List.of("QUEDAS", "QUEDA", "CAIR", "DESEQUILIBRIO", "INSTABILIDADE POSTURAL")),
        Map.entry("RETRO_ORBITAL_PAIN", List.of("RETRO_ORBITAL_PAIN", "RETRO ORBITAL", "DOR ATRAS DOS OLHOS", "RETRO-ORBITAL", "DOR RETROORBITAL")),
        Map.entry("RASH", List.of("RASH", "EXANTEMA", "ERUPÇÃO CUTÂNEA", "ERUPCAO", "MANCHAS VERMELHAS", "VERMELHIDAO")),
        Map.entry("CONJUNTIVITE", List.of("CONJUNTIVITE", "OLHO VERMELHO", "SECREÇÃO NOS OLHOS", "OLHOS IRRITADOS")),
        Map.entry("CORIZA", List.of("CORIZA", "SECCRECAO NASAL", "NARIZ ESCORRENDO", "RUNNY NOSE")),
        Map.entry("PERDA_OLFATO", List.of("PERDA_OLFATO", "PERDA DE OLFATO", "ANOSMIA", "SEM CHEIRO", "ALTERACAO OLFATO")),
        Map.entry("SUDORESE_NOTURNA", List.of("SUDORESE_NOTURNA", "SUDORESE NOTURNA", "SUOR NOTURNO", "SUANDO A NOITE", "SUOR A NOITE")),
        Map.entry("LESÃO_GENITAL", List.of("LESÃO_GENITAL", "LESAO GENITAL", "ULCERA GENITAL", "FERIDA NA GENITAL", "CANCRO", "FERIDA NO PENIS", "FERIDA NA VAGINA")),
        Map.entry("CANDIDÍASE_ORAL", List.of("CANDIDÍASE_ORAL", "CANDIDIASE ORAL", "SAPINHO", "PLACAS BRANCAS NA BOCA")),
        Map.entry("ICTERÍCIA", List.of("ICTERÍCIA", "ICTERICIA", "PELE AMARELA", "OLHOS AMARELOS", "AMARELÃO")),
        Map.entry("ESPIRROS", List.of("ESPIRROS", "ESPIRRANDO", "ESPIRRO")),
        Map.entry("OBSTRUCAO_NASAL", List.of("OBSTRUCAO_NASAL", "OBSTRUCAO NASAL", "CONGESTÃO NASAL", "NARIZ ENTUPIDO", "NARIZ OBSTRUIDO")),
        Map.entry("PRURIDO_NASAL", List.of("PRURIDO_NASAL", "PRURIDO NASAL", "COCEIRA NO NARIZ", "NARIZ COÇANDO")),
        Map.entry("CHADO_PEITO", List.of("CHADO_PEITO", "CHIADO NO PEITO", "SIBILOS", "CHIADO PEITO", "PIADO", "SIBILANCIA")),
        Map.entry("EXPECTORACAO", List.of("EXPECTORACAO", "CATARRO", "ESCARRO", "TOSSE PRODUTIVA")),
        Map.entry("DOR_TORACICA", List.of("DOR_TORACICA", "DOR TORACICA", "DOR NO PEITO", "ANGINA", "DOR NO CORAÇAO")),
        Map.entry("DIARREIA", List.of("DIARREIA", "EVACUACAO LIQUIDA", "DIARRÉIA", "INTESTINO SOLTO", "CAGANEIRA")),
        Map.entry("CÓLICA", List.of("CÓLICA", "COLICA", "DOR DE BARRIGA", "DOR ABDOMINAL EM COLICA")),
        Map.entry("MELENA", List.of("MELENA", "SANGUE NAS FEZES", "FEZES PRETAS", "HEMRRAGIA DIGESTIVA")),
        Map.entry("REGURGITAÇÃO", List.of("REGURGITAÇÃO", "REGURGITACAO", "RETORNO DE ALIMENTO", "GOLFO")),
        Map.entry("PRURIDO_ANAL", List.of("PRURIDO_ANAL", "COCEIRA NO ANUS", "COCEIRA ANAL")),
        Map.entry("DOR_PÉLVICA", List.of("DOR_PÉLVICA", "DOR PELVICA", "DOR NA PELVE", "DOR NA PARTE BAIXA DO ABDOMEN")),
        Map.entry("DOR_RELAÇÃO", List.of("DOR_RELAÇÃO", "DOR NA RELACAO", "DOR DURANTE RELACAO", "DISPAREUNIA", "DOR COITO")),
        Map.entry("PRURIDO_VAGINAL", List.of("PRURIDO_VAGINAL", "COCEIRA NA VAGINA", "COCEIRA VAGINAL")),
        Map.entry("CORRIMENTO_BRANCO", List.of("CORRIMENTO_BRANCO", "CORRIMENTO BRANCO", "CORRIMENTO", "SECRECAO VAGINAL", "FLUXO VAGINAL")),
        Map.entry("DOR_PESCOÇO", List.of("DOR_PESCOÇO", "DOR NO PESCOCO", "CERVICALGIA", "DOR DE PESCOÇO", "PESCOCO RIGIDO")),
        Map.entry("RIGIDEZ_ARTICULAR", List.of("RIGIDEZ_ARTICULAR", "RIGIDEZ MATINAL", "ARTICULACAO DURA")),
        Map.entry("TOFO_GOTOSO", List.of("TOFO_GOTOSO", "NODULOS DE GOTA", "DEPOSITOS DE URATO", "TOFOS")),
        Map.entry("APREENSAO", List.of("APREENSAO", "NERVOSISMO", "PREOCUPACAO EXCESSIVA", "TENSAO MENTAL")),
        Map.entry("ANEDONIA", List.of("ANEDONIA", "PERDA DE INTERESSE", "FALTA DE PRAZER"))
    );

    @PostConstruct
    public void init() {
        try (InputStream is = getClass().getResourceAsStream("/clinical_protocols_v2.json")) {
            if (is == null) {
                log.error("Arquivo clinical_protocols.json não encontrado no classpath.");
                return;
            }
            rules = objectMapper.readValue(is, new TypeReference<List<ProtocolRule>>() {});
            log.info("Carregado(s) {} protocolo(s) clínico(s) de APS com sucesso.", rules.size());
        } catch (Exception e) {
            log.error("Erro ao carregar protocolos clínicos", e);
        }
    }

    public List<AlertResult> evaluateAll(Patient patient, List<Condition> conditions, List<Observation> observations, List<Triage> triages, List<MedicalRecord> records) {
        List<AlertResult> results = new ArrayList<>();
        Triage latestTriage = triages.isEmpty() ? null : triages.get(0);
        String latestRecordText = records.isEmpty() ? "" : records.get(0).getContent();

        for (ProtocolRule rule : rules) {
            int score = 0;
            Map<String, Integer> matchedFactors = new LinkedHashMap<>();

            // 1. Calculate symptom weights
            if (rule.getSymptoms() != null) {
                for (Map.Entry<String, Integer> entry : rule.getSymptoms().entrySet()) {
                    String symptom = entry.getKey();
                    int weight = entry.getValue();
                    if (hasSymptom(symptom, observations, triages, conditions, latestRecordText)) {
                        score += weight;
                        matchedFactors.put(symptom + " (Sintoma Presente)", weight);
                    }
                }
            }

            // 2. Evaluate Vital Criteria
            if (rule.getVitalCriteria() != null && latestTriage != null) {
                ProtocolRule.VitalCriteria vc = rule.getVitalCriteria();
                
                if (vc.getSystolicBPMin() != null) {
                    double sys = parseSystolicBP(latestTriage.getBloodPressure());
                    if (sys >= vc.getSystolicBPMin()) {
                        score += 15;
                        matchedFactors.put("PA Sistólica Elevada (>= " + vc.getSystolicBPMin() + " mmHg)", 15);
                    }
                }

                if (vc.getDiastolicBPMin() != null) {
                    double dia = parseDiastolicBP(latestTriage.getBloodPressure());
                    if (dia >= vc.getDiastolicBPMin()) {
                        score += 10;
                        matchedFactors.put("PA Diastólica Elevada (>= " + vc.getDiastolicBPMin() + " mmHg)", 10);
                    }
                }

                if (vc.getTemperatureMin() != null && latestTriage.getTemperature() != null) {
                    if (latestTriage.getTemperature().doubleValue() >= vc.getTemperatureMin()) {
                        score += 20;
                        matchedFactors.put("Febre / Hipertermia (>= " + vc.getTemperatureMin() + "°C)", 20);
                    }
                }

                if (vc.getSaturationMax() != null && latestTriage.getOxygenSaturation() != null) {
                    if (latestTriage.getOxygenSaturation() <= vc.getSaturationMax()) {
                        score += 25;
                        matchedFactors.put("Saturação de Oxigênio Baixa (<= " + vc.getSaturationMax() + "%)", 25);
                    }
                }
            }

            // Limit score to maximum 100%
            if (score > 100) {
                score = 100;
            }

            // If score is above rule minimum or >= 30%, it is a valid diagnostic hypothesis
            int minScore = rule.getMinScore() != null ? rule.getMinScore() : 35;
            if (score >= minScore || score >= 30) {
                // Validação Demográfica Rigorosa
                boolean isMale = patient.getGender() != null && patient.getGender().equalsIgnoreCase("MASCULINO");
                String rName = rule.getName().toLowerCase();
                String rSpec = rule.getSpecialty() != null ? rule.getSpecialty().toLowerCase() : "";
                
                boolean isFemaleOnly = rName.contains("amenorreia") || rName.contains("gravidez") || rName.contains("gravídica") 
                        || rName.contains("gestante") || rName.contains("gestação") || rName.contains("menstru") 
                        || rSpec.contains("mulher") || rSpec.contains("obstetrícia");
                
                if (isMale && isFemaleOnly) {
                    log.warn("Diagnóstico incompatível com os dados demográficos do paciente (Masculino para regra de Saúde da Mulher: {}). Revisar critérios de validação clínica.", rule.getName());
                    continue; // Pula este diagnóstico, não adiciona aos resultados
                }
                
                results.add(AlertResult.builder()
                        .alert(rule.getName())
                        .cid(rule.getCid())
                        .probability(score)
                        .factors(matchedFactors)
                        .exams(rule.getExams() != null ? rule.getExams() : new ArrayList<>())
                        .conduct(rule.getConduct())
                        .contraindications(rule.getContraindications() != null ? rule.getContraindications() : new ArrayList<>())
                        .alternativeHypotheses(new ArrayList<>())
                        .build());
            }
        }

        // Sort by probability descending
        results.sort((a, b) -> b.getProbability().compareTo(a.getProbability()));
        // Return the top 5 results (or fewer if less than 5)
        int limit = Math.min(5, results.size());
        return results.subList(0, limit);
    }

    private boolean hasSymptom(String symptomKey, List<Observation> observations, List<Triage> triages, List<Condition> conditions, String latestRecordText) {
        String keyUpper = symptomKey.toUpperCase().trim();
        List<String> synonyms = SYNONYMS.getOrDefault(keyUpper, List.of(keyUpper));

        // 1. Check in observations
        boolean matchObs = observations.stream().anyMatch(o -> {
            String code = o.getCode() != null ? o.getCode().toUpperCase().trim() : "";
            String name = o.getName() != null ? o.getName().toUpperCase().trim() : "";
            String val = o.getValue() != null ? o.getValue().toUpperCase().trim() : "";
            boolean isYes = val.equals("SIM") || val.equals("TRUE") || val.equals("1") || val.equals("YES");

            for (String synonym : synonyms) {
                String synNorm = normalize(synonym);
                if ((normalize(code).equals(synNorm) || normalize(name).contains(synNorm)) && isYes) {
                    return true;
                }
            }
            return false;
        });
        if (matchObs) return true;

        // 2. Check in conditions
        boolean matchCond = conditions.stream().anyMatch(c -> {
            String cName = c.getName() != null ? c.getName().toUpperCase().trim() : "";
            String cCid = c.getCidCode() != null ? c.getCidCode().toUpperCase().trim() : "";

            for (String synonym : synonyms) {
                String synNorm = normalize(synonym);
                if (normalize(cName).contains(synNorm) || normalize(cCid).contains(synNorm)) {
                    return true;
                }
            }
            return false;
        });
        if (matchCond) return true;

        // 3. Special cases: FEBRE
        if (keyUpper.equals("FEBRE")) {
            boolean hasHighTempTriage = triages.stream().anyMatch(t -> t.getTemperature() != null && t.getTemperature().doubleValue() >= 37.8);
            if (hasHighTempTriage) return true;
        }

        // 4. Check in recent medical record text (SOAP / Acolhimento)
        if (latestRecordText != null && !latestRecordText.isEmpty()) {
            String normalizedRecord = normalize(latestRecordText);
            for (String synonym : synonyms) {
                String synNorm = normalize(synonym);
                if (normalizedRecord.contains(synNorm)) {
                    return true;
                }
            }
        }

        return false;
    }

    private double parseSystolicBP(String bp) {
        if (bp != null && bp.contains("/")) {
            try {
                return Double.parseDouble(bp.split("/")[0].trim());
            } catch (Exception e) {
                return 0.0;
            }
        }
        return 0.0;
    }

    private double parseDiastolicBP(String bp) {
        if (bp != null && bp.contains("/")) {
            try {
                return Double.parseDouble(bp.split("/")[1].trim());
            } catch (Exception e) {
                return 0.0;
            }
        }
        return 0.0;
    }

    private String normalize(String value) {
        if (value == null) return "";
        return value.toUpperCase()
                .replace("Á", "A").replace("À", "A").replace("Â", "A").replace("Ã", "A")
                .replace("É", "E").replace("È", "E").replace("Ê", "E")
                .replace("Í", "I").replace("Ì", "I").replace("Î", "I")
                .replace("Ó", "O").replace("Ò", "O").replace("Ô", "O").replace("Õ", "O")
                .replace("Ú", "U").replace("Ù", "U").replace("Û", "U")
                .replace("Ç", "C");
    }
}
