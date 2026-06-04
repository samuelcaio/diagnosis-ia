package com.diagnosis.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "immunizations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Immunization {

    @org.hibernate.annotations.TenantId
    @Column(name = "municipio_id")
    private java.util.UUID municipioId;

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Column(name = "vaccine_name", nullable = false)
    private String vaccineName;

    @Column(name = "dose_number")
    private String doseNumber;

    private String batch;

    private String manufacturer;

    @Column(name = "applied_at", nullable = false)
    private LocalDate appliedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
