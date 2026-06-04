package com.diagnosis.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SOAPEvolutionRequest {

    @NotBlank(message = "O campo 'Subjetivo' é obrigatório.")
    private String subjective;

    @NotBlank(message = "O campo 'Objetivo' é obrigatório.")
    private String objective;

    @NotBlank(message = "O campo 'Avaliação' é obrigatório.")
    private String assessment;

    @NotBlank(message = "O campo 'Plano' é obrigatório.")
    private String plan;
}
