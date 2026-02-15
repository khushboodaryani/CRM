-- ============================================================================
-- ASSIGN PERMISSIONS TO SUPER ADMIN
-- ============================================================================
-- The super admin has no permissions, which causes login to fail
-- This script assigns all permissions to the super admin
-- ============================================================================

USE knowledgeBase_multitenant;

-- Get the super admin user ID
SET @super_admin_id = (SELECT id FROM users WHERE email = 'superadmin@crm.com');

-- Delete any existing permissions (cleanup)
DELETE FROM user_permissions WHERE user_id = @super_admin_id;

-- Assign ALL permissions to super admin
INSERT INTO user_permissions (user_id, permission_id, value)
SELECT @super_admin_id, id, TRUE
FROM permissions;

-- Verify permissions were assigned
SELECT 
    u.username,
    u.email,
    COUNT(up.id) as total_permissions
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
WHERE u.email = 'superadmin@crm.com'
GROUP BY u.id, u.username, u.email;

-- Show all assigned permissions
SELECT 
    p.permission_name,
    up.value as enabled
FROM user_permissions up
JOIN permissions p ON up.permission_id = p.id
WHERE up.user_id = @super_admin_id
ORDER BY p.permission_name;

-- ============================================================================
-- NOW TRY LOGGING IN AGAIN:
-- URL: http://localhost:4455/login
-- Email: superadmin@crm.com
-- Password: 12345678
-- ============================================================================
