package com.diagnosis.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "epidemiological_alerts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Alert {

    @org.hibernate.annotations.TenantId
    @Column(name = "municipio_id")
    private java.util.UUID municipioId;

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String type; // e.g., "SURTO", "AUMENTO_ANORMAL"

    @Column(nullable = false)
    private String disease;

    private String cid;

    private String neighborhood;

    private String microarea;
    
    private String street;

    private int caseCount;
    
    private int daysPeriod;

    @Column(length = 500)
    private String message;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
