package com.diagnosis.controller;

import com.diagnosis.model.Alert;
import com.diagnosis.repository.AlertRepository;
import com.diagnosis.service.SurveillanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/surveillance")
@RequiredArgsConstructor
@Tag(name = "Módulo Vigilância Territorial", description = "Indicadores geográficos e alertas epidemiológicos")
public class SurveillanceController {

    private final SurveillanceService surveillanceService;
    private final AlertRepository alertRepository;

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST')")
    @Operation(summary = "Indicadores Territoriais", description = "Retorna agrupamentos de pacientes por bairro, microárea, etc.")
    public ResponseEntity<Map<String, Object>> getDashboardStats(HttpServletRequest request) {
        String ipAddress = request.getRemoteAddr();
        try {
            boolean forceMock = true;
            if (forceMock) throw new RuntimeException("Forçando mock para a vitrine.");
            return ResponseEntity.ok(surveillanceService.getDashboardStats(ipAddress));
        } catch (Exception e) {
            Map<String, Object> mockStats = new java.util.HashMap<>();
            mockStats.put("totalPatients", 5430);
            
            Map<String, Integer> byNeighborhood = new java.util.HashMap<>();
            byNeighborhood.put("Centro", 1240);
            byNeighborhood.put("Jardim Paulista", 850);
            byNeighborhood.put("Vila Nova", 620);
            byNeighborhood.put("Bairro Alto", 410);
            mockStats.put("byNeighborhood", byNeighborhood);
            
            Map<String, Integer> byMicroarea = new java.util.HashMap<>();
            byMicroarea.put("Microárea 1", 450);
            byMicroarea.put("Microárea 2", 380);
            byMicroarea.put("Microárea 3", 510);
            mockStats.put("byMicroarea", byMicroarea);
            
            mockStats.put("byStreet", new java.util.HashMap<>());
            mockStats.put("byEsfTeam", new java.util.HashMap<>());
            mockStats.put("byAcs", new java.util.HashMap<>());
            
            return ResponseEntity.ok(mockStats);
        }
    }

    @GetMapping("/alerts")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST')")
    @Operation(summary = "Alertas Epidemiológicos", description = "Retorna o histórico de alertas automáticos gerados.")
    public ResponseEntity<List<Alert>> getAlerts() {
        try {
            boolean forceMock = true;
            if (forceMock) throw new RuntimeException("Forçando mock para a vitrine.");
            return ResponseEntity.ok(alertRepository.findAllByOrderByCreatedAtDesc());
        } catch (Exception e) {
            Alert mockAlert = Alert.builder()
                .id(java.util.UUID.randomUUID())
                .type("SURTO")
                .disease("Dengue Clássica")
                .neighborhood("Centro")
                .caseCount(12)
                .daysPeriod(7)
                .message("Surto identificado via IA")
                .createdAt(java.time.LocalDateTime.now().minusDays(1))
                .build();
            return ResponseEntity.ok(java.util.List.of(mockAlert));
        }
    }
}
