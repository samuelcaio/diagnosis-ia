package com.diagnosis.controller;

import com.diagnosis.dto.RegisterPatientRequest;
import com.diagnosis.model.Patient;
import com.diagnosis.service.PatientService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/patients")
@RequiredArgsConstructor
@Tag(name = "Módulo Pacientes", description = "Cadastro, pesquisa e histórico PEP do paciente")
public class PatientController {

    private final PatientService patientService;

    @PostMapping
    @Operation(summary = "Cadastrar novo paciente", description = "Insere um paciente no sistema com CPF criptografado via hash SHA-256 em conformidade com a LGPD.")
    public ResponseEntity<Patient> register(
            @Valid @RequestBody RegisterPatientRequest request,
            HttpServletRequest httpServletRequest
    ) {
        String ipAddress = httpServletRequest.getRemoteAddr();
        return ResponseEntity.ok(patientService.registerPatient(request, ipAddress));
    }

    @GetMapping
    @Operation(summary = "Pesquisar pacientes", description = "Busca pacientes por nome (parcial) ou CPF exato. Retorna todos se a consulta estiver vazia.")
    public ResponseEntity<List<Patient>> search(
            @RequestParam(required = false) String query,
            HttpServletRequest httpServletRequest
    ) {
        String ipAddress = httpServletRequest.getRemoteAddr();
        return ResponseEntity.ok(patientService.searchPatients(query, ipAddress));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar detalhes de um paciente", description = "Retorna os dados demográficos de um paciente por ID.")
    public ResponseEntity<Patient> findById(
            @PathVariable UUID id,
            HttpServletRequest httpServletRequest
    ) {
        String ipAddress = httpServletRequest.getRemoteAddr();
        return ResponseEntity.ok(patientService.findById(id, ipAddress));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR', 'NURSE')")
    @Operation(summary = "Recuperar Prontuário Eletrônico (PEP)", description = "Agrega todas as triagens, observações de exames, CIDs, prescrições, imunizações e evoluções de um paciente.")
    public ResponseEntity<Map<String, Object>> getHistory(
            @PathVariable UUID id,
            HttpServletRequest httpServletRequest
    ) {
        String ipAddress = httpServletRequest.getRemoteAddr();
        return ResponseEntity.ok(patientService.getPatientClinicalHistory(id, ipAddress));
    }
}
