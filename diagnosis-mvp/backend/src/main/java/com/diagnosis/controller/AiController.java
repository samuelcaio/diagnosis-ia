package com.diagnosis.controller;

import com.diagnosis.dto.AlertResult;
import com.diagnosis.service.AiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
@Tag(name = "Módulo Inteligência Artificial", description = "Motor de apoio diagnóstico e análise de risco explicável (Fatores, Condutas)")
public class AiController {

    private final AiService aiService;

    @PostMapping("/analyze")
    @Operation(summary = "Realizar análise diagnóstica de IA", description = "Executa o motor de regras com base no perfil, CID-10 e exames do paciente. Retorna probabilidade, fatores contribuintes explicados em português e conduta clínica recomendada.")
    public ResponseEntity<AlertResult> analyze(
            @RequestBody Map<String, Object> body,
            HttpServletRequest httpServletRequest
    ) {
        UUID patientId = UUID.fromString((String) body.get("patientId"));
        String mode = (String) body.getOrDefault("mode", "USADA");
        String rawText = (String) body.getOrDefault("rawText", "");
        
        // Novos campos estruturados
        String queixaPrincipal = (String) body.get("queixaPrincipal");
        Map<String, String> questionarioDinamico = (Map<String, String>) body.get("questionarioDinamico");
        List<String> sintomasAssociados = (List<String>) body.get("sintomasAssociados");
        List<String> fatoresDeRiscoSelecionados = (List<String>) body.get("fatoresDeRiscoSelecionados");
        String observacaoComplementar = (String) body.get("observacaoComplementar");

        String ipAddress = httpServletRequest.getRemoteAddr();
        return ResponseEntity.ok(aiService.analyze(patientId, ipAddress, mode, rawText, 
                queixaPrincipal, questionarioDinamico, sintomasAssociados, fatoresDeRiscoSelecionados, observacaoComplementar));
    }
}
