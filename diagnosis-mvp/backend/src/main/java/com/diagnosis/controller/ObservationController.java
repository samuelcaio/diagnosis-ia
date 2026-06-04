package com.diagnosis.controller;

import com.diagnosis.exception.CustomException;
import com.diagnosis.model.Observation;
import com.diagnosis.model.Patient;
import com.diagnosis.repository.ObservationRepository;
import com.diagnosis.repository.PatientRepository;
import com.diagnosis.service.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/observations")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR', 'NURSE')")
@Tag(name = "Módulo Observações Clínicas", description = "Gerenciamento de exames laboratoriais, sinais e sintomas")
public class ObservationController {

    private final ObservationRepository observationRepository;
    private final PatientRepository patientRepository;
    private final AuditService auditService;

    @GetMapping("/patient/{patientId}")
    @Transactional(readOnly = true)
    @Operation(summary = "Obter observações e exames", description = "Retorna o histórico de exames laboratoriais e sinais clínicos do paciente.")
    public ResponseEntity<List<Observation>> getObservations(
            @PathVariable UUID patientId,
            HttpServletRequest httpServletRequest
    ) {
        auditService.bindDatabaseUser();
        auditService.logAccess(patientId, "CONSULTA_EXAMES_OBSERVACOES_PACIENTE", httpServletRequest.getRemoteAddr());
        return ResponseEntity.ok(observationRepository.findByPatientIdOrderByRecordedAtDesc(patientId));
    }

    @PostMapping("/patient/{patientId}")
    @Transactional
    @Operation(summary = "Registrar exame ou observação", description = "Adiciona um resultado de exame laboratorial, sintomas ou sinais vitais ao histórico.")
    public ResponseEntity<Observation> addObservation(
            @PathVariable UUID patientId,
            @RequestBody Observation observation,
            HttpServletRequest httpServletRequest
    ) {
        auditService.bindDatabaseUser();
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new CustomException("Paciente não encontrado.", HttpStatus.NOT_FOUND));

        observation.setPatient(patient);
        if (observation.getRecordedAt() == null) {
            observation.setRecordedAt(LocalDateTime.now());
        }

        Observation saved = observationRepository.save(observation);
        auditService.logAccess(patientId, "REGISTRO_EXAME_OBSERVACAO: " + observation.getName(), httpServletRequest.getRemoteAddr());
        return ResponseEntity.ok(saved);
    }
}
