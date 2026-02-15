// src/controllers/teams.js

import connectDB from '../db/index.js';

// Create a new team
export const createTeam = async (req, res) => {
    const { team_name } = req.body;
    const created_by = req.user.userId; // Get userId from auth middleware
    const company_id = req.user.company_id; // Get company_id from auth middleware

    try {
        const pool = connectDB();
        const conn = await pool.getConnection();

        try {
            await conn.beginTransaction();

            // Check if team already exists in this company
            const [existingTeam] = await conn.query(
                'SELECT id FROM teams WHERE team_name = ? AND company_id = ?',
                [team_name, company_id]
            );

            if (existingTeam.length > 0) {
                await conn.rollback();
                return res.status(400).json({ error: 'Team name already exists' });
            }

            // Create new team with company_id
            const [result] = await conn.query(
                'INSERT INTO teams (team_name, company_id, created_by) VALUES (?, ?, ?)',
                [team_name, company_id, created_by]
            );

            await conn.commit();
            res.status(201).json({
                message: 'Team created successfully',
                team_id: result.insertId
            });

        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }

    } catch (error) {
        console.error('Error creating team:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get all teams
export const getAllTeams = async (req, res) => {
    const pool = connectDB();
    let connection;
    try {
        connection = await pool.getConnection();

        const company_id = req.user.company_id; // Get company_id from auth middleware

        // Get all teams for this company with creator information
        const [teams] = await connection.query(
            'SELECT t.*, u.username as created_by_name FROM teams t JOIN users u ON t.created_by = u.id WHERE t.company_id = ? ORDER BY t.created_at DESC',
            [company_id]
        );

        res.json(teams);

    } catch (error) {
        console.error('Error fetching teams:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};
