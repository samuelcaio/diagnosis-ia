package com.diagnosis.service;

import com.diagnosis.dto.TriageRequest;
import com.diagnosis.exception.CustomException;
import com.diagnosis.model.Appointment;
import com.diagnosis.model.Patient;
import com.diagnosis.model.Triage;
import com.diagnosis.repository.AppointmentRepository;
import com.diagnosis.repository.PatientRepository;
import com.diagnosis.repository.TriageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TriageService {

    private final TriageRepository triageRepository;
    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final AuditService auditService;

    @Transactional
    public Triage registerTriage(TriageRequest request, String ipAddress) {
        auditService.bindDatabaseUser();

        Appointment appointment = appointmentRepository.findById(request.getAppointmentId())
                .orElseThrow(() -> new CustomException("Agendamento não encontrado.", HttpStatus.NOT_FOUND));

        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new CustomException("Paciente não encontrado.", HttpStatus.NOT_FOUND));

        Triage triage = Triage.builder()
                .appointment(appointment)
                .patient(patient)
                .heartRate(request.getHeartRate())
                .bloodPressure(request.getBloodPressure())
                .temperature(request.getTemperature())
                .respiratoryRate(request.getRespiratoryRate())
                .oxygenSaturation(request.getOxygenSaturation())
                .painScale(request.getPainScale())
                .riskClassification(request.getRiskClassification())
                .build();

        Triage saved = triageRepository.save(triage);

        // Atualiza status do agendamento para indicar que a triagem foi feita e ele está aguardando o médico
        appointment.setStatus("WAITING");
        appointment.setChecklistCompleted(true);
        appointmentRepository.save(appointment);

        auditService.logAccess(patient.getId(), "TRIAGEM_REGISTRADA_SINAIS_VITAIS", ipAddress);

        return saved;
    }

    @Transactional(readOnly = true)
    public List<Appointment> getTriageQueue() {
        auditService.bindDatabaseUser();
        // Retorna todos os agendamentos que estão aguardando triagem ou atendimento médico
        return appointmentRepository.findByStatusOrderByScheduledForAsc("WAITING");
    }
}
