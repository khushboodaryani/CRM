import bcrypt from 'bcrypt';

// Generate hash and SQL in one go
const password = '12345678';

bcrypt.hash(password, 10).then(hash => {
    console.log('='.repeat(80));
    console.log('SUPER ADMIN PASSWORD UPDATE');
    console.log('='.repeat(80));
    console.log('');
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('');
    console.log('Copy and run this in MySQL Workbench:');
    console.log('');
    console.log('-'.repeat(80));
    console.log('USE knowledgeBase_multitenant;');
    console.log(`UPDATE users SET password = '${hash}' WHERE email = 'superadmin@crm.com';`);
    console.log('SELECT username, email, "Password updated!" as status FROM users WHERE email = \'superadmin@crm.com\';');
    console.log('-'.repeat(80));
    console.log('');
    console.log('Then login at: http://localhost:4455/login');
    console.log('Email: superadmin@crm.com');
    console.log('Password: 12345678');
    console.log('');
    console.log('='.repeat(80));
    process.exit(0);
});
