package com.diagnosis.controller;

import com.diagnosis.model.UnidadeSaude;
import com.diagnosis.repository.UnidadeSaudeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/unidades-saude")
public class UnidadeSaudeController {

    @Autowired
    private UnidadeSaudeRepository repository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST')")
    public ResponseEntity<List<UnidadeSaude>> getAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<UnidadeSaude> create(@RequestBody UnidadeSaude unidadeSaude) {
        return ResponseEntity.ok(repository.save(unidadeSaude));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<UnidadeSaude> update(@PathVariable UUID id, @RequestBody UnidadeSaude unidadeSaudeData) {
        return repository.findById(id)
                .map(unidade -> {
                    unidade.setNome(unidadeSaudeData.getNome());
                    unidade.setEndereco(unidadeSaudeData.getEndereco());
                    unidade.setTipo(unidadeSaudeData.getTipo());
                    unidade.setStatus(unidadeSaudeData.getStatus());
                    return ResponseEntity.ok(repository.save(unidade));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        return repository.findById(id)
                .map(unidade -> {
                    repository.delete(unidade);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
