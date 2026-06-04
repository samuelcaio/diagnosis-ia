package com.diagnosis.controller;

import com.diagnosis.exception.CustomException;
import com.diagnosis.model.MedicalRecord;
import com.diagnosis.model.Patient;
import com.diagnosis.model.Referral;
import com.diagnosis.repository.MedicalRecordRepository;
import com.diagnosis.repository.PatientRepository;
import com.diagnosis.repository.ReferralRepository;
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
@RequestMapping("/referrals")
@RequiredArgsConstructor
@Tag(name = "Módulo Encaminhamentos", description = "Encaminhamentos para especialidades secundárias / SISREG")
public class ReferralController {

    private final ReferralRepository referralRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final PatientRepository patientRepository;
    private final PdfService pdfService;
    private final AuditService auditService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    @Transactional
    @Operation(summary = "Gerar encaminhamento para especialidade", description = "Insere uma solicitação de encaminhamento no banco de dados e adiciona a guia correspondente no PEP do paciente.")
    public ResponseEntity<Map<String, Object>> createReferral(
            @RequestBody Map<String, String> body,
            HttpServletRequest httpServletRequest
    ) {
        auditService.bindDatabaseUser();
        UUID patientId = UUID.fromString(body.get("patientId"));
        String specialty = body.get("specialty");
        String justification = body.get("justification");

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new CustomException("Paciente não encontrado.", HttpStatus.NOT_FOUND));

        UserPrincipal principal = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        // 1. Salva na fila de encaminhamentos
        Referral referral = Referral.builder()
                .patient(patient)
                .specialty(specialty)
                .justification(justification)
                .status("PENDING")
                .build();
        referralRepository.save(referral);

        // 2. Gera o PDF em Base64
        String pdfBase64 = pdfService.generateReferralPdfBase64(patientId, specialty, justification, principal.getUser());
        String signatureHash = "REF-SIG-SHA256-" + UUID.randomUUID().toString().replace("-", "").toUpperCase();

        // 3. Salva no PEP (medical_records)
        Map<String, String> contentData = new HashMap<>();
        contentData.put("especialidade", specialty);
        contentData.put("justificativa", justification);
        contentData.put("pdfBase64", pdfBase64);

        MedicalRecord record = MedicalRecord.builder()
                .patient(patient)
                .recordType("REFERRAL")
                .title("Guia de Encaminhamento - " + specialty)
                .content(new com.fasterxml.jackson.databind.ObjectMapper().valueToTree(contentData).toString())
                .authorId(principal.getId())
                .authorName(principal.getUser().getName())
                .authorCrm(principal.getUser().getCrm())
                .signed(true)
                .signatureHash(signatureHash)
                .recordedAt(LocalDateTime.now())
                .build();
        medicalRecordRepository.save(record);

        auditService.logAccess(patientId, "REGISTRO_ENCAMINHAMENTO_SISREG", httpServletRequest.getRemoteAddr());

        Map<String, Object> response = new HashMap<>();
        response.put("referralId", referral.getId());
        response.put("pdfBase64", pdfBase64);
        response.put("signatureHash", signatureHash);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/queue")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR', 'NURSE')")
    @Transactional(readOnly = true)
    @Operation(summary = "Obter fila de encaminhamentos", description = "Lista todos os encaminhamentos registrados para especialidades.")
    public ResponseEntity<List<Referral>> getQueue() {
        auditService.bindDatabaseUser();
        return ResponseEntity.ok(referralRepository.findAll());
    }
}
