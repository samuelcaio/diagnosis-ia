package com.diagnosis.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class MunicipioDto {
    private UUID id;
    private String nomeMunicipio;
    private String estado;
    private String codigoIbge;
    private String cnesPrincipal;
    private String nomeSecretaria;
    private String logoUrl;
    private String corPrimaria;
    private String status;
}
