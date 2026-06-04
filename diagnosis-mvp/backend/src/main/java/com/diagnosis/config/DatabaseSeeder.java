package com.diagnosis.config;

import com.diagnosis.model.Municipio;
import com.diagnosis.model.Role;
import com.diagnosis.model.User;
import com.diagnosis.repository.UserRepository;
import com.diagnosis.repository.MunicipioRepository;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final MunicipioRepository municipioRepository;
    private final PasswordEncoder passwordEncoder;
    private final EntityManager entityManager;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        UUID defaultMunicipioId = UUID.fromString("11111111-2222-3333-4444-555555555555");
        try {
            entityManager.createNativeQuery("INSERT INTO municipios (id, nome_municipio, estado, status, cor_primaria, nome_secretaria, created_at, updated_at) VALUES (:id, 'Município Padrão (Editável)', 'SP', 'ATIVO', '#2C6E9C', 'Secretaria Municipal de Saúde', NOW(), NOW()) ON CONFLICT DO NOTHING")
                    .setParameter("id", defaultMunicipioId)
                    .executeUpdate();
        } catch (Exception e) {
            // Ignore constraints
        }
        
        Municipio defaultMunicipio = municipioRepository.findById(defaultMunicipioId).orElse(null);
        if (defaultMunicipio == null) {
            defaultMunicipio = Municipio.builder().id(defaultMunicipioId).build();
        }

        // Migração manual dos dados antigos deve ser feita via SQL script 
        // para não quebrar a transação com tabelas inexistentes.

        seedUser(
                UUID.fromString("b271d471-a477-4b71-9f22-111111111111"),
                "admin@clinica.com.br",
                "senha123",
                Role.ADMIN,
                "Administrador Diagnosis",
                null,
                defaultMunicipio
        );

        seedUser(
                UUID.fromString("c482e582-b588-4c82-af33-222222222222"),
                "medico@clinica.com.br",
                "senha123",
                Role.DOCTOR,
                "Dr. Carlos Oliveira",
                "CRM/SP 123456",
                defaultMunicipio
        );

        seedUser(
                UUID.fromString("d593f693-c699-4d93-bf44-333333333333"),
                "enfermeira@clinica.com.br",
                "senha123",
                Role.NURSE,
                "Enfª. Mariana Sousa",
                null,
                defaultMunicipio
        );

        seedUser(
                UUID.fromString("e604a704-d700-4e04-cf55-444444444444"),
                "recepcao@clinica.com.br",
                "senha123",
                Role.RECEPTIONIST,
                "Juliana Mendes",
                null,
                defaultMunicipio
        );

        seedUser(
                UUID.fromString("99999999-9999-9999-9999-999999999999"),
                "superadmin@diagnosis.com",
                "senha123",
                Role.SUPER_ADMIN,
                "Gestor Diagnosis",
                null,
                defaultMunicipio
        );
    }

    private void seedUser(UUID id, String email, String plainPassword, Role role, String name, String crm, Municipio municipio) {
        Optional<User> existingUser = userRepository.findByEmail(email);
        
        if (existingUser.isPresent()) {
            // Se o usuário já existe, apenas atualizamos a senha com o hash correto para garantir o login
            User user = existingUser.get();
            user.setPassword(passwordEncoder.encode(plainPassword));
            user.setName(name);
            user.setRole(role);
            user.setCrm(crm);
            user.setMunicipio(municipio);
            userRepository.save(user);
        } else {
            // Se não existe, cria um novo
            User user = User.builder()
                    .id(id)
                    .email(email)
                    .password(passwordEncoder.encode(plainPassword))
                    .role(role)
                    .name(name)
                    .crm(crm)
                    .municipio(municipio)
                    .build();
            userRepository.save(user);
        }
    }
}
