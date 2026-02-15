-- ============================================================================
-- SIMPLE SUPER ADMIN SETUP
-- ============================================================================
-- Run this in MySQL Workbench
-- Password: 12345678
-- ============================================================================

USE knowledgeBase_multitenant;

-- Delete existing super admin if any
DELETE FROM user_permissions WHERE user_id = (SELECT id FROM users WHERE email = 'superadmin@crm.com');
DELETE FROM users WHERE email = 'superadmin@crm.com';

-- Create super admin (replace HASH_HERE with output from: node hash.js)
INSERT INTO users (company_id, username, email, password, team_id, role_id, is_company_admin, is_active)
VALUES (
    NULL,
    'superadmin',
    'superadmin@crm.com',
    '$2b$10$LZByVn78qFrHx5A06inLmeVKNDTRAeSmAaqZzAcUjCP6rb0EX/Psa',
    NULL,
    (SELECT id FROM roles WHERE role_name = 'super_admin'),
    FALSE,
    TRUE
);

-- Assign all permissions
INSERT INTO user_permissions (user_id, permission_id, value)
SELECT 
    (SELECT id FROM users WHERE email = 'superadmin@crm.com'),
    id,
    TRUE
FROM permissions;

-- Verify
SELECT 'Super Admin Created' as status;
SELECT id, username, email, company_id FROM users WHERE email = 'superadmin@crm.com';
SELECT COUNT(*) as permissions FROM user_permissions WHERE user_id = (SELECT id FROM users WHERE email = 'superadmin@crm.com');

-- ============================================================================
-- INSTRUCTIONS:
-- 1. Run: node hash.js
-- 2. Copy the hash output
-- 3. Replace 'REPLACE_WITH_HASH_FROM_NODE_HASH_JS' above with the hash
-- 4. Run this SQL
-- 5. Login at http://localhost:4455/login
--    Email: superadmin@crm.com
--    Password: 12345678
-- ============================================================================
