package com.diagnosis.controller;

import com.diagnosis.dto.AuthResponse;
import com.diagnosis.dto.LoginRequest;
import com.diagnosis.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Módulo Autenticação", description = "Autenticação JWT, Login e Refresh Token")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Realizar login clínico", description = "Efetua a validação do CRM/E-mail do profissional de saúde e retorna o token JWT.")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Renovar token de acesso", description = "Fornece um novo JWT utilizando o token de atualização.")
    public ResponseEntity<AuthResponse> refresh(@RequestBody Map<String, String> body) {
        String refreshToken = body.get("refreshToken");
        return ResponseEntity.ok(authService.refresh(refreshToken));
    }

    @PostMapping("/logout")
    @Operation(summary = "Encerrar sessão clínica", description = "Realiza o deslogamento do usuário no frontend.")
    public ResponseEntity<Map<String, String>> logout() {
        return ResponseEntity.ok(Map.of("message", "Sessão encerrada com sucesso."));
    }

    @GetMapping("/debug-users")
    public ResponseEntity<Map<String, Object>> debugUsers(@org.springframework.beans.factory.annotation.Autowired com.diagnosis.repository.UserRepository userRepository) {
        java.util.Optional<com.diagnosis.model.User> superadmin = userRepository.findByEmail("superadmin@diagnosis.com");
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("superadmin_exists", superadmin.isPresent());
        if (superadmin.isPresent()) {
            response.put("password_hash_length", superadmin.get().getPassword().length());
            response.put("password_hash_prefix", superadmin.get().getPassword().substring(0, 10));
            response.put("role", superadmin.get().getRole());
            response.put("municipio_id", superadmin.get().getMunicipio() != null ? superadmin.get().getMunicipio().getId() : null);
        }
        return ResponseEntity.ok(response);
    }
}
