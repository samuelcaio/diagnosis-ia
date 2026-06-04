package com.diagnosis.repository;

import com.diagnosis.model.MedicalRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;
import java.time.LocalDateTime;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.UUID;

@Repository
public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, UUID> {
    List<MedicalRecord> findByPatientIdOrderByRecordedAtDesc(UUID patientId);

    @Query("SELECT m.authorName, COUNT(m) FROM MedicalRecord m WHERE m.recordType = 'EVOLUTION' AND m.recordedAt >= :startDate GROUP BY m.authorName")
    List<Object[]> countProductivityByAuthorSince(@Param("startDate") LocalDateTime startDate);
}
