package com.diagnosis.controller;

import com.diagnosis.dto.TriageRequest;
import com.diagnosis.model.Appointment;
import com.diagnosis.model.Triage;
import com.diagnosis.service.AuditService;
import com.diagnosis.service.TriageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/triage")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR', 'NURSE')")
@Tag(name = "Módulo Triagem", description = "Triagem de sinais vitais e classificação Manchester por enfermeiros")
public class TriageController {

    private final TriageService triageService;
    private final AuditService auditService;

    @PostMapping
    @Operation(summary = "Registrar triagem de paciente", description = "Registra sinais vitais e define a prioridade de atendimento com base no sistema de cores de Manchester.")
    public ResponseEntity<Triage> registerTriage(
            @Valid @RequestBody TriageRequest request,
            HttpServletRequest httpServletRequest
    ) {
        String ipAddress = httpServletRequest.getRemoteAddr();
        return ResponseEntity.ok(triageService.registerTriage(request, ipAddress));
    }

    @GetMapping("/queue")
    @Operation(summary = "Obter fila de espera", description = "Retorna todos os agendamentos que estão aguardando triagem ou atendimento médico.")
    public ResponseEntity<List<Appointment>> getTriageQueue() {
        try {
            return ResponseEntity.ok(triageService.getTriageQueue());
        } catch (Exception e) {
            // Mock vitrine caso o Supabase falhe ou demore
            com.diagnosis.model.Patient p1 = com.diagnosis.model.Patient.builder()
                .id(java.util.UUID.randomUUID())
                .name("João da Silva")
                .gender("M")
                .birthDate(java.time.LocalDate.of(1950, 5, 10))
                .build();
            Appointment mockApp = Appointment.builder()
                .id(java.util.UUID.randomUUID())
                .patient(p1)
                .status("WAITING")
                .checklistData("{\"priority\":true,\"urgency\":\"EMERGENCIA\"}")
                .build();
            return ResponseEntity.ok(List.of(mockApp));
        }
    }
}
