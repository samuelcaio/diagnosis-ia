package com.diagnosis.service;

import com.diagnosis.dto.RegisterPatientRequest;
import com.diagnosis.exception.CustomException;
import com.diagnosis.model.*;
import com.diagnosis.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepository;
    private final ConditionRepository conditionRepository;
    private final ObservationRepository observationRepository;
    private final MedicationRequestRepository medicationRequestRepository;
    private final AllergyRepository allergyRepository;
    private final ImmunizationRepository immunizationRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final TriageRepository triageRepository;
    private final AuditService auditService;

    @Value("${lgpd.cpf.salt}")
    private String cpfSalt;

    /**
     * Gera o hash SHA-256 seguro de um CPF limpo (somente números) concatenado com o salt.
     */
    public String hashCpf(String cpf) {
        if (cpf == null) return null;
        String cleanCpf = cpf.replaceAll("\\D", ""); // Remove pontos e traços
        try {
            String salted = cleanCpf + cpfSalt;
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(salted.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new CustomException("Erro ao processar hash de CPF do paciente.", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Transactional
    public Patient registerPatient(RegisterPatientRequest request, String ipAddress) {
        auditService.bindDatabaseUser();
        
        String cpfHash = hashCpf(request.getCpf());
        if (patientRepository.findByCpfHash(cpfHash).isPresent()) {
            throw new CustomException("Paciente já cadastrado com este CPF.", HttpStatus.CONFLICT);
        }

        Patient patient = Patient.builder()
                .name(request.getName())
                .cpfHash(cpfHash)
                .birthDate(request.getBirthDate())
                .gender(request.getGender())
                .address(request.getAddress())
                .cep(request.getCep())
                .state(request.getState())
                .city(request.getCity())
                .neighborhood(request.getNeighborhood())
                .street(request.getStreet())
                .addressNumber(request.getAddressNumber())
                .complement(request.getComplement())
                .referencePoint(request.getReferencePoint())
                .coverageArea(request.getCoverageArea())
                .microarea(request.getMicroarea())
                .acsName(request.getAcsName())
                .esfTeam(request.getEsfTeam())
                .phone(request.getPhone())
                .build();

        Patient saved = patientRepository.save(patient);
        auditService.logAccess(saved.getId(), "CADASTRO_NOVO_PACIENTE", ipAddress);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Patient> searchPatients(String query, String ipAddress) {
        // Como o RLS está ativo, vinculamos o usuário antes do SELECT
        auditService.bindDatabaseUser();

        if (query == null || query.trim().isEmpty()) {
            return patientRepository.findAll();
        }

        // Tenta buscar por CPF exato gerando hash do CPF pesquisado
        String possibleCpf = query.replaceAll("\\D", "");
        if (possibleCpf.length() == 11) {
            String cpfHash = hashCpf(possibleCpf);
            Optional<Patient> patient = patientRepository.findByCpfHash(cpfHash);
            if (patient.isPresent()) {
                auditService.logAccess(patient.get().getId(), "BUSCA_PACIENTE_CPF", ipAddress);
                return Collections.singletonList(patient.get());
            }
        }

        // Fallback: Busca por fragmento de nome
        List<Patient> list = patientRepository.findByNameContainingIgnoreCase(query);
        for (Patient p : list) {
            auditService.logAccess(p.getId(), "BUSCA_PACIENTE_NOME", ipAddress);
        }
        return list;
    }

    @Transactional(readOnly = true)
    public Patient findById(UUID id, String ipAddress) {
        auditService.bindDatabaseUser();
        Patient p = patientRepository.findById(id)
                .orElseThrow(() -> new CustomException("Paciente não encontrado.", HttpStatus.NOT_FOUND));
        auditService.logAccess(p.getId(), "VISUALIZACAO_PERFIL_PACIENTE", ipAddress);
        return p;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getPatientClinicalHistory(UUID patientId, String ipAddress) {
        auditService.bindDatabaseUser();
        
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new CustomException("Paciente não encontrado.", HttpStatus.NOT_FOUND));

        auditService.logAccess(patient.getId(), "CONSULTA_HISTORICO_CLINICO_PEP", ipAddress);

        Map<String, Object> history = new HashMap<>();
        history.put("patient", patient);
        history.put("conditions", conditionRepository.findByPatientId(patientId));
        history.put("observations", observationRepository.findByPatientIdOrderByRecordedAtDesc(patientId));
        history.put("medications", medicationRequestRepository.findByPatientIdOrderByRecordedAtDesc(patientId));
        history.put("allergies", allergyRepository.findByPatientId(patientId));
        history.put("immunizations", immunizationRepository.findByPatientIdOrderByAppliedAtDesc(patientId));
        history.put("timelineRecords", medicalRecordRepository.findByPatientIdOrderByRecordedAtDesc(patientId));
        history.put("triages", triageRepository.findByPatientId(patientId));

        return history;
    }
}
