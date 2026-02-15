import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';

const testLogin = async () => {
    try {
        // Connect to database
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'Ayan@1012',
            database: 'knowledgeBase_multitenant'
        });

        console.log('✅ Connected to database\n');

        // Get user
        const [users] = await connection.query(
            'SELECT id, username, email, password FROM users WHERE email = ?',
            ['superadmin@crm.com']
        );

        if (users.length === 0) {
            console.log('❌ User not found!');
            process.exit(1);
        }

        const user = users[0];
        console.log('User found:');
        console.log('- ID:', user.id);
        console.log('- Username:', user.username);
        console.log('- Email:', user.email);
        console.log('- Password hash:', user.password);
        console.log('');

        // Test password
        const testPassword = '12345678';
        console.log('Testing password:', testPassword);

        const isMatch = await bcrypt.compare(testPassword, user.password);

        if (isMatch) {
            console.log('✅ Password matches! Login should work.');
        } else {
            console.log('❌ Password does NOT match!');
            console.log('');
            console.log('Generating new hash...');
            const newHash = await bcrypt.hash(testPassword, 10);
            console.log('New hash:', newHash);
            console.log('');
            console.log('Run this SQL:');
            console.log(`UPDATE users SET password = '${newHash}' WHERE email = 'superadmin@crm.com';`);
        }

        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

testLogin();
