// Generate bcrypt hash for password
// Run: node generate_super_admin_hash.js

import bcrypt from 'bcrypt';

const password = '12345678';
const saltRounds = 10;

bcrypt.hash(password, saltRounds)
    .then(hash => {
        console.log('\n=== SUPER ADMIN CREDENTIALS ===');
        console.log('Email: superadmin@crm.com');
        console.log('Password: 12345678');
        console.log('\n=== BCRYPT HASH ===');
        console.log(hash);
        console.log('\n=== SQL TO CREATE SUPER ADMIN ===');
        console.log(`
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
        `);
        console.log('\n=== COPY THE SQL ABOVE AND RUN IT IN YOUR DATABASE ===\n');
        process.exit(0);
    })
    .catch(err => {
        console.error('Error generating hash:', err);
        process.exit(1);
    });
