-- 002_rls_policies.sql
-- Habilitação e Configuração do Row Level Security (RLS) no PostgreSQL/Supabase

-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE triage ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE immunizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- Funções auxiliares para recuperar o contexto do usuário (enviado pelo Backend Java ou Supabase JWT)
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS VARCHAR AS $$
BEGIN
    RETURN COALESCE(
        NULLIF(current_setting('app.current_user_role', true), ''),
        'GUEST'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS VARCHAR AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_id', true), '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Políticas para USERS
CREATE POLICY admin_all_users ON users 
    FOR ALL 
    USING (get_current_user_role() = 'ADMIN');

CREATE POLICY self_read_users ON users 
    FOR SELECT 
    USING (id::text = get_current_user_id() OR get_current_user_role() IN ('DOCTOR', 'NURSE', 'RECEPTIONIST'));

-- 2. Políticas para PATIENTS
CREATE POLICY admin_doctor_all_patients ON patients 
    FOR ALL 
    USING (get_current_user_role() IN ('ADMIN', 'DOCTOR'));

CREATE POLICY nurse_receptionist_write_patients ON patients 
    FOR ALL 
    USING (get_current_user_role() IN ('NURSE', 'RECEPTIONIST'));

-- 3. Políticas para CONSENTS
CREATE POLICY doctor_nurse_admin_consents ON consents 
    FOR ALL 
    USING (get_current_user_role() IN ('ADMIN', 'DOCTOR', 'NURSE'));

CREATE POLICY receptionist_insert_consents ON consents 
    FOR INSERT 
    WITH CHECK (get_current_user_role() = 'RECEPTIONIST');

-- 4. Políticas para APPOINTMENTS
CREATE POLICY admin_receptionist_doctor_appointments ON appointments 
    FOR ALL 
    USING (get_current_user_role() IN ('ADMIN', 'RECEPTIONIST', 'DOCTOR'));

CREATE POLICY nurse_read_appointments ON appointments 
    FOR SELECT 
    USING (get_current_user_role() = 'NURSE');

-- 5. Políticas para TRIAGE
CREATE POLICY admin_nurse_triage ON triage 
    FOR ALL 
    USING (get_current_user_role() IN ('ADMIN', 'NURSE'));

CREATE POLICY doctor_read_triage ON triage 
    FOR SELECT 
    USING (get_current_user_role() = 'DOCTOR');

-- 6. Políticas para MEDICAL_RECORDS (PEP)
CREATE POLICY doctor_admin_all_records ON medical_records 
    FOR ALL 
    USING (get_current_user_role() IN ('ADMIN', 'DOCTOR'));

CREATE POLICY nurse_write_evolution_records ON medical_records 
    FOR INSERT 
    WITH CHECK (get_current_user_role() = 'NURSE' AND record_type = 'EVOLUTION');

CREATE POLICY nurse_read_records ON medical_records 
    FOR SELECT 
    USING (get_current_user_role() = 'NURSE');

-- 7. Políticas para CONDITIONS (CID-10)
CREATE POLICY doctor_admin_all_conditions ON conditions 
    FOR ALL 
    USING (get_current_user_role() IN ('ADMIN', 'DOCTOR'));

CREATE POLICY nurse_read_conditions ON conditions 
    FOR SELECT 
    USING (get_current_user_role() = 'NURSE');

-- 8. Políticas para OBSERVATIONS (Exames)
CREATE POLICY doctor_admin_all_observations ON observations 
    FOR ALL 
    USING (get_current_user_role() IN ('ADMIN', 'DOCTOR'));

CREATE POLICY nurse_all_observations ON observations 
    FOR SELECT 
    USING (get_current_user_role() = 'NURSE');

-- 9. Políticas para MEDICATION_REQUESTS (Prescrições)
CREATE POLICY doctor_admin_all_medications ON medication_requests 
    FOR ALL 
    USING (get_current_user_role() IN ('ADMIN', 'DOCTOR'));

CREATE POLICY nurse_read_medications ON medication_requests 
    FOR SELECT 
    USING (get_current_user_role() = 'NURSE');

-- 10. Políticas para ALLERGIES
CREATE POLICY doctor_admin_all_allergies ON allergies 
    FOR ALL 
    USING (get_current_user_role() IN ('ADMIN', 'DOCTOR'));

CREATE POLICY nurse_read_allergies ON allergies 
    FOR SELECT 
    USING (get_current_user_role() = 'NURSE');

-- 11. Políticas para IMMUNIZATIONS
CREATE POLICY doctor_admin_nurse_all_immunizations ON immunizations 
    FOR ALL 
    USING (get_current_user_role() IN ('ADMIN', 'DOCTOR', 'NURSE'));

-- 12. Políticas para REFERRALS (Encaminhamentos)
CREATE POLICY doctor_admin_all_referrals ON referrals 
    FOR ALL 
    USING (get_current_user_role() IN ('ADMIN', 'DOCTOR'));

CREATE POLICY nurse_read_referrals ON referrals 
    FOR SELECT 
    USING (get_current_user_role() = 'NURSE');

-- 13. Políticas para BEDS (Leitos)
CREATE POLICY all_users_read_beds ON beds 
    FOR SELECT 
    USING (get_current_user_role() IN ('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'));

CREATE POLICY nurse_doctor_admin_write_beds ON beds 
    FOR UPDATE 
    USING (get_current_user_role() IN ('ADMIN', 'DOCTOR', 'NURSE'));

-- 14. Políticas para ACCESS_LOGS
CREATE POLICY anyone_insert_logs ON access_logs 
    FOR INSERT 
    WITH CHECK (TRUE); -- Permitido qualquer insert para registro de auditoria

CREATE POLICY admin_read_logs ON access_logs 
    FOR SELECT 
    USING (get_current_user_role() = 'ADMIN');
