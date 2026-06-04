package com.diagnosis.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.TenantId;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "unidades_saude")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnidadeSaude {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @TenantId
    @Column(name = "municipio_id", nullable = false)
    private UUID municipioId;

    @Column(nullable = false)
    private String nome;

    private String endereco;

    @Column(nullable = false)
    private String tipo; // "UBS", "HOSPITAL", "CLINICA"

    @Column(nullable = false)
    private String status = "ATIVO"; // "ATIVO", "INATIVO"

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
