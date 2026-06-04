package com.diagnosis.controller;

import com.diagnosis.dto.MunicipioDto;
import com.diagnosis.service.MunicipioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/municipios")
@RequiredArgsConstructor
public class MunicipioController {

    private final MunicipioService municipioService;

    @GetMapping
    public ResponseEntity<List<MunicipioDto>> getAll() {
        return ResponseEntity.ok(municipioService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MunicipioDto> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(municipioService.findById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    public ResponseEntity<MunicipioDto> update(@PathVariable UUID id, @RequestBody MunicipioDto dto) {
        return ResponseEntity.ok(municipioService.update(id, dto));
    }
}
