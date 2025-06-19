-- Verify Dorothy Robinson's encounter data insertion
SELECT 
    'Encounter' as table_name,
    COUNT(*) as count 
FROM encounters 
WHERE id = 'cf909cae-2c0b-4dd4-8c49-e4b7dfef62f8'::uuid

UNION ALL

SELECT 
    'Conditions' as table_name,
    COUNT(*) as count 
FROM conditions 
WHERE encounter_id = 'cf909cae-2c0b-4dd4-8c49-e4b7dfef62f8'::uuid

UNION ALL

SELECT 
    'Differential diagnoses' as table_name,
    COUNT(*) as count 
FROM differential_diagnoses 
WHERE encounter_id = 'cf909cae-2c0b-4dd4-8c49-e4b7dfef62f8'::uuid

UNION ALL



SELECT 
    'Lab results' as table_name,
    COUNT(*) as count 
FROM lab_results 
WHERE encounter_id = 'cf909cae-2c0b-4dd4-8c49-e4b7dfef62f8'::uuid

UNION ALL

SELECT 
    'Alerts' as table_name,
    COUNT(*) as count 
FROM alerts 
WHERE encounter_id = 'cf909cae-2c0b-4dd4-8c49-e4b7dfef62f8'::uuid

UNION ALL

-- Also check the patient exists
SELECT 'Patient Dorothy Robinson' as table_name, COUNT(*) as count 
FROM patients 
WHERE id = '0681FA35-A794-4684-97BD-00B88370DB41'::uuid; 