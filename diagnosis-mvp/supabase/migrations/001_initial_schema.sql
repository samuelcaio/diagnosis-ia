-- 001_initial_schema.sql
-- Banco de Dados para a Plataforma Diagnosis IA

-- Extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST')),
    name VARCHAR(255) NOT NULL,
    crm VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. patients
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cpf_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 hash do CPF para LGPD
    birth_date DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,
    address VARCHAR(500),
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. consents
CREATE TABLE consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    term_version VARCHAR(50) NOT NULL,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(45) NOT NULL,
    signature_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. appointments
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    checklist_completed BOOLEAN DEFAULT FALSE,
    checklist_data JSONB, -- Checklist pré-atendimento respondido
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. triage
CREATE TABLE triage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    heart_rate INTEGER,
    blood_pressure VARCHAR(20),
    temperature NUMERIC(4,2),
    respiratory_rate INTEGER,
    oxygen_saturation INTEGER,
    pain_scale INTEGER CHECK (pain_scale BETWEEN 0 AND 10),
    risk_classification VARCHAR(50) NOT NULL CHECK (risk_classification IN ('RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE')), -- Classificação Manchester
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. medical_records (PEP)
CREATE TABLE medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    record_type VARCHAR(50) NOT NULL CHECK (record_type IN ('EVOLUTION', 'EXAM', 'PRESCRIPTION', 'REFERRAL', 'IMMUNIZATION')),
    title VARCHAR(255),
    content JSONB NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id),
    author_name VARCHAR(255) NOT NULL,
    author_crm VARCHAR(20),
    signed BOOLEAN DEFAULT FALSE,
    signature_hash VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. conditions (CID-10)
CREATE TABLE conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    cid_code VARCHAR(10) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESOLVED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. observations (Exames Laboratoriais, Valores)
CREATE TABLE observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL, -- Ex: CHEST_PAIN, GLUCOSE, CHOLESTEROL
    name VARCHAR(255) NOT NULL,
    value VARCHAR(255) NOT NULL,
    unit VARCHAR(50),
    reference_range VARCHAR(255),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. medication_requests (Prescrições, Dosagem)
CREATE TABLE medication_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration VARCHAR(100),
    route VARCHAR(50), -- Ex: ORAL, INTRAVENOSA
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. allergies
CREATE TABLE allergies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    allergen VARCHAR(255) NOT NULL,
    severity VARCHAR(50) CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. immunizations
CREATE TABLE immunizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    vaccine_name VARCHAR(255) NOT NULL,
    dose_number VARCHAR(20),
    batch VARCHAR(50),
    manufacturer VARCHAR(255),
    applied_at DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. referrals
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    specialty VARCHAR(255) NOT NULL,
    justification TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'COMPLETED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. beds
CREATE TABLE beds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bed_number VARCHAR(20) UNIQUE NOT NULL,
    ward VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE')),
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. access_logs (Logs imutáveis - LGPD)
CREATE TABLE access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices estratégicos para performance
CREATE INDEX idx_patients_cpf ON patients(cpf_hash);
CREATE INDEX idx_appointments_scheduled_for ON appointments(scheduled_for);
CREATE INDEX idx_triage_appointment_id ON triage(appointment_id);
CREATE INDEX idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX idx_conditions_patient_id ON conditions(patient_id);
CREATE INDEX idx_observations_patient_id ON observations(patient_id);
CREATE INDEX idx_medication_requests_patient_id ON medication_requests(patient_id);
CREATE INDEX idx_access_logs_patient_id ON access_logs(patient_id);

-- Gatilho de Imutabilidade nos logs de acesso (Somente INSERT é permitido)
CREATE OR REPLACE FUNCTION prevent_update_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Registros de auditoria são imutáveis. Operações de UPDATE ou DELETE são proibidas.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_immutable_access_logs
BEFORE UPDATE OR DELETE ON access_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_update_delete();
