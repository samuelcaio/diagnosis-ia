package com.diagnosis.controller;

import com.diagnosis.model.AccessLog;
import com.diagnosis.repository.AccessLogRepository;
import com.diagnosis.service.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/audit")
@RequiredArgsConstructor
@Tag(name = "Módulo de Auditoria - Admin", description = "Visualização de trilhas de acesso a dados sensíveis de pacientes (LGPD)")
public class AuditController {

    private final AccessLogRepository accessLogRepository;
    private final AuditService auditService;

    @GetMapping("/logs")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Transactional(readOnly = true)
    @Operation(summary = "Obter logs de auditoria imutáveis (Apenas Administrador)", description = "Retorna o histórico completo de visualizações de dados sensíveis de pacientes por data decrescente.")
    public ResponseEntity<List<AccessLog>> getAuditLogs() {
        auditService.bindDatabaseUser();
        return ResponseEntity.ok(accessLogRepository.findAllByOrderByCreatedAtDesc());
    }
}
