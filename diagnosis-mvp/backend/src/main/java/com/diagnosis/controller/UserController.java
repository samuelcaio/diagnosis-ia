package com.diagnosis.controller;

import com.diagnosis.dto.RegisterUserRequest;
import com.diagnosis.exception.CustomException;
import com.diagnosis.model.Role;
import com.diagnosis.model.User;
import com.diagnosis.repository.UserRepository;
import com.diagnosis.service.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@Tag(name = "Módulo Usuários - Admin", description = "Cadastro e listagem de usuários de diversos setores (ADMIN, DOCTOR, NURSE, RECEPTIONIST)")
public class UserController {

    private final UserRepository userRepository;
    private final com.diagnosis.repository.MunicipioRepository municipioRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final com.diagnosis.repository.UnidadeSaudeRepository unidadeSaudeRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Transactional(readOnly = true)
    @Operation(summary = "Listar todos os usuários (Apenas Administrador)", description = "Retorna todos os profissionais e funcionários de saúde cadastrados.")
    public ResponseEntity<List<User>> getAllUsers() {
        auditService.bindDatabaseUser();
        return ResponseEntity.ok(userRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Transactional
    @Operation(summary = "Cadastrar novo usuário (Apenas Administrador)", description = "Cadastra um profissional de saúde ou funcionário administrativo no sistema com criptografia de senha.")
    public ResponseEntity<User> registerUser(@Valid @RequestBody RegisterUserRequest request) {
        auditService.bindDatabaseUser();

        // Verifica se o e-mail já existe
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new CustomException("E-mail já cadastrado no sistema.", HttpStatus.BAD_REQUEST);
        }

        // Converte a Role String para o Enum correspondente
        Role role;
        try {
            role = Role.valueOf(request.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new CustomException("Papel/Setor inválido. Valores aceitos: ADMIN, DOCTOR, NURSE, RECEPTIONIST.", HttpStatus.BAD_REQUEST);
        }
        
        com.diagnosis.model.Municipio municipio = null;
        if (request.getMunicipioId() != null) {
            municipio = municipioRepository.findById(request.getMunicipioId()).orElse(null);
        }

        com.diagnosis.model.UnidadeSaude unidadeSaude = null;
        if (request.getUnidadeSaudeId() != null) {
            unidadeSaude = unidadeSaudeRepository.findById(request.getUnidadeSaudeId()).orElse(null);
        }

        // Cria o usuário com a senha criptografada
        User newUser = User.builder()
                .municipio(municipio)
                .unidadeSaude(unidadeSaude)
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .crm(role == Role.DOCTOR ? request.getCrm() : null)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        User saved = userRepository.save(newUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }
}
