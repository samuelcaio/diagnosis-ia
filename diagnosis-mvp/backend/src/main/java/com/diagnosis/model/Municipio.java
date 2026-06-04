package com.diagnosis.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "municipios")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Municipio {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "nome_municipio", nullable = false)
    private String nomeMunicipio;

    @Column(length = 2, nullable = false)
    private String estado;

    @Column(name = "codigo_ibge")
    private String codigoIbge;

    @Column(name = "cnes_principal")
    private String cnesPrincipal;

    @Column(nullable = false)
    private String status = "ATIVO"; // ATIVO, INATIVO

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "cor_primaria")
    private String corPrimaria = "#2C6E9C";

    @Column(name = "nome_secretaria")
    private String nomeSecretaria;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
