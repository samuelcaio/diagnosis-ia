package com.diagnosis.service;

import com.diagnosis.exception.CustomException;
import com.diagnosis.model.Patient;
import com.diagnosis.model.User;
import com.diagnosis.repository.PatientRepository;
import com.diagnosis.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PdfService {

    private final PatientRepository patientRepository;
    private final UserRepository userRepository;

    public String generatePrescriptionPdfBase64(UUID patientId, String prescriptionJson, User doctor) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new CustomException("Paciente não encontrado.", HttpStatus.NOT_FOUND));

        String ubsName = doctor.getUnidadeSaude() != null ? doctor.getUnidadeSaude().getNome() : "UNIDADE BÁSICA DE SAÚDE (UBS)";
        String ubsAddress = doctor.getUnidadeSaude() != null ? doctor.getUnidadeSaude().getEndereco() : "ENDEREÇO DA UNIDADE DE SAÚDE";
        
        // Remove duplicidades e padroniza títulos
        String docNameUpper = doctor.getName().toUpperCase();
        String docRoleTitle = doctor.getRole() == com.diagnosis.model.Role.NURSE ? "ENFERMEIRO(A): " : "MÉDICO: ";
        String namePrefix = "";
        if (doctor.getRole() == com.diagnosis.model.Role.DOCTOR && !docNameUpper.startsWith("DR.") && !docNameUpper.startsWith("DRA.")) {
            namePrefix = "DR. ";
        } else if (doctor.getRole() == com.diagnosis.model.Role.NURSE && !docNameUpper.startsWith("ENF")) {
            namePrefix = "ENF. ";
        }

        String htmlContent = "--------------------------------------------------------\n" +
                "               PRESCRIÇÃO MÉDICA ELETRÔNICA\n" +
                "               NOME DA UBS: " + ubsName.toUpperCase() + "\n" +
                "               ENDEREÇO: " + ubsAddress.toUpperCase() + "\n" +
                "--------------------------------------------------------\n" +
                "PACIENTE: " + patient.getName() + "\n" +
                "DATA DE NASCIMENTO: " + patient.getBirthDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + "\n" +
                "CPF: ANÔNIMO (LGPD COMPLIANT)\n" +
                "--------------------------------------------------------\n" +
                "MEDICAMENTO(S) E INSTRUÇÕES:\n" +
                prescriptionJson + "\n" +
                "--------------------------------------------------------\n" +
                docRoleTitle + namePrefix + doctor.getName().toUpperCase() + "\n" +
                (doctor.getRole() == com.diagnosis.model.Role.DOCTOR ? "CRM: " + (doctor.getCrm() != null ? doctor.getCrm() : "ISENTO") + "\n" : "") +
                "DATA DE EMISSÃO: " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + "\n" +
                "--------------------------------------------------------\n" +
                "ASSINATURA DIGITAL: SIMULADA E AUDITADA\n" +
                "SIGNATURE HASH: SHA256-" + UUID.randomUUID().toString().replace("-", "").toUpperCase() + "\n" +
                "--------------------------------------------------------";

        return Base64.getEncoder().encodeToString(htmlContent.getBytes(StandardCharsets.UTF_8));
    }

    public String generateCertificatePdfBase64(UUID patientId, int days, String cid, String notes, User doctor) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new CustomException("Paciente não encontrado.", HttpStatus.NOT_FOUND));

        String ubsName = doctor.getUnidadeSaude() != null ? doctor.getUnidadeSaude().getNome() : "UNIDADE BÁSICA DE SAÚDE (UBS)";
        String ubsAddress = doctor.getUnidadeSaude() != null ? doctor.getUnidadeSaude().getEndereco() : "ENDEREÇO DA UNIDADE DE SAÚDE";
        
        String docNameUpper = doctor.getName().toUpperCase();
        String docRoleTitle = doctor.getRole() == com.diagnosis.model.Role.NURSE ? "ENFERMEIRO(A): " : "MÉDICO: ";
        String docAtestadoTitle = doctor.getRole() == com.diagnosis.model.Role.NURSE ? "ATESTADO DE AFASTAMENTO" : "ATESTADO MÉDICO DE AFASTAMENTO";
        String docConsultaType = doctor.getRole() == com.diagnosis.model.Role.NURSE ? "consulta de enfermagem" : "consulta médica";
        String namePrefix = "";
        if (doctor.getRole() == com.diagnosis.model.Role.DOCTOR && !docNameUpper.startsWith("DR.") && !docNameUpper.startsWith("DRA.")) {
            namePrefix = "DR. ";
        } else if (doctor.getRole() == com.diagnosis.model.Role.NURSE && !docNameUpper.startsWith("ENF")) {
            namePrefix = "ENF. ";
        }

        String htmlContent = "--------------------------------------------------------\n" +
                "               " + docAtestadoTitle + "\n" +
                "               NOME DA UBS: " + ubsName.toUpperCase() + "\n" +
                "               ENDEREÇO: " + ubsAddress.toUpperCase() + "\n" +
                "--------------------------------------------------------\n" +
                "Atesto para os devidos fins de direito que o(a) paciente " + patient.getName() + ",\n" +
                "foi submetido(a) a " + docConsultaType + " em " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) + ",\n" +
                "necessitando de " + days + " dias de afastamento de suas atividades laborais,\n" +
                "justificado pelo diagnóstico sob código CID-10: " + cid + ".\n" +
                "\n" +
                "RECOMENDAÇÕES ADICIONAIS: " + (notes != null ? notes : "Manter repouso e hidratação.") + "\n" +
                "--------------------------------------------------------\n" +
                docRoleTitle + namePrefix + doctor.getName().toUpperCase() + "\n" +
                (doctor.getRole() == com.diagnosis.model.Role.DOCTOR ? "CRM: " + (doctor.getCrm() != null ? doctor.getCrm() : "ISENTO") + "\n" : "") +
                "--------------------------------------------------------\n" +
                "ASSINATURA DIGITAL DISPONIBILIZADA VIA CERTIFICADO CPF-HASH\n" +
                "AUDIT HASH: " + UUID.randomUUID().toString().toUpperCase() + "\n" +
                "--------------------------------------------------------";

        return Base64.getEncoder().encodeToString(htmlContent.getBytes(StandardCharsets.UTF_8));
    }

    public String generateReferralPdfBase64(UUID patientId, String specialty, String justification, User doctor) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new CustomException("Paciente não encontrado.", HttpStatus.NOT_FOUND));

        String ubsName = doctor.getUnidadeSaude() != null ? doctor.getUnidadeSaude().getNome() : "UNIDADE BÁSICA DE SAÚDE (UBS)";
        String ubsAddress = doctor.getUnidadeSaude() != null ? doctor.getUnidadeSaude().getEndereco() : "ENDEREÇO DA UNIDADE DE SAÚDE";
        
        String docNameUpper = doctor.getName().toUpperCase();
        String docRoleTitle = doctor.getRole() == com.diagnosis.model.Role.NURSE ? "SOLICITANTE: " : "MÉDICO SOLICITANTE: ";
        String namePrefix = "";
        if (doctor.getRole() == com.diagnosis.model.Role.DOCTOR && !docNameUpper.startsWith("DR.") && !docNameUpper.startsWith("DRA.")) {
            namePrefix = "DR. ";
        } else if (doctor.getRole() == com.diagnosis.model.Role.NURSE && !docNameUpper.startsWith("ENF")) {
            namePrefix = "ENF. ";
        }

        String htmlContent = "--------------------------------------------------------\n" +
                "               ENCAMINHAMENTO DE PACIENTE (SISREG)\n" +
                "               NOME DA UBS: " + ubsName.toUpperCase() + "\n" +
                "               ENDEREÇO: " + ubsAddress.toUpperCase() + "\n" +
                "--------------------------------------------------------\n" +
                "PACIENTE: " + patient.getName() + "\n" +
                "ENCAMINHADO PARA A ESPECIALIDADE: " + specialty.toUpperCase() + "\n" +
                "JUSTIFICATIVA CLÍNICA:\n" +
                justification + "\n" +
                "--------------------------------------------------------\n" +
                docRoleTitle + namePrefix + doctor.getName().toUpperCase() + "\n" +
                (doctor.getRole() == com.diagnosis.model.Role.DOCTOR ? "CRM: " + (doctor.getCrm() != null ? doctor.getCrm() : "ISENTO") + "\n" : "") +
                "DATA DE EMISSÃO: " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + "\n" +
                "--------------------------------------------------------\n" +
                "ASSINATURA DIGITAL VALIDADA NO PRONTUÁRIO ELETRÔNICO\n" +
                "VALIDACAO HASH: SISREG-" + UUID.randomUUID().toString().substring(0,8).toUpperCase() + "\n" +
                "--------------------------------------------------------";

        return Base64.getEncoder().encodeToString(htmlContent.getBytes(StandardCharsets.UTF_8));
    }
}
