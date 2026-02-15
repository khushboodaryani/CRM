import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';

const debugLogin = async () => {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'Ayan@1012',
            database: 'knowledgeBase_multitenant'
        });

        console.log('Fetching super admin user...\n');

        const [users] = await connection.query(
            `SELECT u.*, r.role_name 
             FROM users u 
             JOIN roles r ON u.role_id = r.id 
             WHERE u.email = ?`,
            ['superadmin@crm.com']
        );

        if (users.length === 0) {
            console.log('❌ User not found!');
            await connection.end();
            process.exit(1);
        }

        const user = users[0];
        console.log('User Details:');
        console.log('- ID:', user.id);
        console.log('- Username:', user.username);
        console.log('- Email:', user.email);
        console.log('- Company ID:', user.company_id);
        console.log('- Role ID:', user.role_id);
        console.log('- Role Name:', user.role_name);
        console.log('- Password Hash:', user.password);
        console.log('');

        // Test password comparison
        const testPassword = '12345678';
        console.log('Testing password:', testPassword);

        const isMatch = await bcrypt.compare(testPassword, user.password);

        console.log('');
        if (isMatch) {
            console.log('✅ PASSWORD MATCHES!');
            console.log('The password hash is correct.');
            console.log('');
            console.log('The issue might be:');
            console.log('1. Login endpoint not handling super_admin role correctly');
            console.log('2. Missing permissions for super_admin');
            console.log('3. Frontend routing issue');
        } else {
            console.log('❌ PASSWORD DOES NOT MATCH!');
            console.log('');
            console.log('Generating fresh hash...');
            const newHash = await bcrypt.hash(testPassword, 10);
            console.log('');
            console.log('Run this SQL:');
            console.log(`UPDATE users SET password = '${newHash}' WHERE email = 'superadmin@crm.com';`);
        }

        // Check permissions
        console.log('');
        console.log('Checking permissions...');
        const [permissions] = await connection.query(
            `SELECT p.permission_name, up.value
             FROM user_permissions up
             JOIN permissions p ON up.permission_id = p.id
             WHERE up.user_id = ?`,
            [user.id]
        );

        if (permissions.length === 0) {
            console.log('⚠️  NO PERMISSIONS ASSIGNED!');
            console.log('This might cause login issues.');
        } else {
            console.log('Permissions:', permissions.length);
            permissions.forEach(p => {
                console.log(`  - ${p.permission_name}: ${p.value ? 'YES' : 'NO'}`);
            });
        }

        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

debugLogin();
