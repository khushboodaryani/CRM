import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';

const testSuperAdminLogin = async () => {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'Ayan@1012',
            database: 'knowledgeBase_multitenant'
        });

        console.log('Testing Super Admin Login...\n');

        // Get user with role
        const [users] = await connection.query(
            `SELECT u.*, r.role_name 
             FROM users u 
             JOIN roles r ON u.role_id = r.id 
             WHERE u.email = ?`,
            ['superadmin@crm.com']
        );

        if (users.length === 0) {
            console.log('❌ User NOT FOUND in database!');
            console.log('You need to run CREATE_SUPER_ADMIN_FINAL.sql first.');
            await connection.end();
            process.exit(1);
        }

        const user = users[0];
        console.log('✅ User found in database:');
        console.log('  - ID:', user.id);
        console.log('  - Username:', user.username);
        console.log('  - Email:', user.email);
        console.log('  - Company ID:', user.company_id);
        console.log('  - Role ID:', user.role_id);
        console.log('  - Role Name:', user.role_name);
        console.log('  - Is Active:', user.is_active);
        console.log('  - Password Hash:', user.password);
        console.log('');

        // Test password
        const testPassword = '12345678';
        const isMatch = await bcrypt.compare(testPassword, user.password);

        if (isMatch) {
            console.log('✅ PASSWORD MATCHES!');
        } else {
            console.log('❌ PASSWORD DOES NOT MATCH!');
            console.log('The hash in the database is wrong.');
        }
        console.log('');

        // Check permissions
        const [permissions] = await connection.query(
            `SELECT COUNT(*) as count
             FROM user_permissions up
             WHERE up.user_id = ? AND up.value = TRUE`,
            [user.id]
        );

        console.log('Permissions:', permissions[0].count);
        if (permissions[0].count === 0) {
            console.log('❌ NO PERMISSIONS! This will cause login to fail.');
        } else {
            console.log('✅ Has permissions');
        }
        console.log('');

        // Check if role exists
        const [roles] = await connection.query(
            `SELECT id, role_name FROM roles WHERE role_name = 'super_admin'`
        );

        if (roles.length === 0) {
            console.log('❌ super_admin role does NOT exist!');
        } else {
            console.log('✅ super_admin role exists (ID:', roles[0].id + ')');
        }
        console.log('');

        console.log('='.repeat(60));
        if (isMatch && permissions[0].count > 0 && user.is_active) {
            console.log('✅ LOGIN SHOULD WORK!');
            console.log('If it still fails, check browser console for errors.');
        } else {
            console.log('❌ LOGIN WILL FAIL because:');
            if (!isMatch) console.log('  - Password hash is wrong');
            if (permissions[0].count === 0) console.log('  - No permissions assigned');
            if (!user.is_active) console.log('  - User is not active');
        }
        console.log('='.repeat(60));

        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

testSuperAdminLogin();
