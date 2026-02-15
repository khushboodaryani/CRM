import bcrypt from 'bcrypt';

const password = '12345678';
const saltRounds = 10;

console.log('Generating password hash for super admin...\n');

bcrypt.hash(password, saltRounds)
    .then(hash => {
        console.log('✅ Hash generated successfully!\n');
        console.log('Password:', password);
        console.log('Hash:', hash);
        console.log('\n📋 Run this SQL in MySQL Workbench:\n');
        console.log('USE knowledgeBase_multitenant;');
        console.log(`UPDATE users SET password = '${hash}' WHERE email = 'superadmin@crm.com';`);
        console.log('SELECT username, email FROM users WHERE email = \'superadmin@crm.com\';');
        console.log('\n✅ Then login with:');
        console.log('Email: superadmin@crm.com');
        console.log('Password: 12345678\n');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
