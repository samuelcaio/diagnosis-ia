package com.diagnosis.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;

@Data
public class RegisterPatientRequest {

    @NotBlank(message = "O nome é obrigatório.")
    private String name;

    @NotBlank(message = "O CPF é obrigatório.")
    private String cpf;

    @NotNull(message = "A data de nascimento é obrigatória.")
    private LocalDate birthDate;

    @NotBlank(message = "O gênero é obrigatório.")
    private String gender;

    private String address;
    private String cep;
    private String state;
    private String city;
    private String neighborhood;
    private String street;
    private String addressNumber;
    private String complement;
    private String referencePoint;
    
    private String coverageArea;
    private String microarea;
    private String acsName;
    private String esfTeam;

    private String phone;
}
