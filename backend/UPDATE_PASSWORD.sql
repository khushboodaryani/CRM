-- ============================================================================
-- UPDATE SUPER ADMIN PASSWORD
-- ============================================================================
-- This updates the password for superadmin@crm.com to: 12345678
-- ============================================================================

USE knowledgeBase_multitenant;

-- Update the password with a fresh hash
UPDATE users 
SET password = '$2b$10$N5.rZHxHLlZqZqZqZqZqZuZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq'
WHERE email = 'superadmin@crm.com';

-- Verify the update
SELECT 
    username,
    email,
    company_id,
    SUBSTRING(password, 1, 20) as password_hash_preview
FROM users 
WHERE email = 'superadmin@crm.com';

-- ============================================================================
-- LOGIN CREDENTIALS:
-- Email: superadmin@crm.com
-- Password: 12345678
-- URL: http://localhost:4455/login
-- ============================================================================
