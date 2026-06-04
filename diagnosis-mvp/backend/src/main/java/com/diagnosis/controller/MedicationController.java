package com.diagnosis.controller;

import com.diagnosis.exception.CustomException;
import com.diagnosis.model.MedicationRequest;
import com.diagnosis.model.Patient;
import com.diagnosis.repository.MedicationRequestRepository;
import com.diagnosis.repository.PatientRepository;
import com.diagnosis.service.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/medications")
@RequiredArgsConstructor
@Tag(name = "Módulo Prescrições Ativas", description = "Monitoramento de receitas e solicitações de medicamentos de uso ativo do paciente")
public class MedicationController {

    private final MedicationRequestRepository medicationRequestRepository;
    private final PatientRepository patientRepository;
    private final AuditService auditService;

    @GetMapping("/patient/{patientId}")
    @Transactional(readOnly = true)
    @Operation(summary = "Obter receitas ativas", description = "Fornece a lista de medicamentos ativos para o paciente.")
    public ResponseEntity<List<MedicationRequest>> getMedications(
            @PathVariable UUID patientId,
            HttpServletRequest httpServletRequest
    ) {
        auditService.bindDatabaseUser();
        auditService.logAccess(patientId, "CONSULTA_MEDICAMENTOS_PACIENTE", httpServletRequest.getRemoteAddr());
        return ResponseEntity.ok(medicationRequestRepository.findByPatientIdOrderByRecordedAtDesc(patientId));
    }

    @PostMapping("/patient/{patientId}")
    @Transactional
    @Operation(summary = "Registrar uso de medicamento", description = "Adiciona um registro de solicitação/uso de medicação na ficha do paciente.")
    public ResponseEntity<MedicationRequest> addMedication(
            @PathVariable UUID patientId,
            @RequestBody MedicationRequest request,
            HttpServletRequest httpServletRequest
    ) {
        auditService.bindDatabaseUser();
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new CustomException("Paciente não encontrado.", HttpStatus.NOT_FOUND));

        request.setPatient(patient);
        if (request.getRecordedAt() == null) {
            request.setRecordedAt(LocalDateTime.now());
        }

        MedicationRequest saved = medicationRequestRepository.save(request);
        auditService.logAccess(patientId, "REGISTRO_RECEITA_MEDICAMENTO: " + request.getMedicationName(), httpServletRequest.getRemoteAddr());
        return ResponseEntity.ok(saved);
    }
}
