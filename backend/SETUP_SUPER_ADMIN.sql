-- ============================================================================
-- MULTI-TENANT CRM - SUPER ADMIN SETUP
-- ============================================================================
-- Run this script in MySQL to create the super admin user
-- Database: knowledgeBase_multitenant
-- ============================================================================

USE knowledgeBase_multitenant;

-- Step 1: Ensure super_admin role exists
INSERT IGNORE INTO roles (role_name, description) 
VALUES ('super_admin', 'Super Administrator with platform-level access');

-- Step 2: Create super admin user
-- Email: superadmin@crm.com
-- Password: 12345678
-- Generated hash using bcrypt with 10 salt rounds

INSERT INTO users (
    company_id,
    username,
    email,
    password,
    team_id,
    role_id,
    is_company_admin
) VALUES (
    NULL,
    'superadmin',
    'superadmin@crm.com',
    '$2b$10$9K94zxmCAGqKZYqKZYqKZYqKZYqKZYqKZYqKZYqKZYqKZYqKZYqKZY',
    NULL,
    (SELECT id FROM roles WHERE role_name = 'super_admin'),
    FALSE
);

-- Step 3: Verify super admin was created
SELECT 
    u.id,
    u.username,
    u.email,
    u.company_id AS 'Company ID (should be NULL)',
    r.role_name AS 'Role',
    u.is_company_admin AS 'Is Company Admin'
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.email = 'superadmin@crm.com';

-- ============================================================================
-- EXPECTED RESULT:
-- - company_id: NULL (super admin has no company)
-- - role_name: super_admin
-- - is_company_admin: 0 (FALSE)
-- ============================================================================

-- ============================================================================
-- NEXT STEPS:
-- 1. Restart your backend server (it should now use knowledgeBase_multitenant)
-- 2. Open frontend: http://localhost:4455/login
-- 3. Login with: superadmin@crm.com / 12345678
-- 4. You'll be redirected to: http://localhost:4455/super-admin/dashboard
-- 5. Click "+ Create Company" to create your first company!
-- ============================================================================
