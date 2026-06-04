package com.diagnosis.engine.dto;

import com.diagnosis.model.Condition;
import com.diagnosis.model.MedicalRecord;
import com.diagnosis.model.Observation;
import com.diagnosis.model.Patient;
import com.diagnosis.model.Triage;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class EngineContext {
    private Patient patient;
    private List<Condition> conditions;
    private List<Observation> observations;
    private List<Triage> triages;
    private MedicalRecord latestRecord;
    
    // Texto em tempo real vindo do frontend antes de salvar (deprecated, mantido por compatibilidade)
    private String currentText;
    
    // Novas estruturas para dados estruturados
    private String queixaPrincipal;
    private java.util.Map<String, String> questionarioDinamico;
    private List<String> sintomasAssociados;
    private List<String> fatoresDeRiscoSelecionados;
    private String observacaoComplementar;
    
    // Extracted symptoms from the above fields
    private List<String> extractedSymptoms;
}
