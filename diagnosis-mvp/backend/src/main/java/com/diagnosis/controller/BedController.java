package com.diagnosis.controller;

import com.diagnosis.exception.CustomException;
import com.diagnosis.model.Bed;
import com.diagnosis.model.Patient;
import com.diagnosis.repository.BedRepository;
import com.diagnosis.repository.PatientRepository;
import com.diagnosis.service.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/beds")
@RequiredArgsConstructor
@Tag(name = "Módulo Controle de Leitos", description = "Monitoramento de ocupação de leitos clínicos da UBS")
public class BedController {

    private final BedRepository bedRepository;
    private final PatientRepository patientRepository;
    private final AuditService auditService;

    @GetMapping
    @Transactional(readOnly = true)
    @Operation(summary = "Obter grid de leitos")
    public ResponseEntity<List<Bed>> getBeds() {
        auditService.bindDatabaseUser();
        return ResponseEntity.ok(bedRepository.findAll());
    }

    @PostMapping
    @Transactional
    @Operation(summary = "Criar novo leito", description = "Cria um novo leito clínico com número, ala e status inicial. Apenas ADMIN.")
    public ResponseEntity<Bed> createBed(
            @RequestBody Map<String, String> body,
            HttpServletRequest httpServletRequest
    ) {
        auditService.bindDatabaseUser();

        String bedNumber = body.get("bedNumber");
        String ward = body.get("ward");

        if (bedNumber == null || bedNumber.trim().isEmpty()) {
            throw new CustomException("Número do leito é obrigatório.", HttpStatus.BAD_REQUEST);
        }
        if (ward == null || ward.trim().isEmpty()) {
            throw new CustomException("Ala/tipo do leito é obrigatório.", HttpStatus.BAD_REQUEST);
        }

        // Verifica duplicata
        List<Bed> existing = bedRepository.findAll();
        boolean duplicate = existing.stream()
                .anyMatch(b -> b.getBedNumber().equalsIgnoreCase(bedNumber.trim()));
        if (duplicate) {
            throw new CustomException("Já existe um leito com o número '" + bedNumber + "'.", HttpStatus.CONFLICT);
        }

        String status = body.getOrDefault("status", "AVAILABLE").toUpperCase();
        if (!status.equals("AVAILABLE") && !status.equals("MAINTENANCE")) {
            status = "AVAILABLE";
        }

        Bed bed = Bed.builder()
                .bedNumber(bedNumber.trim().toUpperCase())
                .ward(ward.trim())
                .status(status)
                .build();

        Bed saved = bedRepository.save(bed);
        auditService.logAccess(null, "CRIACAO_LEITO: " + saved.getBedNumber() + " - " + saved.getWard(), httpServletRequest.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/search-patient")
    @Transactional(readOnly = true)
    @Operation(summary = "Buscar paciente por nome ou CPF para seleção no leito")
    public ResponseEntity<List<Patient>> searchPatient(@RequestParam String q) {
        auditService.bindDatabaseUser();
        if (q == null || q.trim().length() < 2) {
            return ResponseEntity.ok(List.of());
        }
        String query = q.trim().toLowerCase();
        List<Patient> all = patientRepository.findAll();
        List<Patient> filtered = all.stream()
                .filter(p -> (p.getName() != null && p.getName().toLowerCase().contains(query))
                        || (p.getCpfHash() != null && p.getCpfHash().toLowerCase().contains(query)))
                .limit(10)
                .toList();
        return ResponseEntity.ok(filtered);
    }

    @PutMapping("/{id}/occupy")
    @Transactional
    @Operation(summary = "Ocupar leito com paciente")
    public ResponseEntity<Bed> occupyBed(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            HttpServletRequest httpServletRequest
    ) {
        auditService.bindDatabaseUser();
        UUID patientId = UUID.fromString(body.get("patientId"));

        Bed bed = bedRepository.findById(id)
                .orElseThrow(() -> new CustomException("Leito não encontrado.", HttpStatus.NOT_FOUND));

        if (!bed.getStatus().equalsIgnoreCase("AVAILABLE")) {
            throw new CustomException("O leito não está disponível para internação.", HttpStatus.BAD_REQUEST);
        }

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new CustomException("Paciente não encontrado.", HttpStatus.NOT_FOUND));

        bed.setStatus("OCCUPIED");
        bed.setPatient(patient);
        Bed saved = bedRepository.save(bed);

        auditService.logAccess(patientId, "INTERNACAO_PACIENTE_LEITO: " + bed.getBedNumber(), httpServletRequest.getRemoteAddr());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}/maintenance")
    @Transactional
    @Operation(summary = "Alternar status de manutenção do leito")
    public ResponseEntity<Bed> toggleMaintenance(
            @PathVariable UUID id,
            HttpServletRequest httpServletRequest
    ) {
        auditService.bindDatabaseUser();

        Bed bed = bedRepository.findById(id)
                .orElseThrow(() -> new CustomException("Leito não encontrado.", HttpStatus.NOT_FOUND));

        if (bed.getStatus().equals("OCCUPIED")) {
            throw new CustomException("Não é possível colocar em manutenção um leito ocupado.", HttpStatus.BAD_REQUEST);
        }

        String newStatus = bed.getStatus().equals("MAINTENANCE") ? "AVAILABLE" : "MAINTENANCE";
        bed.setStatus(newStatus);
        Bed saved = bedRepository.save(bed);

        auditService.logAccess(null, "STATUS_LEITO_" + newStatus + ": " + bed.getBedNumber(), httpServletRequest.getRemoteAddr());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}/discharge")
    @Transactional
    @Operation(summary = "Dar alta do leito")
    public ResponseEntity<Bed> dischargeBed(
            @PathVariable UUID id,
            HttpServletRequest httpServletRequest
    ) {
        auditService.bindDatabaseUser();

        Bed bed = bedRepository.findById(id)
                .orElseThrow(() -> new CustomException("Leito não encontrado.", HttpStatus.NOT_FOUND));

        Patient patient = bed.getPatient();
        UUID patientId = patient != null ? patient.getId() : null;

        bed.setStatus("AVAILABLE");
        bed.setPatient(null);
        Bed saved = bedRepository.save(bed);

        if (patientId != null) {
            auditService.logAccess(patientId, "ALTA_MEDICA_LEITO: " + bed.getBedNumber(), httpServletRequest.getRemoteAddr());
        }

        return ResponseEntity.ok(saved);
    }
}
