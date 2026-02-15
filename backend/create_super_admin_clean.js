import bcrypt from 'bcrypt';
import fs from 'fs';

const password = '12345678';
const saltRounds = 10;

console.log('Generating super admin setup SQL...\n');

bcrypt.hash(password, saltRounds)
    .then(hash => {
        const sql = `-- ============================================================================
-- MULTI-TENANT CRM - SUPER ADMIN SETUP
-- ============================================================================
-- Run this script in MySQL Workbench after running schema_multitenant.sql
-- Database: knowledgeBase_multitenant
-- ============================================================================

USE knowledgeBase_multitenant;

-- Step 1: Ensure super_admin role exists
INSERT IGNORE INTO roles (role_name, description) 
VALUES ('super_admin', 'Super Administrator with platform-level access');

-- Step 2: Create super admin user
-- Email: superadmin@crm.com
-- Password: 12345678
-- Hash generated: ${new Date().toISOString()}

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
    '${hash}',
    NULL,
    (SELECT id FROM roles WHERE role_name = 'super_admin'),
    FALSE
);

-- Step 3: Verify super admin was created
SELECT 
    u.id,
    u.username,
    u.email,
    u.company_id AS 'Company_ID_Should_Be_NULL',
    r.role_name AS 'Role',
    u.is_company_admin AS 'Is_Company_Admin'
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.email = 'superadmin@crm.com';

-- ============================================================================
-- EXPECTED RESULT:
-- - Company_ID_Should_Be_NULL: NULL (super admin has no company)
-- - Role: super_admin
-- - Is_Company_Admin: 0 (FALSE)
-- ============================================================================

-- ============================================================================
-- NEXT STEPS:
-- 1. Restart your backend server (Ctrl+C then: npm run dev)
-- 2. Open frontend: http://localhost:4455/login
-- 3. Login with: superadmin@crm.com / 12345678
-- 4. You'll be redirected to: http://localhost:4455/super-admin/dashboard
-- 5. Click "+ Create Company" to create your first company!
-- ============================================================================
`;

        // Write to file
        fs.writeFileSync('CREATE_SUPER_ADMIN.sql', sql);

        console.log('✅ SQL file created: CREATE_SUPER_ADMIN.sql');
        console.log('\n📋 SUPER ADMIN CREDENTIALS:');
        console.log('   Email: superadmin@crm.com');
        console.log('   Password: 12345678');
        console.log('\n🔧 NEXT STEPS:');
        console.log('   1. Open MySQL Workbench');
        console.log('   2. Run the file: CREATE_SUPER_ADMIN.sql');
        console.log('   3. Restart backend: npm run dev');
        console.log('   4. Test login at: http://localhost:4455/login\n');

        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error generating hash:', err);
        process.exit(1);
    });
