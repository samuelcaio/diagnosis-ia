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
@RequestMapping("/prescriptions")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
@Tag(name = "Módulo Prescrições", description = "Geração de receitas digitais e downloads de PDF")
public class PrescriptionController {

    private final MedicalRecordRepository medicalRecordRepository;
    private final PatientRepository patientRepository;
    private final PdfService pdfService;
    private final AuditService auditService;

    @PostMapping
    @Transactional
    @Operation(summary = "Gerar receita médica em PDF", description = "Registra a receita no prontuário eletrônico (PEP) e gera o arquivo correspondente codificado em Base64 para download.")
    public ResponseEntity<Map<String, Object>> generatePrescription(
            @RequestBody Map<String, String> body,
            HttpServletRequest httpServletRequest
    ) {
        auditService.bindDatabaseUser();
        UUID patientId = UUID.fromString(body.get("patientId"));
        String medications = body.get("medications");

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new CustomException("Paciente não encontrado.", HttpStatus.NOT_FOUND));

        UserPrincipal principal = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        // Gera a assinatura e codifica em Base64
        String pdfBase64 = pdfService.generatePrescriptionPdfBase64(patientId, medications, principal.getUser());
        String signatureHash = "PRESC-SIG-SHA256-" + UUID.randomUUID().toString().replace("-", "").toUpperCase();

        // Salva registro no PEP do tipo PRESCRIPTION
        Map<String, String> contentData = new HashMap<>();
        contentData.put("medicamentos", medications);
        contentData.put("pdfBase64", pdfBase64);

        MedicalRecord record = MedicalRecord.builder()
                .patient(patient)
                .recordType("PRESCRIPTION")
                .title("Prescrição Médica Eletrônica")
                .content(new com.fasterxml.jackson.databind.ObjectMapper().valueToTree(contentData).toString())
                .authorId(principal.getId())
                .authorName(principal.getUser().getName())
                .authorCrm(principal.getUser().getCrm())
                .signed(true)
                .signatureHash(signatureHash)
                .recordedAt(LocalDateTime.now())
                .build();

        MedicalRecord saved = medicalRecordRepository.save(record);
        auditService.logAccess(patientId, "GERACAO_DOCUMENTO_RECEITA_MEDICA_PDF", httpServletRequest.getRemoteAddr());

        Map<String, Object> response = new HashMap<>();
        response.put("recordId", saved.getId());
        response.put("title", saved.getTitle());
        response.put("pdfBase64", pdfBase64);
        response.put("signatureHash", signatureHash);

        return ResponseEntity.ok(response);
    }
}
