-- seed.sql
-- Dados iniciais para demonstração do MVP Diagnosis

-- Hashing para senha123: $2a$10$vN0vF.pB1GZ9yq4fS6d9eO3gIomWqGqK3J.T/6b3M.sB5UjW7R22e (BCrypt)

-- 1. Inserir usuários padrão
INSERT INTO users (id, email, password_hash, role, name, crm) VALUES
('b271d471-a477-4b71-9f22-111111111111', 'admin@clinica.com.br', '$2a$10$vN0vF.pB1GZ9yq4fS6d9eO3gIomWqGqK3J.T/6b3M.sB5UjW7R22e', 'ADMIN', 'Administrador Diagnosis', NULL),
('c482e582-b588-4c82-af33-222222222222', 'medico@clinica.com.br', '$2a$10$vN0vF.pB1GZ9yq4fS6d9eO3gIomWqGqK3J.T/6b3M.sB5UjW7R22e', 'DOCTOR', 'Dr. Carlos Oliveira', 'CRM/SP 123456'),
('d593f693-c699-4d93-bf44-333333333333', 'enfermeira@clinica.com.br', '$2a$10$vN0vF.pB1GZ9yq4fS6d9eO3gIomWqGqK3J.T/6b3M.sB5UjW7R22e', 'NURSE', 'Enfª. Mariana Sousa', NULL),
('e604a704-d700-4e04-cf55-444444444444', 'recepcao@clinica.com.br', '$2a$10$vN0vF.pB1GZ9yq4fS6d9eO3gIomWqGqK3J.T/6b3M.sB5UjW7R22e', 'RECEPTIONIST', 'Juliana Mendes', NULL);

-- 2. Inserir leitos iniciais (Ala A - Clínica Médica, Ala B - Observação)
INSERT INTO beds (id, bed_number, ward, status) VALUES
('f715b815-e811-4f15-df66-555555555551', 'Leito 101', 'Ala A - Clínica Médica', 'AVAILABLE'),
('f715b815-e811-4f15-df66-555555555552', 'Leito 102', 'Ala A - Clínica Médica', 'AVAILABLE'),
('f715b815-e811-4f15-df66-555555555553', 'Leito 103', 'Ala A - Clínica Médica', 'MAINTENANCE'),
('f715b815-e811-4f15-df66-555555555554', 'Leito 201', 'Ala B - Observação', 'AVAILABLE'),
('f715b815-e811-4f15-df66-555555555555', 'Leito 202', 'Ala B - Observação', 'AVAILABLE');

-- 3. Inserir paciente João da Silva (Alta probabilidade de infarto na IA)
-- CPF: 123.456.789-01 (Hash SHA-256 do CPF plano "12345678901": a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3)
INSERT INTO patients (id, name, cpf_hash, birth_date, gender, address, phone) VALUES
('a111a111-a111-a111-a111-a111a111a111', 'João da Silva', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', '1965-04-12', 'MASCULINO', 'Rua das Flores, 123, Bairro Centro, São Paulo - SP', '(11) 98765-4321');

-- 4. Inserir termos de consentimento para João da Silva
INSERT INTO consents (id, patient_id, term_version, ip_address, signature_hash) VALUES
('b222b222-b222-b222-b222-b222b222b222', 'a111a111-a111-a111-a111-a111a111a111', 'v1.2-2026', '192.168.1.50', 'hash_assinatura_digital_consentimento_simulado_joao');

-- 5. Condições médicas para João da Silva (Diabetes CID E10 + Hipertensão CID I10)
INSERT INTO conditions (id, patient_id, cid_code, name, status) VALUES
('c333c333-c333-c333-c333-c333c333c333', 'a111a111-a111-a111-a111-a111a111a111', 'E10', 'Diabetes Mellitus Insulino-Dependente', 'ACTIVE'),
('c333c333-c333-c333-c333-c333c333c334', 'a111a111-a111-a111-a111-a111a111a111', 'I10', 'Hipertensão Essencial (Primária)', 'ACTIVE');

-- 6. Observações clínicas para João da Silva (Dor no peito e glicemia)
INSERT INTO observations (id, patient_id, code, name, value, unit, reference_range) VALUES
('d444d444-d444-d444-d444-d444d444d444', 'a111a111-a111-a111-a111-a111a111a111', 'CHEST_PAIN', 'Dor no Peito', 'SIM', NULL, NULL),
('d444d444-d444-d444-d444-d444d444d445', 'a111a111-a111-a111-a111-a111a111a111', 'GLUCOSE', 'Glicemia de Jejum', '145', 'mg/dL', '70 a 99 mg/dL');

-- 7. Alergia
INSERT INTO allergies (id, patient_id, allergen, severity, status) VALUES
('e555e555-e555-e555-e555-e555e555e555', 'a111a111-a111-a111-a111-a111a111a111', 'Penicilina', 'HIGH', 'ACTIVE');

-- 8. Vacinação
INSERT INTO immunizations (id, patient_id, vaccine_name, dose_number, batch, manufacturer, applied_at) VALUES
('f666f666-f666-f666-f666-f666f666f666', 'a111a111-a111-a111-a111-a111a111a111', 'COVID-19 Bivalente', 'Dose Única', 'FD8765', 'Pfizer', '2025-05-10');

-- 9. Agendamento ativo para João da Silva hoje
INSERT INTO appointments (id, patient_id, scheduled_for, status, checklist_completed, checklist_data) VALUES
('11111111-1111-1111-1111-111111111111', 'a111a111-a111-a111-a111-a111a111a111', NOW(), 'WAITING', TRUE, '{"febre": false, "tosse": false, "dor_cabeca": true, "dor_peito": true, "contato_covid": false}');
