package com.diagnosis.controller;

import com.diagnosis.dto.SOAPEvolutionRequest;
import com.diagnosis.exception.CustomException;
import com.diagnosis.model.Appointment;
import com.diagnosis.model.MedicalRecord;
import com.diagnosis.model.Patient;
import com.diagnosis.repository.AppointmentRepository;
import com.diagnosis.repository.MedicalRecordRepository;
import com.diagnosis.repository.PatientRepository;
import com.diagnosis.security.UserPrincipal;
import com.diagnosis.service.AuditService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
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
@RequestMapping("/records")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR', 'NURSE')")
@Tag(name = "Módulo PEP - Prontuário", description = "Evoluções clínicas SOAP e linha do tempo do paciente")
public class MedicalRecordController {

    private final MedicalRecordRepository medicalRecordRepository;
    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    @GetMapping("/patient/{patientId}/timeline")
    @Transactional(readOnly = true)
    @Operation(summary = "Obter linha do tempo PEP do paciente", description = "Fornece a lista de todos os registros de prontuário eletrônico ordenados por data decrescente.")
    public ResponseEntity<List<MedicalRecord>> getTimeline(
            @PathVariable UUID patientId,
            HttpServletRequest httpServletRequest
    ) {
        auditService.bindDatabaseUser();
        auditService.logAccess(patientId, "VISUALIZACAO_LINHA_TEMPO_PEP", httpServletRequest.getRemoteAddr());
        return ResponseEntity.ok(medicalRecordRepository.findByPatientIdOrderByRecordedAtDesc(patientId));
    }

    @PostMapping("/patient/{patientId}/evolution")
    @Transactional
    @Operation(summary = "Registrar nova evolução clínica (SOAP)", description = "Insere uma evolução médica baseada no padrão de estruturação clínica SOAP (Subjetivo, Objetivo, Avaliação e Plano) com assinatura digital simulada.")
    public ResponseEntity<MedicalRecord> createEvolution(
            @PathVariable UUID patientId,
            @Valid @RequestBody SOAPEvolutionRequest request,
            HttpServletRequest httpServletRequest
    ) {
        auditService.bindDatabaseUser();

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new CustomException("Paciente não encontrado.", HttpStatus.NOT_FOUND));

        UserPrincipal principal = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        try {
            // Empacota o conteúdo SOAP em uma estrutura JSON para salvar na coluna JSONB
            Map<String, String> soapData = new HashMap<>();
            soapData.put("subjetivo", request.getSubjective());
            soapData.put("objetivo", request.getObjective());
            soapData.put("avaliacao", request.getAssessment());
            soapData.put("plano", request.getPlan());
            String jsonContent = objectMapper.writeValueAsString(soapData);

            // Geração de Hash de Assinatura Simulado para o prontuário assinado digitalmente
            String signatureHash = "PEP-SIG-SHA256-" + UUID.randomUUID().toString().replace("-", "").toUpperCase();

            MedicalRecord record = MedicalRecord.builder()
                    .patient(patient)
                    .recordType("EVOLUTION")
                    .title("Evolução Clínica de Rotina - SOAP")
                    .content(jsonContent)
                    .authorId(principal.getId())
                    .authorName(principal.getUser().getName())
                    .authorCrm(principal.getUser().getCrm())
                    .signed(true)
                    .signatureHash(signatureHash)
                    .recordedAt(LocalDateTime.now())
                    .build();

            MedicalRecord saved = medicalRecordRepository.save(record);

            // Finaliza agendamentos na fila de espera para esse paciente
            List<Appointment> activeAppointments = appointmentRepository.findByPatientId(patientId);
            if (activeAppointments != null) {
                for (Appointment appointment : activeAppointments) {
                    if ("WAITING".equals(appointment.getStatus()) || "IN_PROGRESS".equals(appointment.getStatus())) {
                        appointment.setStatus("COMPLETED");
                        appointmentRepository.save(appointment);
                    }
                }
            }

            auditService.logAccess(patientId, "REGISTRO_EVOLUCAO_CLINICA_SOAP", httpServletRequest.getRemoteAddr());
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            throw new CustomException("Falha ao salvar a evolução no formato SOAP: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/patient/{patientId}/esus")
    @Transactional
    @Operation(summary = "Registrar prontuário eletrônico completo adaptado ao e-SUS APS", description = "Salva a ficha de consulta completa e-SUS APS com as 12 seções clínicas em formato JSONB.")
    public ResponseEntity<MedicalRecord> createEsusPEP(
            @PathVariable UUID patientId,
            @RequestBody Map<String, Object> esusData,
            HttpServletRequest httpServletRequest
    ) {
        auditService.bindDatabaseUser();

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new CustomException("Paciente não encontrado.", HttpStatus.NOT_FOUND));

        UserPrincipal principal = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        try {
            String jsonContent = objectMapper.writeValueAsString(esusData);
            String signatureHash = "ESUS-ICP-BR-SIG-" + UUID.randomUUID().toString().replace("-", "").toUpperCase();

            MedicalRecord record = MedicalRecord.builder()
                    .patient(patient)
                    .recordType("EVOLUTION") // Salva como registro clínico principal
                    .title("Atendimento Clínico e-SUS APS")
                    .content(jsonContent)
                    .authorId(principal.getId())
                    .authorName(principal.getUser().getName())
                    .authorCrm(principal.getUser().getCrm())
                    .signed(true)
                    .signatureHash(signatureHash)
                    .recordedAt(LocalDateTime.now())
                    .build();

            MedicalRecord saved = medicalRecordRepository.save(record);

            // Finaliza agendamentos na fila de espera para esse paciente
            List<Appointment> activeAppointments = appointmentRepository.findByPatientId(patientId);
            if (activeAppointments != null) {
                for (Appointment appointment : activeAppointments) {
                    if ("WAITING".equals(appointment.getStatus()) || "IN_PROGRESS".equals(appointment.getStatus())) {
                        appointment.setStatus("COMPLETED");
                        appointmentRepository.save(appointment);
                    }
                }
            }

            auditService.logAccess(patientId, "REGISTRO_PRONTUARIO_ESUS_APS", httpServletRequest.getRemoteAddr());
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            throw new CustomException("Falha ao salvar prontuário e-SUS APS: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
