DO $$ 
DECLARE 
    r RECORD; 
BEGIN 
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP 
        EXECUTE 'ALTER TABLE ' || r.tablename || ' ADD COLUMN IF NOT EXISTS municipio_id UUID'; 
    END LOOP; 
END $$;
