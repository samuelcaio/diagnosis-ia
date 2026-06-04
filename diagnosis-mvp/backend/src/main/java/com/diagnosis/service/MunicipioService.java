package com.diagnosis.service;

import com.diagnosis.dto.MunicipioDto;
import com.diagnosis.model.Municipio;
import com.diagnosis.repository.MunicipioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MunicipioService {

    private final MunicipioRepository municipioRepository;

    @Transactional(readOnly = true)
    public List<MunicipioDto> findAll() {
        return municipioRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MunicipioDto findById(UUID id) {
        return municipioRepository.findById(id)
                .map(this::mapToDto)
                .orElseThrow(() -> new RuntimeException("Município não encontrado"));
    }

    @Transactional
    public MunicipioDto update(UUID id, MunicipioDto dto) {
        Municipio municipio = municipioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Município não encontrado"));

        if (dto.getNomeMunicipio() != null) municipio.setNomeMunicipio(dto.getNomeMunicipio());
        if (dto.getEstado() != null) municipio.setEstado(dto.getEstado());
        if (dto.getCodigoIbge() != null) municipio.setCodigoIbge(dto.getCodigoIbge());
        if (dto.getCnesPrincipal() != null) municipio.setCnesPrincipal(dto.getCnesPrincipal());
        if (dto.getNomeSecretaria() != null) municipio.setNomeSecretaria(dto.getNomeSecretaria());
        if (dto.getLogoUrl() != null) municipio.setLogoUrl(dto.getLogoUrl());
        if (dto.getCorPrimaria() != null) municipio.setCorPrimaria(dto.getCorPrimaria());
        if (dto.getStatus() != null) municipio.setStatus(dto.getStatus());

        return mapToDto(municipioRepository.save(municipio));
    }

    private MunicipioDto mapToDto(Municipio municipio) {
        MunicipioDto dto = new MunicipioDto();
        dto.setId(municipio.getId());
        dto.setNomeMunicipio(municipio.getNomeMunicipio());
        dto.setEstado(municipio.getEstado());
        dto.setCodigoIbge(municipio.getCodigoIbge());
        dto.setCnesPrincipal(municipio.getCnesPrincipal());
        dto.setNomeSecretaria(municipio.getNomeSecretaria());
        dto.setLogoUrl(municipio.getLogoUrl());
        dto.setCorPrimaria(municipio.getCorPrimaria());
        dto.setStatus(municipio.getStatus());
        return dto;
    }
}
