package com.diagnosis.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportDashboardResponse {
    private long totalPatients;
    private long pendingAppointments;
    private long highRiskAlertsCount;
    private long totalTriagesToday;
    private Map<String, Integer> avgWaitingTimeMinutes; // Manchester color -> waiting time
    private Map<String, Integer> doctorProductivity; // Doctor CRM/Name -> Appointments completed
}
