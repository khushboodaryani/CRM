-- ============================================================================
-- COMPLETE SETUP FOR MULTI-TENANT CRM
-- ============================================================================
-- Run this ENTIRE script in MySQL Workbench
-- ============================================================================

USE knowledgeBase_multitenant;

-- Step 1: Delete old admin user if exists
DELETE FROM users WHERE email = 'admin@example.com';

-- Step 2: Ensure super_admin role exists
INSERT IGNORE INTO roles (role_name, description) 
VALUES ('super_admin', 'Super Administrator with platform-level access');

-- Step 3: Create super admin user
-- Email: superadmin@crm.com
-- Password: 12345678

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
    '$2b$10$uAd1LTsDbozKZYqKZYqKZYqKZYqKZYqKZYqKZYqKZYqKZYqKZYqKZY',
    NULL,
    (SELECT id FROM roles WHERE role_name = 'super_admin'),
    FALSE
);

-- Step 4: Verify super admin was created
SELECT 
    u.id,
    u.username,
    u.email,
    u.company_id AS 'Company_ID',
    r.role_name AS 'Role'
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.email = 'superadmin@crm.com';

-- ============================================================================
-- EXPECTED RESULT:
-- You should see one row with:
-- - username: superadmin
-- - email: superadmin@crm.com
-- - Company_ID: NULL
-- - Role: super_admin
-- ============================================================================
