package com.diagnosis.repository;

import com.diagnosis.model.MedicationRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface MedicationRequestRepository extends JpaRepository<MedicationRequest, UUID> {
    List<MedicationRequest> findByPatientIdOrderByRecordedAtDesc(UUID patientId);
}
