package com.diagnosis.controller;

import com.diagnosis.exception.CustomException;
import com.diagnosis.model.Allergy;
import com.diagnosis.model.Patient;
import com.diagnosis.repository.AllergyRepository;
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
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/allergies")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR', 'NURSE')")
@Tag(name = "Módulo Alergias", description = "Monitoramento de reações adversas e alergias alimentares ou medicamentosas")
public class AllergyController {

    private final AllergyRepository allergyRepository;
    private final PatientRepository patientRepository;
    private final AuditService auditService;

    @GetMapping("/patient/{patientId}")
    @Transactional(readOnly = true)
    @Operation(summary = "Obter alergias registradas", description = "Retorna o quadro alérgico do paciente.")
    public ResponseEntity<List<Allergy>> getAllergies(
            @PathVariable UUID patientId,
            HttpServletRequest httpServletRequest
    ) {
        auditService.bindDatabaseUser();
        auditService.logAccess(patientId, "CONSULTA_ALERGIAS_PACIENTE", httpServletRequest.getRemoteAddr());
        return ResponseEntity.ok(allergyRepository.findByPatientId(patientId));
    }

    @PostMapping("/patient/{patientId}")
    @Transactional
    @Operation(summary = "Registrar nova alergia", description = "Associa uma nova hipersensibilidade na ficha de alergias do paciente.")
    public ResponseEntity<Allergy> addAllergy(
            @PathVariable UUID patientId,
            @RequestBody Allergy allergy,
            HttpServletRequest httpServletRequest
    ) {
        auditService.bindDatabaseUser();
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new CustomException("Paciente não encontrado.", HttpStatus.NOT_FOUND));

        allergy.setPatient(patient);
        Allergy saved = allergyRepository.save(allergy);
        auditService.logAccess(patientId, "REGISTRO_ALERGIA: " + allergy.getAllergen(), httpServletRequest.getRemoteAddr());
        return ResponseEntity.ok(saved);
    }
}
