package com.diagnosis.controller;

import com.diagnosis.exception.CustomException;
import com.diagnosis.model.Condition;
import com.diagnosis.model.Patient;
import com.diagnosis.repository.ConditionRepository;
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
@RequestMapping("/conditions")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR', 'NURSE')")
@Tag(name = "Módulo Condições Médicas", description = "Gerenciamento de diagnósticos e CIDs ativos do paciente")
public class ConditionController {

    private final ConditionRepository conditionRepository;
    private final PatientRepository patientRepository;
    private final AuditService auditService;

    @GetMapping("/patient/{patientId}")
    @Transactional(readOnly = true)
    @Operation(summary = "Obter diagnósticos ativos", description = "Lista as condições clínicas registradas de um paciente.")
    public ResponseEntity<List<Condition>> getConditions(
            @PathVariable UUID patientId,
            HttpServletRequest httpServletRequest
    ) {
        auditService.bindDatabaseUser();
        auditService.logAccess(patientId, "CONSULTA_CONDICOES_CID10_PACIENTE", httpServletRequest.getRemoteAddr());
        return ResponseEntity.ok(conditionRepository.findByPatientId(patientId));
    }

    @PostMapping("/patient/{patientId}")
    @Transactional
    @Operation(summary = "Adicionar nova condição (CID-10)", description = "Associa um diagnóstico sob a tabela de condições de saúde ativa do paciente.")
    public ResponseEntity<Condition> addCondition(
            @PathVariable UUID patientId,
            @RequestBody Condition condition,
            HttpServletRequest httpServletRequest
    ) {
        auditService.bindDatabaseUser();
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new CustomException("Paciente não encontrado.", HttpStatus.NOT_FOUND));

        condition.setPatient(patient);
        if (condition.getStatus() == null) {
            condition.setStatus("ACTIVE");
        }

        Condition saved = conditionRepository.save(condition);
        auditService.logAccess(patientId, "REGISTRO_DIAGNOSTICO_CID10: " + condition.getCidCode(), httpServletRequest.getRemoteAddr());
        return ResponseEntity.ok(saved);
    }
}
