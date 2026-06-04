package com.diagnosis.controller;

import com.diagnosis.exception.CustomException;
import com.diagnosis.model.MedicalRecord;
import com.diagnosis.model.Patient;
import com.diagnosis.repository.MedicalRecordRepository;
import com.diagnosis.repository.PatientRepository;
import com.diagnosis.security.UserPrincipal;
import com.diagnosis.service.AuditService;
import com.diagnosis.service.PdfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/certificates")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
@Tag(name = "Módulo Atestados", description = "Geração de atestados médicos de afastamento e downloads de PDF")
public class CertificateController {

    private final MedicalRecordRepository medicalRecordRepository;
    private final PatientRepository patientRepository;
    private final PdfService pdfService;
    private final AuditService auditService;

    @PostMapping
    @Transactional
    @Operation(summary = "Gerar atestado médico em PDF", description = "Gera um atestado de afastamento no PEP e fornece o arquivo em Base64 para visualização/impressão.")
    public ResponseEntity<Map<String, Object>> generateCertificate(
            @RequestBody Map<String, Object> body,
            HttpServletRequest httpServletRequest
    ) {
        auditService.bindDatabaseUser();
        UUID patientId = UUID.fromString(body.get("patientId").toString());
        int days = Integer.parseInt(body.get("days").toString());
        String cid = body.get("cid").toString();
        String notes = body.getOrDefault("notes", "Repouso geral.").toString();

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new CustomException("Paciente não encontrado.", HttpStatus.NOT_FOUND));

        UserPrincipal principal = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        String pdfBase64 = pdfService.generateCertificatePdfBase64(patientId, days, cid, notes, principal.getUser());
        String signatureHash = "CERT-SIG-SHA256-" + UUID.randomUUID().toString().replace("-", "").toUpperCase();

        Map<String, String> contentData = new HashMap<>();
        contentData.put("dias_afastamento", String.valueOf(days));
        contentData.put("cid", cid);
        contentData.put("orientacoes", notes);
        contentData.put("pdfBase64", pdfBase64);

        MedicalRecord record = MedicalRecord.builder()
                .patient(patient)
                .recordType("EVOLUTION") // Salva como documento clínico de consulta
                .title("Atestado Médico de Afastamento - " + days + " dias")
                .content(new com.fasterxml.jackson.databind.ObjectMapper().valueToTree(contentData).toString())
                .authorId(principal.getId())
                .authorName(principal.getUser().getName())
                .authorCrm(principal.getUser().getCrm())
                .signed(true)
                .signatureHash(signatureHash)
                .recordedAt(LocalDateTime.now())
                .build();

        MedicalRecord saved = medicalRecordRepository.save(record);
        auditService.logAccess(patientId, "GERACAO_ATESTADO_MEDICO_PDF", httpServletRequest.getRemoteAddr());

        Map<String, Object> response = new HashMap<>();
        response.put("recordId", saved.getId());
        response.put("title", saved.getTitle());
        response.put("pdfBase64", pdfBase64);
        response.put("signatureHash", signatureHash);

        return ResponseEntity.ok(response);
    }
}
