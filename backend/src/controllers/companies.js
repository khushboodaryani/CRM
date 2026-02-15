// src/controllers/companies.js
// Super Admin controller for managing companies (tenants)

import connectDB from '../db/index.js';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import { logger } from '../logger.js';

const SALT_ROUNDS = 10;

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

/**
 * Create a new company with Business Head
 * Only accessible by super_admin
 */
export const createCompany = async (req, res) => {
    const {
        company_name,
        company_email,
        company_username,
        license_limit,
        bh_username,
        bh_email
    } = req.body;

    // Validation
    if (!company_name || !company_email || !company_username || !license_limit || !bh_username || !bh_email) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: company_name, company_email, company_username, license_limit, bh_username, bh_email'
        });
    }

    if (license_limit < 1) {
        return res.status(400).json({
            success: false,
            message: 'License limit must be at least 1'
        });
    }

    let connection;
    try {
        const pool = connectDB();
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Check if company already exists
        const [existingCompany] = await connection.query(
            'SELECT id FROM companies WHERE company_name = ? OR company_email = ?',
            [company_name, company_email]
        );

        if (existingCompany.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Company name or email already exists'
            });
        }

        // Check if BH email already exists
        const [existingUser] = await connection.query(
            'SELECT id FROM users WHERE email = ?',
            [bh_email]
        );

        if (existingUser.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Business Head email already exists'
            });
        }

        // Create company
        const [companyResult] = await connection.query(
            `INSERT INTO companies (company_name, company_email, license_limit, created_by)
             VALUES (?, ?, ?, ?)`,
            [company_name, company_email, license_limit, req.user.userId]
        );

        const companyId = companyResult.insertId;

        // Initialize company license
        await connection.query(
            'INSERT INTO company_licenses (company_id, total_licenses, used_licenses) VALUES (?, ?, 0)',
            [companyId, license_limit]
        );

        // Get business_head role ID
        const [bhRole] = await connection.query(
            'SELECT id FROM roles WHERE role_name = ?',
            ['business_head']
        );

        // Create Business Head user with default password
        const defaultPassword = '12345678';
        const hashedPassword = await bcrypt.hash(defaultPassword, SALT_ROUNDS);

        const [bhResult] = await connection.query(
            `INSERT INTO users (company_id, username, email, password, role_id, is_company_admin)
             VALUES (?, ?, ?, ?, ?, true)`,
            [companyId, bh_username, bh_email, hashedPassword, bhRole[0].id]
        );

        // Assign all permissions to Business Head
        const [permissions] = await connection.query('SELECT id FROM permissions');

        for (const permission of permissions) {
            await connection.query(
                'INSERT INTO user_permissions (user_id, permission_id, value) VALUES (?, ?, true)',
                [bhResult.insertId, permission.id]
            );
        }

        // Send welcome email to Business Head
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: bh_email,
            subject: `Welcome to ${company_name} - CRM Access`,
            html: `
                <h2>Welcome to ${company_name}!</h2>
                <p>Your company has been registered in our CRM system.</p>
                <p><strong>Company Details:</strong></p>
                <ul>
                    <li>Company Name: ${company_name}</li>
                    <li>License Limit: ${license_limit} users</li>
                </ul>
                <p><strong>Your Login Credentials:</strong></p>
                <ul>
                    <li>Username: ${bh_username}</li>
                    <li>Email: ${bh_email}</li>
                    <li>Password: <strong>${defaultPassword}</strong></li>
                </ul>
                <p>Please change your password after your first login.</p>
                <a href="${process.env.FRONTEND_URL}/login" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Login Now</a>
                <p>Best regards,<br>CRM Admin Team</p>
            `
        };

        await transporter.sendMail(mailOptions);

        await connection.commit();

        logger.info(`Company created: ${company_name} (ID: ${companyId}) by user ${req.user.userId}`);

        res.status(201).json({
            success: true,
            message: 'Company and Business Head created successfully',
            data: {
                company_id: companyId,
                company_name,
                bh_username,
                license_limit
            }
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        logger.error('Error creating company:', error);
        res.status(500).json({
            success: false,
            message: ''
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Get all companies
 * Only accessible by super_admin
 */
export const getAllCompanies = async (req, res) => {
    let connection;
    try {
        const pool = connectDB();
        connection = await pool.getConnection();

        const [companies] = await connection.query(`
            SELECT 
                c.id,
                c.company_name,
                c.company_email,
                c.is_active,
                c.subscription_start,
                c.subscription_end,
                cl.total_licenses,
                cl.used_licenses,
                cl.available_licenses,
                (SELECT COUNT(*) FROM users WHERE company_id = c.id) as total_users,
                (SELECT COUNT(*) FROM customers WHERE company_id = c.id) as total_customers,
                (SELECT username FROM users WHERE company_id = c.id AND is_company_admin = true LIMIT 1) as bh_username,
                c.created_at
            FROM companies c
            LEFT JOIN company_licenses cl ON c.id = cl.company_id
            ORDER BY c.created_at DESC
        `);

        res.json({
            success: true,
            data: companies
        });

    } catch (error) {
        logger.error('Error fetching companies:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch companies'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Get single company details
 * Accessible by super_admin or company's business_head
 */
export const getCompanyById = async (req, res) => {
    const { id } = req.params;

    // Authorization check
    if (req.user.role !== 'super_admin' && req.user.company_id !== parseInt(id)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied'
        });
    }

    let connection;
    try {
        const pool = connectDB();
        connection = await pool.getConnection();

        const [companies] = await connection.query(`
            SELECT 
                c.*,
                cl.total_licenses,
                cl.used_licenses,
                cl.available_licenses,
                (SELECT COUNT(*) FROM users WHERE company_id = c.id) as total_users,
                (SELECT COUNT(*) FROM customers WHERE company_id = c.id) as total_customers,
                (SELECT COUNT(*) FROM teams WHERE company_id = c.id) as total_teams
            FROM companies c
            LEFT JOIN company_licenses cl ON c.id = cl.company_id
            WHERE c.id = ?
        `, [id]);

        if (companies.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        res.json({
            success: true,
            data: companies[0]
        });

    } catch (error) {
        logger.error('Error fetching company:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch company'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Update company details
 * Only accessible by super_admin
 */
export const updateCompany = async (req, res) => {
    const { id } = req.params;
    const { company_name, company_email, license_limit, is_active, subscription_start, subscription_end } = req.body;

    let connection;
    try {
        const pool = connectDB();
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Check if company exists
        const [existing] = await connection.query('SELECT id FROM companies WHERE id = ?', [id]);
        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        // Update company
        const updates = [];
        const values = [];

        if (company_name !== undefined) {
            updates.push('company_name = ?');
            values.push(company_name);
        }
        if (company_email !== undefined) {
            updates.push('company_email = ?');
            values.push(company_email);
        }
        if (is_active !== undefined) {
            updates.push('is_active = ?');
            values.push(is_active);
        }
        if (subscription_start !== undefined) {
            updates.push('subscription_start = ?');
            values.push(subscription_start);
        }
        if (subscription_end !== undefined) {
            updates.push('subscription_end = ?');
            values.push(subscription_end);
        }

        if (updates.length > 0) {
            values.push(id);
            await connection.query(
                `UPDATE companies SET ${updates.join(', ')} WHERE id = ?`,
                values
            );
        }

        // Update license if provided
        if (license_limit !== undefined) {
            await connection.query(
                'UPDATE company_licenses SET total_licenses = ? WHERE company_id = ?',
                [license_limit, id]
            );
        }

        await connection.commit();

        logger.info(`Company updated: ID ${id} by user ${req.user.userId}`);

        res.json({
            success: true,
            message: 'Company updated successfully'
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        logger.error('Error updating company:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update company'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Deactivate company
 * Only accessible by super_admin
 */
export const deactivateCompany = async (req, res) => {
    const { id } = req.params;

    let connection;
    try {
        const pool = connectDB();
        connection = await pool.getConnection();

        await connection.query(
            'UPDATE companies SET is_active = false WHERE id = ?',
            [id]
        );

        logger.info(`Company deactivated: ID ${id} by user ${req.user.userId}`);

        res.json({
            success: true,
            message: 'Company deactivated successfully'
        });

    } catch (error) {
        logger.error('Error deactivating company:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to deactivate company'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};
