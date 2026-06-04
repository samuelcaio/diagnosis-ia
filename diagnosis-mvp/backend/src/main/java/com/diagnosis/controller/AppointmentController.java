package com.diagnosis.controller;

import com.diagnosis.exception.CustomException;
import com.diagnosis.model.Appointment;
import com.diagnosis.model.Patient;
import com.diagnosis.repository.AppointmentRepository;
import com.diagnosis.repository.PatientRepository;
import com.diagnosis.service.AuditService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/appointments")
@RequiredArgsConstructor
@Tag(name = "Módulo Agendamentos", description = "Gerenciamento de consultas clínicas e checklist antecipado")
public class AppointmentController {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    @GetMapping
    @Transactional(readOnly = true)
    @Operation(summary = "Obter lista de agendamentos", description = "Retorna todos os agendamentos cadastrados no sistema.")
    public ResponseEntity<List<Appointment>> getAppointments(HttpServletRequest httpServletRequest) {
        auditService.bindDatabaseUser();
        return ResponseEntity.ok(appointmentRepository.findAll());
    }

    @PostMapping
    @Transactional
    @Operation(summary = "Agendar nova consulta", description = "Agenda um atendimento para um determinado paciente na UBS com prioridade e classificação de urgência.")
    public ResponseEntity<Appointment> createAppointment(
            @RequestBody Map<String, Object> body,
            HttpServletRequest httpServletRequest
    ) {
        auditService.bindDatabaseUser();
        UUID patientId = UUID.fromString(body.get("patientId").toString());
        
        // Se scheduledFor não vier no body, usamos a data e hora atual (fila imediata!)
        String dateStr = body.getOrDefault("scheduledFor", LocalDateTime.now().toString()).toString();
        
        // Garante formato correto de datetime ISO-8601
        if (dateStr.length() == 16) {
            dateStr += ":00";
        }
        LocalDateTime scheduledFor = LocalDateTime.parse(dateStr);

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new CustomException("Paciente não encontrado.", HttpStatus.NOT_FOUND));

        // Pega prioridade e urgência do body
        Boolean priority = body.get("priority") != null ? (Boolean) body.get("priority") : false;
        String urgency = body.getOrDefault("urgency", "ELETIVO").toString();

        Map<String, Object> checklistAnswers = new HashMap<>();
        checklistAnswers.put("priority", priority);
        checklistAnswers.put("urgency", urgency);

        String checklistJson = null;
        try {
            checklistJson = objectMapper.writeValueAsString(checklistAnswers);
        } catch (Exception e) {
            // Ignora
        }

        Appointment appointment = Appointment.builder()
                .patient(patient)
                .scheduledFor(scheduledFor)
                .status("WAITING")
                .checklistCompleted(true)
                .checklistData(checklistJson)
                .build();

        Appointment saved = appointmentRepository.save(appointment);
        auditService.logAccess(patientId, "REGISTRO_AGENDAMENTO_FILA: " + dateStr + " - PRIORIDADE: " + priority + " - URGENCIA: " + urgency, httpServletRequest.getRemoteAddr());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}/checklist")
    @Transactional
    @Operation(summary = "Registrar checklist pré-atendimento", description = "Salva as respostas do checklist clínico respondido previamente pelo paciente.")
    public ResponseEntity<Appointment> saveChecklist(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> checklistAnswers,
            HttpServletRequest httpServletRequest
    ) {
        auditService.bindDatabaseUser();
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new CustomException("Agendamento não encontrado.", HttpStatus.NOT_FOUND));

        try {
            String json = objectMapper.writeValueAsString(checklistAnswers);
            appointment.setChecklistData(json);
            appointment.setChecklistCompleted(true);
            Appointment saved = appointmentRepository.save(appointment);
            
            auditService.logAccess(appointment.getPatient().getId(), "SALVAR_CHECKLIST_PRE_CONSULTA", httpServletRequest.getRemoteAddr());
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            throw new CustomException("Erro ao processar dados do checklist: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PutMapping("/{id}/cancel")
    @Transactional
    @Operation(summary = "Registrar desistência de consulta", description = "Cancela o agendamento definindo o status como CANCELLED.")
    public ResponseEntity<Appointment> cancelAppointment(
            @PathVariable UUID id,
            HttpServletRequest httpServletRequest
    ) {
        auditService.bindDatabaseUser();
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new CustomException("Agendamento não encontrado.", HttpStatus.NOT_FOUND));

        appointment.setStatus("CANCELLED");
        Appointment saved = appointmentRepository.save(appointment);
        auditService.logAccess(appointment.getPatient().getId(), "REGISTRO_DESISTENCIA_CONSULTA", httpServletRequest.getRemoteAddr());
        return ResponseEntity.ok(saved);
    }
}
