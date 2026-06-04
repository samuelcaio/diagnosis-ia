package com.diagnosis.repository;

import com.diagnosis.model.Referral;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ReferralRepository extends JpaRepository<Referral, UUID> {
    List<Referral> findByPatientId(UUID patientId);
    List<Referral> findByStatus(String status);
}
