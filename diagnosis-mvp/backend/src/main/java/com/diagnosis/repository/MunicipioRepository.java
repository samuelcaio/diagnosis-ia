package com.diagnosis.repository;

import com.diagnosis.model.Municipio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface MunicipioRepository extends JpaRepository<Municipio, UUID> {
}
