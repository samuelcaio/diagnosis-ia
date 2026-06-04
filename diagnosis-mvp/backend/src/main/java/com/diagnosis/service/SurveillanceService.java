package com.diagnosis.service;

import com.diagnosis.model.Patient;
import com.diagnosis.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SurveillanceService {

    private final PatientRepository patientRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardStats(String ipAddress) {
        auditService.bindDatabaseUser();
        List<Patient> allPatients = patientRepository.findAll();
        
        // Log access for surveillance dashboard
        auditService.logAccess(null, "VISUALIZACAO_VIGILANCIA_TERRITORIAL", ipAddress);

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalPatients", allPatients.size());
        
        stats.put("byNeighborhood", groupBy(allPatients, Patient::getNeighborhood));
        stats.put("byStreet", groupBy(allPatients, Patient::getStreet));
        stats.put("byMicroarea", groupBy(allPatients, Patient::getMicroarea));
        stats.put("byEsfTeam", groupBy(allPatients, Patient::getEsfTeam));
        stats.put("byAcs", groupBy(allPatients, Patient::getAcsName));

        return stats;
    }

    private Map<String, Long> groupBy(List<Patient> patients, java.util.function.Function<Patient, String> classifier) {
        return patients.stream()
                .filter(p -> classifier.apply(p) != null && !classifier.apply(p).trim().isEmpty())
                .collect(Collectors.groupingBy(classifier, Collectors.counting()));
    }
}
