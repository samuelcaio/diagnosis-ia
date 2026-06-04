package com.diagnosis.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "referrals")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Referral {

    @org.hibernate.annotations.TenantId
    @Column(name = "municipio_id")
    private java.util.UUID municipioId;

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Column(nullable = false)
    private String specialty;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String justification;

    @Column(nullable = false)
    private String status = "PENDING"; // PENDING, APPROVED, COMPLETED

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
