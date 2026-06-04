package com.diagnosis;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class DiagnosisApplication {
    public static void main(String[] args) {
        SpringApplication.run(DiagnosisApplication.class, args);
    }
}
