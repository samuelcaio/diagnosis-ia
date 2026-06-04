package com.diagnosis.service;

import com.diagnosis.model.Alert;
import com.diagnosis.model.Condition;
import com.diagnosis.model.Patient;
import com.diagnosis.repository.AlertRepository;
import com.diagnosis.repository.ConditionRepository;
import com.diagnosis.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EpidemiologicalAlertService {

    private final ConditionRepository conditionRepository;
    private final PatientRepository patientRepository;
    private final AlertRepository alertRepository;

    // Roda todos os dias as 02:00 AM para checar surtos recentes
    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void scanForEpidemiologicalAlerts() {
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
        
        List<Condition> recentConditions = conditionRepository.findAll().stream()
            .filter(c -> c.getCreatedAt() != null && c.getCreatedAt().isAfter(sevenDaysAgo))
            .collect(Collectors.toList());

        // Group conditions by CID and Neighborhood
        Map<String, Map<String, Long>> cidByNeighborhood = recentConditions.stream()
            .filter(c -> c.getCidCode() != null)
            .collect(Collectors.groupingBy(
                Condition::getCidCode,
                Collectors.groupingBy(
                    c -> getPatientNeighborhood(c.getPatient().getId()),
                    Collectors.counting()
                )
            ));

        // Threshold para alerta de surto: Ex 10 casos no mesmo bairro em 7 dias
        int SURTO_THRESHOLD = 10;

        cidByNeighborhood.forEach((cid, neighborhoodCounts) -> {
            neighborhoodCounts.forEach((neighborhood, count) -> {
                if (count >= SURTO_THRESHOLD && !neighborhood.equals("Desconhecido")) {
                    saveAlert(cid, neighborhood, count.intValue());
                }
            });
        });
    }

    private String getPatientNeighborhood(java.util.UUID patientId) {
        return patientRepository.findById(patientId)
            .map(Patient::getNeighborhood)
            .map(n -> n != null && !n.isEmpty() ? n : "Desconhecido")
            .orElse("Desconhecido");
    }

    private void saveAlert(String cid, String neighborhood, int count) {
        Alert alert = Alert.builder()
            .type("SURTO_IDENTIFICADO")
            .disease("CID: " + cid)
            .cid(cid)
            .neighborhood(neighborhood)
            .caseCount(count)
            .daysPeriod(7)
            .message("Alerta de Surto: " + count + " casos de " + cid + " identificados no bairro " + neighborhood + " nos últimos 7 dias.")
            .build();
        alertRepository.save(alert);
    }
}
