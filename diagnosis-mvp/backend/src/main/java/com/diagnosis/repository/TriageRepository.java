package com.diagnosis.repository;

import com.diagnosis.model.Triage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.time.LocalDateTime;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface TriageRepository extends JpaRepository<Triage, UUID> {
    Optional<Triage> findByAppointmentId(UUID appointmentId);
    List<Triage> findByPatientId(UUID patientId);

    @Query("SELECT t.riskClassification, COUNT(t) FROM Triage t WHERE t.createdAt >= :startDate GROUP BY t.riskClassification")
    List<Object[]> countTriagesByRiskClassificationSince(@Param("startDate") LocalDateTime startDate);
}
