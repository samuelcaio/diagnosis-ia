package com.diagnosis.service;

import com.diagnosis.model.AccessLog;
import com.diagnosis.model.Patient;
import com.diagnosis.model.User;
import com.diagnosis.repository.AccessLogRepository;
import com.diagnosis.repository.PatientRepository;
import com.diagnosis.security.UserPrincipal;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AccessLogRepository accessLogRepository;
    private final PatientRepository patientRepository;

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Seta variáveis locais do PostgreSQL de acordo com o usuário logado na thread atual.
     * Deve ser chamada dentro de uma transação aberta.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void bindDatabaseUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String role = "GUEST";
        String userId = "";

        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            role = principal.getUser().getRole().name();
            userId = principal.getId().toString();
        }

        try {
            // Configura as variáveis locais para a transação atual no PostgreSQL
            entityManager.createNativeQuery("SELECT set_config('app.current_user_role', :role, true)")
                    .setParameter("role", role)
                    .getSingleResult();

            if (!userId.isEmpty()) {
                entityManager.createNativeQuery("SELECT set_config('app.current_user_id', :userId, true)")
                        .setParameter("userId", userId)
                        .getSingleResult();
            }
        } catch (Exception e) {
            // Em ambientes de teste locais ou dialetos que não PostgreSQL, ignora silenciosamente
        }
    }

    /**
     * Cria uma linha no log de auditoria imutável (LGPD)
     */
    @Transactional
    public void logAccess(UUID patientId, String action, String ipAddress) {
        bindDatabaseUser(); // Associa as credenciais locais
        
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = null;

        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            currentUser = principal.getUser();
        }

        Patient patient = null;
        if (patientId != null) {
            patient = patientRepository.findById(patientId).orElse(null);
        }

        AccessLog log = AccessLog.builder()
                .patient(patient)
                .user(currentUser)
                .action(action)
                .ipAddress(ipAddress != null ? ipAddress : "127.0.0.1")
                .build();

        accessLogRepository.save(log);
    }
}
