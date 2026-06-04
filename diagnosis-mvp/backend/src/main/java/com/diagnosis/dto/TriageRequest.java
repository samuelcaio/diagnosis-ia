package com.diagnosis.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
public class TriageRequest {

    @NotNull(message = "O ID do agendamento é obrigatório.")
    private UUID appointmentId;

    @NotNull(message = "O ID do paciente é obrigatório.")
    private UUID patientId;

    private Integer heartRate;

    private String bloodPressure;

    private BigDecimal temperature;

    private Integer respiratoryRate;

    private Integer oxygenSaturation;

    private Integer painScale;

    @NotBlank(message = "A classificação de risco Manchester é obrigatória.")
    private String riskClassification; // RED, ORANGE, YELLOW, GREEN, BLUE
}
