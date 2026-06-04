package com.diagnosis.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProtocolRule {

    private String id;
    private String name;
    private String cid;
    private String category;
    private Integer minScore;
    private Map<String, Integer> symptoms;
    private VitalCriteria vitalCriteria;
    private String conduct;
    private List<String> exams;
    private List<String> contraindications;
    // New standardized fields
    private String identification; // UUID
    private String specialty;      // e.g., Cardiologia
    private String bodySystem;     // e.g., Cardiovascular
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VitalCriteria {
        private Double systolicBPMin;
        private Double diastolicBPMin;
        private Double temperatureMin;
        private Double saturationMax;
        private Double saturationMin;
        private Double heartRateMin;
        private Double heartRateMax;
    }
}
