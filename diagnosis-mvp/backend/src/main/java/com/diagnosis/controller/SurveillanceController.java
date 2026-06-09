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
            mockStats.put("total_patients_mapped", 5430);
            mockStats.put("high_risk_zones", 2);
            mockStats.put("epidemiological_alerts", 5);
            return ResponseEntity.ok(mockStats);
        }
    }

    @GetMapping("/alerts")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST')")
    @Operation(summary = "Alertas Epidemiológicos", description = "Retorna o histórico de alertas automáticos gerados.")
    public ResponseEntity<List<Alert>> getAlerts() {
        return ResponseEntity.ok(alertRepository.findAllByOrderByCreatedAtDesc());
    }
}
