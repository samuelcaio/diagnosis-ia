DO $$ 
DECLARE 
    r RECORD; 
BEGIN 
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP 
        BEGIN
            EXECUTE 'UPDATE ' || r.tablename || ' SET municipio_id = ''11111111-2222-3333-4444-555555555555'' WHERE municipio_id IS NULL'; 
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors like column does not exist
        END;
    END LOOP; 
END $$;
