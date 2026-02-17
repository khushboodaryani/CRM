// src/controllers/users.js

import connectDB from '../db/index.js';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';

// Create a new user
export const createUser = async (req, res) => {
    console.log('Received user creation request:', req.body);

    const {
        username,
        email,
        team_id,
        role_type, // 'user' or 'team_leader'
        permissions
    } = req.body;

    // Get company_id from authenticated user (NOT from request body)
    const company_id = req.user.company_id;

    // Only Business Head or Super Admin can create users
    if (!['super_admin', 'business_head'].includes(req.user.role)) {
        return res.status(403).json({
            error: 'Only Business Head or Super Admin can create users'
        });
    }

    // Validate required fields
    if (!username || !email || !role_type) {
        console.log('Missing fields:', { username, email, role_type });
        return res.status(400).json({
            error: 'Missing required fields: username, email, and role_type are required',
            received: { username, email, role_type }
        });
    }

    // Validate team_id based on role_type
    if (!['business_head', 'mis'].includes(role_type) && !team_id) {
        console.log('Team ID required for non-business_head/mis roles');
        return res.status(400).json({
            error: 'Team ID is required for user and team_leader roles',
            received: { role_type, team_id }
        });
    }

    // For business_head and mis, team_id should be null
    if (['business_head', 'mis'].includes(role_type) && team_id) {
        console.log('Team ID should not be provided for business_head/mis role');
        return res.status(400).json({
            error: 'Business head and MIS roles should not be assigned to any team',
            received: { role_type, team_id }
        });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate role type
    if (!['user', 'team_leader', 'business_head', 'mis'].includes(role_type)) {
        return res.status(400).json({ error: 'Invalid role type. Must be either "user", "team_leader", "business_head", or "mis"' });
    }

    try {
        const pool = connectDB();
        const conn = await pool.getConnection();

        try {
            await conn.beginTransaction();

            // CRITICAL: Check license limit before creating user
            if (company_id) { // Skip for super_admin
                const [license] = await conn.query(
                    'SELECT available_licenses FROM company_licenses WHERE company_id = ?',
                    [company_id]
                );

                if (license.length === 0 || license[0].available_licenses <= 0) {
                    await conn.rollback();
                    return res.status(403).json({
                        error: 'License limit reached. Please contact administrator to upgrade.'
                    });
                }
            }

            // Check if user already exists (email must be globally unique)
            const [existingUser] = await conn.query(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );

            if (existingUser.length > 0) {
                await conn.rollback();
                return res.status(400).json({ error: 'Email already exists' });
            }

            // Check if username exists within the company
            const [existingUsername] = await conn.query(
                'SELECT * FROM users WHERE username = ? AND company_id = ?',
                [username, company_id]
            );

            if (existingUsername.length > 0) {
                await conn.rollback();
                return res.status(400).json({ error: 'Username already exists in your company' });
            }

            // Get role id
            const [roleResult] = await conn.query(
                'SELECT id FROM roles WHERE role_name = ?',
                [role_type]
            );

            if (roleResult.length === 0) {
                await conn.rollback();
                return res.status(400).json({ error: 'Invalid role type' });
            }

            // Use default password '12345678'
            const defaultPassword = '12345678';
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);

            // Create user with company_id
            const [userResult] = await conn.query(
                'INSERT INTO users (company_id, username, email, password, team_id, role_id) VALUES (?, ?, ?, ?, ?, ?)',
                [company_id, username, email, hashedPassword, ['business_head', 'mis'].includes(role_type) ? null : team_id, roleResult[0].id]
            );

            // License count will be automatically updated by trigger

            // Handle permissions
            if (permissions) {
                const userId = userResult.insertId;

                // First delete any existing permissions for this user
                await conn.query('DELETE FROM user_permissions WHERE user_id = ?', [userId]);

                // Get all permission IDs
                const [permissionRows] = await conn.query('SELECT id, permission_name FROM permissions');

                // Insert each permission individually to better handle errors
                for (const [permName, value] of Object.entries(permissions)) {
                    const permission = permissionRows.find(p => p.permission_name === permName);
                    if (permission) {
                        await conn.query(
                            'INSERT INTO user_permissions (user_id, permission_id, value) VALUES (?, ?, ?)',
                            [userId, permission.id, value ? 1 : 0]
                        );
                    }
                }
            }

            // Send welcome email
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                }
            });

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Welcome to Digital Flow',
                html: `
                    <h2>Welcome ${username}!</h2>
                    <p>Your account has been created successfully.</p>
                    <p>You can now login to your account using your email and the default password: <strong>12345678</strong></p>
                    <p>Please change your password after your first login.</p>
                    <a href="${process.env.FRONTEND_URL}/login" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Login Now</a>
                    <p>Best regards,<br>Digital Flow Team</p>
                `
            };

            await transporter.sendMail(mailOptions);
            await conn.commit();

            res.status(201).json({
                message: 'User created successfully. Welcome email has been sent.',
                user_id: userResult.insertId
            });

        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }

    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get all users with their teams and permissions
export const getAllUsers = async (req, res) => {
    const pool = connectDB();
    let connection;
    try {
        connection = await pool.getConnection();

        // Base query to get user information
        let query = `
            SELECT u.id, u.username, u.email, u.company_id, u.team_id, t.team_name,
                   r.role_name as role, r.id as role_id,
                   GROUP_CONCAT(DISTINCT p.permission_name) as permissions
            FROM users u
            LEFT JOIN teams t ON u.team_id = t.id
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN user_permissions up ON u.id = up.user_id
            LEFT JOIN permissions p ON up.permission_id = p.id AND up.value = true
        `;

        const params = [];

        // CRITICAL: Add company-based filters
        if (req.user.role === 'super_admin') {
            // Super admin can see all users
            // No additional filter needed
        } else if (req.user.role === 'business_head') {
            // Business head sees only their company users
            query += ' WHERE u.company_id = ?';
            params.push(req.user.company_id);
        } else if (req.user.role === 'team_leader') {
            // Team leaders can only see their team members
            query += ' WHERE u.team_id = ? AND r.role_name = "user"';
            params.push(req.user.team_id);
        } else {
            // Regular users can't see any other users
            return res.status(403).json({ error: 'Access denied' });
        }

        // Group by and order
        query += ' GROUP BY u.id ORDER BY u.created_at DESC';

        // Execute query
        const [users] = await connection.query(query, params);

        // Format permissions as array for each user
        const formattedUsers = users.map(user => ({
            ...user,
            permissions: user.permissions ? user.permissions.split(',') : []
        }));

        res.json({
            success: true,
            data: formattedUsers
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

// Get team members for a specific team
export const getTeamMembers = async (req, res) => {
    const pool = connectDB();
    let connection;
    try {
        connection = await pool.getConnection();

        // Verify the requester has access to this team
        if (req.user.role === 'team_leader' && req.user.team_id !== parseInt(req.params.teamId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get team members
        const [users] = await connection.query(`
            SELECT u.id, u.username, u.email, u.team_id, t.team_name,
                   r.role_name as role, r.id as role_id,
                   GROUP_CONCAT(DISTINCT p.permission_name) as permissions
            FROM users u
            LEFT JOIN teams t ON u.team_id = t.id
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN user_permissions up ON u.id = up.user_id
            LEFT JOIN permissions p ON up.permission_id = p.id AND up.value = true
            WHERE u.team_id = ? AND r.role_name = 'user'
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `, [req.params.teamId]);

        // Format permissions as array for each user
        const formattedUsers = users.map(user => ({
            ...user,
            permissions: user.permissions ? user.permissions.split(',') : []
        }));

        res.json({
            success: true,
            data: formattedUsers
        });
    } catch (error) {
        console.error('Error fetching team members:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

// Update user
export const updateUser = async (req, res) => {
    console.log('=== UPDATE USER REQUEST ===');
    console.log('User ID:', req.params.userId);
    console.log('Request body:', req.body);
    console.log('Authenticated user:', req.user);

    const { userId } = req.params;
    const {
        username,
        email,
        team_id,
        role_type,
        permissions
    } = req.body;

    // Only Business Head or Super Admin can update users
    if (!['super_admin', 'business_head'].includes(req.user.role)) {
        console.log('Access denied - user role:', req.user.role);
        return res.status(403).json({
            error: 'Only Business Head or Super Admin can update users'
        });
    }

    // Validate required fields
    if (!username || !email || !role_type) {
        return res.status(400).json({
            error: 'Missing required fields: username, email, and role_type are required'
        });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate role type
    if (!['user', 'team_leader', 'business_head', 'mis'].includes(role_type)) {
        return res.status(400).json({ error: 'Invalid role type' });
    }

    try {
        console.log('Connecting to database...');
        const pool = connectDB();
        const conn = await pool.getConnection();
        console.log('Database connection established');

        try {
            await conn.beginTransaction();
            console.log('Transaction started');

            // Check if user exists and belongs to the same company
            console.log('Checking if user exists:', userId);
            const [existingUser] = await conn.query(
                'SELECT * FROM users WHERE id = ?',
                [userId]
            );
            console.log('Existing user found:', existingUser.length > 0);

            if (existingUser.length === 0) {
                console.log('User not found, rolling back');
                await conn.rollback();
                return res.status(404).json({ error: 'User not found' });
            }

            // Business Head can only edit users in their company
            if (req.user.role === 'business_head' && existingUser[0].company_id !== req.user.company_id) {
                await conn.rollback();
                return res.status(403).json({ error: 'You can only edit users in your company' });
            }

            // Check if email is already used by another user
            const [emailCheck] = await conn.query(
                'SELECT * FROM users WHERE email = ? AND id != ?',
                [email, userId]
            );

            if (emailCheck.length > 0) {
                await conn.rollback();
                return res.status(400).json({ error: 'Email already exists' });
            }

            // Check if username exists within the company (excluding current user)
            const [usernameCheck] = await conn.query(
                'SELECT * FROM users WHERE username = ? AND company_id = ? AND id != ?',
                [username, existingUser[0].company_id, userId]
            );

            if (usernameCheck.length > 0) {
                await conn.rollback();
                return res.status(400).json({ error: 'Username already exists in your company' });
            }

            // Get role id
            const [roleResult] = await conn.query(
                'SELECT id FROM roles WHERE role_name = ?',
                [role_type]
            );

            if (roleResult.length === 0) {
                await conn.rollback();
                return res.status(400).json({ error: 'Invalid role type' });
            }

            // Update user
            await conn.query(
                'UPDATE users SET username = ?, email = ?, team_id = ?, role_id = ? WHERE id = ?',
                [username, email, ['business_head', 'mis'].includes(role_type) ? null : team_id, roleResult[0].id, userId]
            );

            // Update permissions if provided
            if (permissions) {
                // Delete existing permissions
                await conn.query('DELETE FROM user_permissions WHERE user_id = ?', [userId]);

                // Get all permission IDs
                const [permissionRows] = await conn.query('SELECT id, permission_name FROM permissions');

                // Insert new permissions
                for (const [permName, value] of Object.entries(permissions)) {
                    const permission = permissionRows.find(p => p.permission_name === permName);
                    if (permission) {
                        await conn.query(
                            'INSERT INTO user_permissions (user_id, permission_id, value) VALUES (?, ?, ?)',
                            [userId, permission.id, value ? 1 : 0]
                        );
                    }
                }
            }

            await conn.commit();

            res.json({
                message: 'User updated successfully',
                user_id: userId
            });

        } catch (error) {
            console.error('Transaction error:', error);
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
            console.log('Database connection released');
        }

    } catch (error) {
        console.error('Error updating user:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
};

// Delete user
export const deleteUser = async (req, res) => {
    console.log('=== DELETE USER REQUEST ===');
    console.log('User ID to delete:', req.params.userId);
    console.log('Authenticated user:', req.user);

    const { userId } = req.params;

    // Only Business Head or Super Admin can delete users
    if (!['super_admin', 'business_head'].includes(req.user.role)) {
        console.log('Access denied - user role:', req.user.role);
        return res.status(403).json({
            error: 'Only Business Head or Super Admin can delete users'
        });
    }

    try {
        console.log('Connecting to database...');
        const pool = connectDB();
        const conn = await pool.getConnection();
        console.log('Database connection established');

        try {
            await conn.beginTransaction();
            console.log('Transaction started');

            // Check if user exists and belongs to the same company
            console.log('Checking if user exists:', userId);
            const [existingUser] = await conn.query(
                'SELECT * FROM users WHERE id = ?',
                [userId]
            );
            console.log('Existing user:', existingUser.length > 0 ? 'Found' : 'Not found');

            if (existingUser.length === 0) {
                console.log('User not found, rolling back');
                await conn.rollback();
                return res.status(404).json({ error: 'User not found' });
            }

            // Business Head can only delete users in their company
            if (req.user.role === 'business_head' && existingUser[0].company_id !== req.user.company_id) {
                await conn.rollback();
                return res.status(403).json({ error: 'You can only delete users in your company' });
            }

            // Prevent deleting super_admin
            const [userRole] = await conn.query(
                'SELECT r.role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
                [userId]
            );

            if (userRole.length > 0 && userRole[0].role_name === 'super_admin') {
                await conn.rollback();
                return res.status(403).json({ error: 'Cannot delete super admin' });
            }

            // Delete user permissions first (foreign key constraint)
            console.log('Deleting user permissions...');
            await conn.query('DELETE FROM user_permissions WHERE user_id = ?', [userId]);
            console.log('User permissions deleted');

            // Delete user sessions (check if table exists first)
            console.log('Deleting user sessions...');
            try {
                await conn.query('DELETE FROM user_sessions WHERE user_id = ?', [userId]);
                console.log('User sessions deleted');
            } catch (sessionError) {
                console.log('Note: user_sessions table may not exist or error:', sessionError.message);
                // Continue anyway - this is not critical
            }

            // Delete user
            console.log('Deleting user record...');
            await conn.query('DELETE FROM users WHERE id = ?', [userId]);
            console.log('User deleted successfully');

            // License count will be automatically updated by trigger

            await conn.commit();
            console.log('Transaction committed');

            res.json({
                message: 'User deleted successfully',
                user_id: userId
            });

        } catch (error) {
            console.error('Transaction error:', error);
            await conn.rollback();
            console.log('Transaction rolled back');
            throw error;
        } finally {
            conn.release();
            console.log('Database connection released');
        }

    } catch (error) {
        console.error('Error deleting user:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
};
