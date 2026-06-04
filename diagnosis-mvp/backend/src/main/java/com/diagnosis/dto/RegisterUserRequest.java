package com.diagnosis.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RegisterUserRequest {

    @NotBlank(message = "O nome é obrigatório.")
    private String name;

    @NotBlank(message = "O e-mail é obrigatório.")
    private String email;

    @NotBlank(message = "A senha é obrigatória.")
    private String password;

    @NotBlank(message = "O papel (Role) é obrigatório.")
    private String role; // ADMIN, DOCTOR, NURSE, RECEPTIONIST

    private String crm; // Opcional, apenas para médicos

    private java.util.UUID unidadeSaudeId;
    private java.util.UUID municipioId;
}
