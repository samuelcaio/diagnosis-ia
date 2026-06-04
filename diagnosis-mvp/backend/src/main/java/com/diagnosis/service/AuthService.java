package com.diagnosis.service;

import com.diagnosis.dto.AuthResponse;
import com.diagnosis.dto.LoginRequest;
import com.diagnosis.exception.CustomException;
import com.diagnosis.model.User;
import com.diagnosis.repository.UserRepository;
import com.diagnosis.security.JwtService;
import com.diagnosis.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthResponse login(LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );

            UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
            String token = jwtService.generateToken(principal);
            String refreshToken = jwtService.generateRefreshToken(principal);

            return AuthResponse.builder()
                    .token(token)
                    .refreshToken(refreshToken)
                    .role(principal.getUser().getRole().name())
                    .name(principal.getUser().getName())
                    .email(principal.getUser().getEmail())
                    .crm(principal.getUser().getCrm())
                    .build();
        } catch (Exception e) {
            throw new CustomException("Credenciais inválidas. E-mail ou senha incorretos.", HttpStatus.UNAUTHORIZED);
        }
    }

    public AuthResponse refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.trim().isEmpty()) {
            throw new CustomException("Refresh token inválido.", HttpStatus.BAD_REQUEST);
        }

        if (!jwtService.isRefreshTokenValid(refreshToken)) {
            throw new CustomException("Refresh token expirado ou inválido.", HttpStatus.UNAUTHORIZED);
        }

        String email = jwtService.extractUsername(refreshToken);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException("Usuário não encontrado.", HttpStatus.NOT_FOUND));

        UserPrincipal principal = new UserPrincipal(user);
        String token = jwtService.generateToken(principal);
        String newRefreshToken = jwtService.generateRefreshToken(principal);

        return AuthResponse.builder()
                .token(token)
                .refreshToken(newRefreshToken)
                .role(user.getRole().name())
                .name(user.getName())
                .email(user.getEmail())
                .crm(user.getCrm())
                .build();
    }
}
