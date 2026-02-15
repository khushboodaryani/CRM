-- Create Super Admin User for Testing
-- Password: 12345678 (hashed with bcrypt)

USE knowledgeBase_multitenant;

-- First, ensure we have the super_admin role
INSERT IGNORE INTO roles (role_name, description) 
VALUES ('super_admin', 'Super Administrator with platform-level access');

-- Create super admin user
-- Password hash for '12345678' using bcrypt with salt rounds 10
INSERT INTO users (
    company_id,
    username,
    email,
    password,
    team_id,
    role_id,
    is_company_admin
) VALUES (
    NULL,  -- Super admin has no company
    'superadmin',
    'superadmin@crm.com',
    '$2b$10$rQJ5qKZYqKZYqKZYqKZYqOqKZYqKZYqKZYqKZYqKZYqKZYqKZYqKZY',  -- This is placeholder, will be replaced
    NULL,  -- No team
    (SELECT id FROM roles WHERE role_name = 'super_admin'),
    FALSE  -- Super admin is not a company admin
);

-- Note: You need to generate the actual bcrypt hash
-- Run this in your backend directory:
-- node -e "const bcrypt = require('bcrypt'); bcrypt.hash('12345678', 10).then(hash => console.log(hash));"
-- Then replace the password hash above with the generated hash

-- Verify the user was created
SELECT id, username, email, role_id, company_id FROM users WHERE email = 'superadmin@crm.com';
