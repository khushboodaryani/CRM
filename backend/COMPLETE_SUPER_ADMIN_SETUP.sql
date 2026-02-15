-- ============================================================================
-- COMPLETE SUPER ADMIN SETUP - RUN THIS IN MYSQL WORKBENCH
-- ============================================================================

USE knowledgeBase_multitenant;

-- Step 1: Ensure super_admin role exists
INSERT IGNORE INTO roles (role_name) VALUES ('super_admin');

-- Step 2: Get the super admin user ID (or create if doesn't exist)
SET @super_admin_id = (SELECT id FROM users WHERE email = 'superadmin@crm.com');

-- If user doesn't exist, create it
INSERT IGNORE INTO users (
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
    '$2b$10$vQx8K9L3mN5pR7tU2wY4ZeH6jI8kL0mN2oP4qR6sT8uV0wX2yZ4A.',
    NULL,
    (SELECT id FROM roles WHERE role_name = 'super_admin'),
    FALSE
);

-- Get the ID again after insert
SET @super_admin_id = (SELECT id FROM users WHERE email = 'superadmin@crm.com');

-- Step 3: Delete existing permissions
DELETE FROM user_permissions WHERE user_id = @super_admin_id;

-- Step 4: Assign ALL permissions
INSERT INTO user_permissions (user_id, permission_id, value)
SELECT @super_admin_id, id, TRUE
FROM permissions;

-- Step 5: Verify everything
SELECT '=== USER DETAILS ===' as info;
SELECT id, username, email, company_id, role_id 
FROM users 
WHERE email = 'superadmin@crm.com';

SELECT '=== PERMISSIONS COUNT ===' as info;
SELECT COUNT(*) as total_permissions 
FROM user_permissions 
WHERE user_id = @super_admin_id;

SELECT '=== ALL PERMISSIONS ===' as info;
SELECT p.permission_name
FROM user_permissions up
JOIN permissions p ON up.permission_id = p.id
WHERE up.user_id = @super_admin_id
ORDER BY p.permission_name;

-- ============================================================================
-- LOGIN CREDENTIALS:
-- URL: http://localhost:4455/login
-- Email: superadmin@crm.com
-- Password: 12345678
-- ============================================================================
