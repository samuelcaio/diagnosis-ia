package com.diagnosis.engine.rules;

import com.diagnosis.engine.dto.EngineContext;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class SymptomExtractor {

    private static final Map<String, List<String>> SYNONYMS = Map.ofEntries(
        // SINAIS VITAIS / GERAIS
        Map.entry("FEBRE", List.of("FEBRE", "HIPERTERMIA", "QUENTE", "ESTADO FEBRIL")),
        Map.entry("FADIGA", List.of("FADIGA", "CANSACO", "ASTENIA", "FRAQUEZA", "MOLEZA")),
        Map.entry("PERDA_PESO", List.of("PERDA_PESO", "EMAGRECIMENTO", "PERDENDO PESO", "EMAGRECEU")),
        
        // CARDIO / VASCULAR
        Map.entry("DOR_TORACICA", List.of("DOR_TORACICA", "DOR NO PEITO", "ANGINA", "DOR NO CORAÇAO", "DOR PRECORDIAL", "APERTO NO PEITO")),
        Map.entry("DOR_TORACICA_INTENSA", List.of("DOR_TORACICA_INTENSA", "DOR NO PEITO FORTE", "DOR INSUPORTAVEL NO PEITO")),
        Map.entry("AUSENCIA_DOR_TORACICA", List.of("AUSENCIA DOR TORACICA", "SEM DOR NO PEITO")),
        Map.entry("IRRADIACAO_BRACO", List.of("IRRADIACAO_BRACO", "DOR IRRADIA", "DOR NO BRACO ESQUERDO", "DOR ESPALHA")),
        Map.entry("IRRADIACAO_MANDIBULA", List.of("IRRADIACAO_MANDIBULA", "DOR NO QUEIXO", "IRRADIA PARA O ROSTO")),
        Map.entry("PALPITACAO", List.of("PALPITACAO", "CORACAO ACELERADO", "BATEDEIRA", "TAQUICARDIA")),
        Map.entry("SUDORESE", List.of("SUDORESE", "SUANDO FRIO", "SUOR INTENSO", "DIAFORESE")),
        Map.entry("DIAFORESE", List.of("DIAFORESE", "SUOR EXCESSIVO")),
        Map.entry("PRESSAO_ALTA", List.of("PRESSAO_ALTA", "PA ALTA", "HIPERTENSAO", "PRESSAO SUBIU")),
        Map.entry("HIPOTENSAO", List.of("HIPOTENSAO", "PRESSAO BAIXA", "PRESSAO CAIU")),
        Map.entry("FATOR_RISCO_CARDIOVASCULAR", List.of("FATOR_RISCO_CARDIOVASCULAR", "HIPERTENSO", "DIABETICO", "OBESO", "TABAGISTA")),
        
        // RESPIRATORIO
        Map.entry("DISPNEIA", List.of("DISPNEIA", "FALTA DE AR", "FALTA_AR", "CANSADO PARA RESPIRAR")),
        Map.entry("FALTA_AR", List.of("FALTA_AR", "FALTA DE AR", "DISPNEIA")),
        Map.entry("DISPNEIA_GRAVE", List.of("DISPNEIA_GRAVE", "FALTA DE AR GRAVE", "SUFOCANDO")),
        Map.entry("TOSSE", List.of("TOSSE", "COUGH", "TOSSINDO")),
        Map.entry("TOSSE_SECA", List.of("TOSSE_SECA", "TOSSE SEM CATARRO", "TOSSE SECA")),
        Map.entry("TOSSE_CRONICA", List.of("TOSSE_CRONICA", "TOSSE A MUITO TEMPO", "TOSSE DE FUMANTE")),
        Map.entry("EXPECTORACAO_PURULENTA", List.of("EXPECTORACAO_PURULENTA", "CATARRO VERDE", "CATARRO AMARELO", "ESCARRO GROSSO")),
        Map.entry("AUMENTO_EXPECTORACAO", List.of("AUMENTO_EXPECTORACAO", "AUMENTO DO CATARRO")),
        Map.entry("MUDANCA_COR_ESCARRO", List.of("MUDANCA_COR_ESCARRO", "CATARRO MUDOU DE COR")),
        Map.entry("DOR_PLEURITICA", List.of("DOR_PLEURITICA", "DOR AO RESPIRAR", "DOR NA COSTELA AO PUXAR O AR")),
        Map.entry("SIBILANCIA", List.of("SIBILANCIA", "CHIADO NO PEITO", "PEITO CHIANDO")),
        Map.entry("OPRESSAO_TORACICA", List.of("OPRESSAO_TORACICA", "PEITO APERTADO")),
        Map.entry("HISTORICO_ASMA", List.of("HISTORICO_ASMA", "JA TEVE ASMA", "USOU BOMBINHA", "BRONQUITE")),
        Map.entry("HISTORICO_TABAGISMO", List.of("HISTORICO_TABAGISMO", "FUMANTE", "FUMA", "EX FUMANTE")),
        
        // SINTOMAS GRIPAIS / INFECCIOSOS / OTORRINO
        Map.entry("DOR_GARGANTA", List.of("DOR_GARGANTA", "GARGANTA DOENDO", "GARGANTA INFLAMADA", "ODINOFAGIA")),
        Map.entry("CORIZA", List.of("CORIZA", "NARIZ ESCORRENDO", "RINITIS")),
        Map.entry("ANOSMIA", List.of("ANOSMIA", "PERDA DE OLFATO", "SEM CHEIRO", "NAO SENTE CHEIRO")),
        Map.entry("AGEUSIA", List.of("AGEUSIA", "PERDA DE PALADAR", "SEM GOSTO", "NAO SENTE GOSTO")),
        Map.entry("OTALGIA", List.of("OTALGIA", "DOR DE OUVIDO", "OUVIDO DOENDO")),
        Map.entry("HIPEREMIA_TIMPANICA", List.of("HIPEREMIA_TIMPANICA", "OUVIDO VERMELHO")),
        Map.entry("OTORREIA", List.of("OTORREIA", "SAINDO SECRECAO DO OUVIDO", "SAINDO PUS DO OUVIDO")),
        Map.entry("IRRITABILIDADE", List.of("IRRITABILIDADE", "CRIANCA CHORANDO MUITO", "MUITO IRRITADO")),
        
        // NEUROLOGICO / PSIQUIATRICO
        Map.entry("CEFALEIA", List.of("CEFALEIA", "DOR_CABECA", "HEADACHE", "CABECA DOENDO", "ENXAQUECA")),
        Map.entry("CEFALEIA_SUDITA_INTENSA", List.of("CEFALEIA_SUDITA_INTENSA", "PIOR DOR DE CABECA DA VIDA")),
        Map.entry("ZUMBIDO", List.of("ZUMBIDO", "TINNITUS", "OUVIDO ZUMBINDO")),
        Map.entry("TONTURA", List.of("TONTURA", "VERTIGEM", "TUDO RODANDO")),
        Map.entry("DOR_NUCA", List.of("DOR_NUCA", "PESPCOCO DOENDO", "NUCA PESADA")),
        Map.entry("VISAO_TURVA", List.of("VISAO_TURVA", "VISAO EMBACADA", "VISAO ESCURA")),
        Map.entry("DEFICIT_NEUROLOGICO_FOCAL", List.of("DEFICIT_NEUROLOGICO_FOCAL", "DORMENTE DE UM LADO", "PERDA DE FORCA DE UM LADO")),
        Map.entry("ASSIMETRIA_FACIAL", List.of("ASSIMETRIA_FACIAL", "BOCA TORTA", "ROSTO CAIDO")),
        Map.entry("PERDA_FORCA_MOTOR", List.of("PERDA_FORCA_MOTOR", "NAO CONSEGUE LEVANTAR O BRACO", "PERNA FRACA")),
        Map.entry("ALTERACAO_FALA", List.of("ALTERACAO_FALA", "FALA ENROLADA", "DIFICULDADE PARA FALAR")),
        Map.entry("DESVIO_COMISSURA", List.of("DESVIO_COMISSURA", "SORRISO TORTO")),
        Map.entry("ALTERACAO_CONSCIENCIA", List.of("ALTERACAO_CONSCIENCIA", "CONFUSO", "DESORIENTADO", "SONOLENTO")),
        Map.entry("ANSIEDADE", List.of("ANSIEDADE", "NERVOSO", "ANGUSTIADO")),
        Map.entry("TREMOR", List.of("TREMOR", "TREMENDO", "MAO TREMENDO")),
        Map.entry("SENSACAO_MORTE", List.of("SENSACAO_MORTE", "ACHOU QUE IA MORRER", "PANICO")),
        
        // GASTROINTESTINAL / ABDOMINAL
        Map.entry("NAUSEA", List.of("NAUSEA", "ENJOO", "ANSIA DE VOMITO")),
        Map.entry("VOMITO", List.of("VOMITO", "EMESE", "VOMITOU")),
        Map.entry("VOMITO_JATO", List.of("VOMITO_JATO", "VOMITOU EM JATO")),
        Map.entry("DIARREIA", List.of("DIARREIA", "FEZES LIQUIDAS", "CAGANEIRA")),
        Map.entry("DOR_ABDOMINAL", List.of("DOR_ABDOMINAL", "DOR NA BARRIGA", "COLICA")),
        
        // MUSCULOESQUELETICO / PELE
        Map.entry("MYALGIA", List.of("MYALGIA", "DOR NO CORPO", "DOR MUSCULAR", "CORPO MOIDO")),
        Map.entry("ARTRALGIA", List.of("ARTRALGIA", "DOR NAS JUNTAS", "DOR NAS ARTICULACOES")),
        Map.entry("DOR_RETRO_ORBITAL", List.of("DOR_RETRO_ORBITAL", "DOR ATRAS DOS OLHOS")),
        Map.entry("RASH", List.of("RASH", "MANCHAS NO CORPO", "EXANTEMA", "VERMELHIDAO NA PELE", "PINTINHAS VERMELHAS")),
        Map.entry("DOR_LOMBAR", List.of("DOR_LOMBAR", "DOR NAS COSTAS", "DOR NA LOMBAR", "COLUNA DOENDO")),
        Map.entry("DOR_AO_MOVIMENTO", List.of("DOR_AO_MOVIMENTO", "DOR AO SE MEXER", "PIORA COM MOVIMENTO")),
        Map.entry("CONTRATURA_MUSCULAR", List.of("CONTRATURA_MUSCULAR", "MUSCULO TRAVADO")),
        Map.entry("IRRADIACAO_PERNA", List.of("IRRADIACAO_PERNA", "DOR DESCE PRA PERNA", "CIATICO")),
        Map.entry("PARESTESIA", List.of("PARESTESIA", "FORMIGAMENTO")),
        
        // GENITOURINARIO / ENDOCRINO
        Map.entry("POLIDIPSIA", List.of("POLIDIPSIA", "SEDE EXCESSIVA", "MUITO SEDE")),
        Map.entry("POLIURIA", List.of("POLIURIA", "URINA MUITO", "MUITO XIXI")),
        Map.entry("POLIFAGIA", List.of("POLIFAGIA", "FOME EXCESSIVA")),
        Map.entry("DISURIA", List.of("DISURIA", "ARDE PARA URINAR", "DOR AO URINAR", "ARDENCIA NA URINA")),
        Map.entry("POLACIURIA", List.of("POLACIURIA", "TODA HORA VAI AO BANHEIRO", "URINANDO DE POUQUINHO")),
        Map.entry("URGENCIA_MICCIONAL", List.of("URGENCIA_MICCIONAL", "NAO SEGURA O XIXI")),
        Map.entry("DOR_SUPRAPUBICA", List.of("DOR_SUPRAPUBICA", "DOR NO PE DA BARRIGA")),
        Map.entry("HEMATURIA", List.of("HEMATURIA", "SANGUE NA URINA", "URINA VERMELHA")),
        Map.entry("SINAL_GIORDANO_POSITIVO", List.of("SINAL_GIORDANO_POSITIVO", "GIORDANO POSITIVO", "DOR A PERCUSSAO LOMBAR")),
        Map.entry("DOR_LOMBAR_INTENSA", List.of("DOR_LOMBAR_INTENSA", "DOR MUITO FORTE NAS COSTAS")),
        Map.entry("CALAFRIOS", List.of("CALAFRIOS", "TREMEDEIRA COM FEBRE", "FRIAGEM")),
        Map.entry("RETENCAO_URINARIA", List.of("RETENCAO_URINARIA", "NAO CONSEGUE URINAR", "BEXIGOMA")),
        Map.entry("DOR_PELVICA", List.of("DOR_PELVICA", "DOR NA PELVE", "DOR BAIXO VENTRE")),
        Map.entry("AMENORREIA", List.of("AMENORREIA", "ATRASO MENSTRUAL", "NAO MENSTRUA")),
        Map.entry("SANGRAMENTO_VAGINAL", List.of("SANGRAMENTO_VAGINAL", "SANGRAMENTO")),

        // SEPSE E ALERGIAS
        Map.entry("FOCO_INFECCIOSO", List.of("FOCO_INFECCIOSO", "INFECCAO", "PNEUMONIA", "ITU")),
        Map.entry("EXPOSICAO_ALERGENO", List.of("EXPOSICAO_ALERGENO", "COMEU CAMARAO", "PICADA DE INSETO", "TOMOU REMEDIO E DEU ALERGIA")),
        Map.entry("EDEMA_GLOTE", List.of("EDEMA_GLOTE", "GARGANTA FECHANDO", "ROSTO INCHADO")),

        // DEMOGRAFICOS
        Map.entry("PACIENTE_MASCULINO", List.of("PACIENTE_MASCULINO", "SEXO MASCULINO", "HOMEM"))
    );

    public void extractSymptoms(EngineContext ctx) {
        List<String> extracted = new ArrayList<>();
        String rawText = ctx.getLatestRecord() != null ? ctx.getLatestRecord().getContent().toUpperCase() : "";
        if (ctx.getCurrentText() != null) {
            rawText = rawText + " " + ctx.getCurrentText().toUpperCase();
        }

        // 1. Extração via Dados Estruturados (Novo fluxo primário)
        if (ctx.getQueixaPrincipal() != null && !ctx.getQueixaPrincipal().isBlank()) {
            extracted.add(ctx.getQueixaPrincipal().toUpperCase().replace(" ", "_"));
        }

        if (ctx.getSintomasAssociados() != null) {
            for (String s : ctx.getSintomasAssociados()) {
                if (!s.isBlank()) extracted.add(s.toUpperCase().replace(" ", "_"));
            }
        }

        if (ctx.getFatoresDeRiscoSelecionados() != null) {
            for (String f : ctx.getFatoresDeRiscoSelecionados()) {
                if (!f.isBlank()) extracted.add(f.toUpperCase().replace(" ", "_"));
            }
        }

        // 2. Extração Complementar via Texto Livre (Mantido como fallback ou para observar Complementar)
        for (Map.Entry<String, List<String>> entry : SYNONYMS.entrySet()) {
            boolean found = false;
            
            // Check text
            for (String synonym : entry.getValue()) {
                if (rawText.contains(synonym)) {
                    found = true;
                    break;
                }
            }

            // Check conditions apenas para Fatores de Risco crônicos, para não reviver sintomas agudos do passado
            if (entry.getKey().equals("FATOR_RISCO_CARDIOVASCULAR") || entry.getKey().equals("HISTORICO_ASMA") || entry.getKey().equals("HISTORICO_TABAGISMO")) {
                if (ctx.getConditions() != null && ctx.getConditions().stream().anyMatch(c -> c.getName() != null && entry.getValue().contains(c.getName().toUpperCase()))) {
                    found = true;
                }
                if (ctx.getObservations() != null && ctx.getObservations().stream().anyMatch(o -> o.getName() != null && entry.getValue().contains(o.getName().toUpperCase()))) {
                    found = true;
                }
            }

            if (found) {
                extracted.add(entry.getKey());
            }
        }

        // Add vital signs logic directly to extracted symptoms to make it rule-compatible
        if (ctx.getTriages() != null && !ctx.getTriages().isEmpty()) {
            var t = ctx.getTriages().get(0);
            
            if (t.getTemperature() != null) {
                if (t.getTemperature().doubleValue() >= 37.8) extracted.add("FEBRE");
            }
            
            if (t.getBloodPressure() != null && t.getBloodPressure().contains("/")) {
                try {
                    double sys = Double.parseDouble(t.getBloodPressure().split("/")[0]);
                    double dia = Double.parseDouble(t.getBloodPressure().split("/")[1]);
                    if (sys >= 140 || dia >= 90) extracted.add("PRESSAO_ALTA");
                    if (sys < 90) extracted.add("HIPOTENSAO");
                } catch (Exception ignored) {}
            }
            
            if (t.getOxygenSaturation() != null) {
                if (t.getOxygenSaturation() < 94) extracted.add("QUEDA_SATURACAO");
            }
            
            if (t.getRespiratoryRate() != null) {
                if (t.getRespiratoryRate() > 22) extracted.add("TAQUIPNEIA");
            }
            
            if (t.getHeartRate() != null) {
                if (t.getHeartRate() > 100) extracted.add("TAQUICARDIA");
            }
        }

        // Gender check
        if (ctx.getPatient() != null && "MASCULINO".equalsIgnoreCase(ctx.getPatient().getGender())) {
            extracted.add("PACIENTE_MASCULINO");
        }

        ctx.setExtractedSymptoms(extracted);
    }
}
