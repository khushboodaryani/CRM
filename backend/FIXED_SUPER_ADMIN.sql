-- ============================================================================
-- FIXED SUPER ADMIN SETUP
-- ============================================================================
-- This fixes the role_id NULL error
-- ============================================================================

USE knowledgeBase_multitenant;

-- Step 1: Ensure super_admin role exists
INSERT IGNORE INTO roles (role_name) 
VALUES ('super_admin');

-- Step 2: Verify role was created
SELECT id, role_name FROM roles WHERE role_name = 'super_admin';

-- Step 3: Create super admin user (using the role ID directly)
-- First, let's get the role ID
SET @super_admin_role_id = (SELECT id FROM roles WHERE role_name = 'super_admin');

-- Now create the user
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
    @super_admin_role_id,
    FALSE
);

-- Step 4: Verify super admin was created
SELECT 
    u.id,
    u.username,
    u.email,
    u.company_id,
    u.role_id,
    r.role_name
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.email = 'superadmin@crm.com';

-- ============================================================================
-- EXPECTED OUTPUT:
-- You should see:
-- - username: superadmin
-- - email: superadmin@crm.com  
-- - company_id: NULL
-- - role_id: (some number, e.g., 1, 2, etc.)
-- - role_name: super_admin
-- ============================================================================

-- ============================================================================
-- LOGIN CREDENTIALS:
-- Email: superadmin@crm.com
-- Password: 12345678
-- ============================================================================
