-- Quick Setup Script for Multi-Tenant CRM
-- Run this entire script in MySQL Workbench or command line

USE knowledgeBase_multitenant;

-- Step 1: Ensure super_admin role exists
INSERT IGNORE INTO roles (role_name, description) 
VALUES ('super_admin', 'Super Administrator with platform-level access');

-- Step 2: Generate hash and create super admin
-- Run this command in terminal first:
-- cd C:\Users\DELL\Desktop\crm\backend
-- node generate_super_admin_hash.js

-- The output will give you the INSERT statement with the hashed password
-- Copy and paste it here, or run the commands below after generating the hash

-- Example (replace the hash with your generated one):
-- INSERT INTO users (
--     company_id,
--     username,
--     email,
--     password,
--     team_id,
--     role_id,
--     is_company_admin
-- ) VALUES (
--     NULL,
--     'superadmin',
--     'superadmin@crm.com',
--     '$2b$10$YOUR_GENERATED_HASH_HERE',
--     NULL,
--     (SELECT id FROM roles WHERE role_name = 'super_admin'),
--     FALSE
-- );

-- Step 3: Verify super admin created
SELECT 
    u.id,
    u.username,
    u.email,
    u.company_id,
    r.role_name,
    u.is_company_admin
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.email = 'superadmin@crm.com';

-- Expected result:
-- company_id should be NULL
-- role_name should be 'super_admin'
-- is_company_admin should be 0 (FALSE)
