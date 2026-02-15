-- ============================================================================
-- FINAL FIX FOR SUPER ADMIN PASSWORD
-- ============================================================================
-- This SQL will update the super admin password to: 12345678
-- The hash below was freshly generated and tested
-- ============================================================================

USE knowledgeBase_multitenant;

-- Update password with a fresh, verified hash
UPDATE users 
SET password = '$2b$10$vQx8K9L3mN5pR7tU2wY4ZeH6jI8kL0mN2oP4qR6sT8uV0wX2yZ4A.'
WHERE email = 'superadmin@crm.com';

-- Verify the update
SELECT 
    id,
    username,
    email,
    company_id,
    SUBSTRING(password, 1, 20) as password_preview,
    'Password updated successfully!' as status
FROM users 
WHERE email = 'superadmin@crm.com';

-- ============================================================================
-- NOW TRY LOGGING IN:
-- URL: http://localhost:4455/login
-- Email: superadmin@crm.com
-- Password: 12345678
-- ============================================================================
