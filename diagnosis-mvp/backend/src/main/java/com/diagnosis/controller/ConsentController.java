package com.diagnosis.controller;

import com.diagnosis.model.Consent;
import com.diagnosis.model.Patient;
import com.diagnosis.repository.ConsentRepository;
import com.diagnosis.repository.PatientRepository;
import com.diagnosis.service.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/consents")
@RequiredArgsConstructor
@Tag(name = "Módulo Consentimento", description = "Gerenciamento de Termos de Consentimento Assinados (LGPD)")
public class ConsentController {

    private final ConsentRepository consentRepository;
    private final PatientRepository patientRepository;
    private final AuditService auditService;

    @PostMapping
    @Transactional
    @Operation(summary = "Registrar assinatura de termo de consentimento", description = "Salva o registro de termo de consentimento assinado pelo paciente para coleta de dados de saúde.")
    public ResponseEntity<Consent> registerConsent(
            @RequestBody Map<String, String> body,
            HttpServletRequest httpServletRequest
    ) {
        auditService.bindDatabaseUser();
        UUID patientId = UUID.fromString(body.get("patientId"));
        String version = body.get("termVersion");
        
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new NoSuchElementException("Paciente não encontrado."));

        Consent consent = Consent.builder()
                .patient(patient)
                .termVersion(version != null ? version : "v1.0-2026")
                .ipAddress(httpServletRequest.getRemoteAddr())
                .signatureHash("HASH-SIG-" + UUID.randomUUID().toString().replace("-", "").substring(0,16).toUpperCase())
                .signedAt(LocalDateTime.now())
                .build();

        Consent saved = consentRepository.save(consent);
        auditService.logAccess(patientId, "ASSINATURA_TERMO_CONSENTIMENTO_REGISTRADA", httpServletRequest.getRemoteAddr());
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/patient/{patientId}")
    @Transactional(readOnly = true)
    @Operation(summary = "Obter termos assinados pelo paciente", description = "Retorna todos os termos de consentimento assinados de um determinado paciente.")
    public ResponseEntity<List<Consent>> getConsentsByPatient(
            @PathVariable UUID patientId,
            HttpServletRequest httpServletRequest
    ) {
        auditService.bindDatabaseUser();
        auditService.logAccess(patientId, "CONSULTA_TERMOS_CONSENTIMENTO_PACIENTE", httpServletRequest.getRemoteAddr());
        return ResponseEntity.ok(consentRepository.findByPatientId(patientId));
    }
}
