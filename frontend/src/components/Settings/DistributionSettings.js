import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem,
    FormControlLabel, Switch, Chip, Alert, IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';

const DistributionSettings = () => {
    const [departments, setDepartments] = useState([]);
    const [subDepartments, setSubDepartments] = useState([]);
    const [selectedDeptId, setSelectedDeptId] = useState('');
    const [rules, setRules] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Dialog State
    const [openDialog, setOpenDialog] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [ruleForm, setRuleForm] = useState({
        scopeType: 'department', // department, sub_department
        scopeId: '',
        distributionMethod: 'round_robin', // valid DB enum: equal, weighted, round_robin
        activeOnly: true,
        targetId: '' // For team method
    });

    const fetchDropdowns = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.REACT_APP_API_URL;
            const headers = { Authorization: `Bearer ${token}` };

            const [deptRes, teamRes] = await Promise.all([
                axios.get(`${apiUrl}/departments`, { headers }),
                axios.get(`${apiUrl}/teams`, { headers })
            ]);

            if (deptRes.data.success) {
                const fetchedDepts = deptRes.data.data;
                setDepartments(fetchedDepts);

                // Auto-select first department if none selected
                if (!selectedDeptId && fetchedDepts.length > 0) {
                    setSelectedDeptId(fetchedDepts[0].id);
                }
            }
            if (teamRes.data.success) {
                // Teams fetched but unused in current UI version
                // console.log('Teams fetched:', teamRes.data.teams);
            }

        } catch (err) {
            console.error('Error fetching dropdowns:', err);
            setError('Failed to load initial data');
        }
    }, [selectedDeptId]);

    const fetchRules = useCallback(async (deptId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.REACT_APP_API_URL;
            const response = await axios.get(`${apiUrl}/distribution-rules/${deptId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setRules(response.data.rules);
            }
        } catch (err) {
            console.error('Error fetching rules:', err);
            setError('Failed to fetch distribution rules');
        } finally {
            setLoading(false);
        }
    }, [selectedDeptId]);

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('user'));
        setUser(userData);
        fetchDropdowns();

        if (userData?.role === 'dept_admin' || userData?.role === 'system_admin' || userData?.role === 'business_head') {
            // Already handled by fetchDropdowns -> useEffect on departments
        }
    }, [fetchDropdowns]);

    useEffect(() => {
        if (selectedDeptId) {
            fetchRules(selectedDeptId);
            // Fetch sub-departments
            const fetchSubDepartments = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const apiUrl = process.env.REACT_APP_API_URL;
                    const response = await axios.get(`${apiUrl}/departments/${selectedDeptId}/sub-departments`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (response.data.success) {
                        setSubDepartments(response.data.data);
                    }
                } catch (err) {
                    console.error('Error fetching sub-departments:', err);
                    setSubDepartments([]);
                }
            };
            fetchSubDepartments();
        } else {
            setRules([]);
            setSubDepartments([]);
        }
    }, [selectedDeptId, fetchRules]);

    const handleSaveRule = async () => {
        try {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.REACT_APP_API_URL;

            // Prepare payload
            // scopeId depends on scopeType
            const scopeIdVal = ruleForm.scopeType === 'department' ? selectedDeptId : ruleForm.scopeId;

            // If team method, targetId is used as distribution result
            // But wait, the table structure: 
            // lead_distribution_rules (department_id, scope_type, scope_id, distribution_method, active_only)
            // Where is "target team" stored?
            // Ah, the schema I created:
            // CREATE TABLE lead_distribution_rules ( ... distribution_method ENUM('random', 'round_robin', 'weighted', 'manual') ... )
            // Wait, does the table support "Specific Team"?
            // Checking lead_distribution_migration.sql:
            // `distribution_method` ENUM('random', 'equal', 'weighted', 'round_robin') DEFAULT 'round_robin'
            // It DOES NOT seem to support "Specific Team" directly in the RULE definition?
            // Wait, implementation plan said:
            // "Specific Team Assignment: ... No TL: Leave assigned_to NULL (Team Pool)"
            // But how do we store "Always assign to Team X"?
            // If method is 'team', we probably need a `target_team_id` column?
            // OR, the rule is just "METHOD=TEAM" and the Team ID is passed during upload?
            // During Upload, the user SELECTS the team.
            // But here in SETTINGS, we are defining rules for "Automatic Distribution" (Background/Random).
            // "Random Distribution" usually implies Round Robin across the SCOPE.
            // If I want to auto-assign to a Specific Team based on scope, that's a different rule.

            // Re-reading Plan:
            // "Random Distribution: Fetch eligible active agents... based on Scope (Dept/Sub-Dept)... Apply Algorithm"
            // So simpler settings: Just Round Robin / Weighted for the scope.
            // Configuring "Specific Team" permanent rule might not be needed if Upload allows choosing it?
            // But maybe we want "Any lead for Sub-Dept Sales -> Team Alpha"?
            // For now, let's stick to what schema supports.
            // Schema has `distribution_method`.
            // So we can configure: "For Dept Sales, use Weighted". "For Sub-Dept Support, use Round Robin".
            // We won't support "Always to Team X" in the persistent rules yet, unless I add a column.
            // UploadNew.js handles the "One-off" assignment to a team.
            // This Settings page is for the "Random" logic configuration.

            const payload = {
                departmentId: selectedDeptId,
                scopeType: ruleForm.scopeType,
                scopeId: scopeIdVal,
                distributionMethod: ruleForm.distributionMethod,
                activeOnly: ruleForm.activeOnly
            };

            await axios.post(`${apiUrl}/distribution-rules`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setOpenDialog(false);
            fetchRules(selectedDeptId);
        } catch (err) {
            console.error('Error saving rule:', err);
            setError('Failed to save rule');
        }
    };

    const handleOpenDialog = (rule = null) => {
        if (rule) {
            setEditingRule(rule);
            setRuleForm({
                scopeType: rule.scope_type,
                scopeId: rule.scope_id,
                distributionMethod: rule.distribution_method || 'round_robin',
                activeOnly: rule.active_only === 1
            });
        } else {
            setEditingRule(null);
            setRuleForm({
                scopeType: user?.role === 'sub_dept_admin' ? 'sub_department' : 'department',
                scopeId: '',
                distributionMethod: 'round_robin',
                activeOnly: true
            });
        }
        setOpenDialog(true);
    };

    const getScopeName = (rule) => {
        if (rule.scope_type === 'department') return 'Whole Department';
        const sub = subDepartments.find(s => s.id === rule.scope_id);
        return sub ? `Sub-Dept: ${sub.sub_department_name}` : `Sub-Dept ID: ${rule.scope_id}`;
    };

    return (
        <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
            <Typography variant="h4" sx={{ mb: 3, color: '#364C63', fontWeight: 600 }}>
                Lead Distribution Rules
            </Typography>

            {/* Department Selection (For Admin) */}
            {(user?.role === 'business_head' || user?.role === 'system_admin' || user?.role === 'dept_admin' || user?.role === 'sub_dept_admin' || user?.role === 'super_admin') && (
                <FormControl fullWidth sx={{ mb: 3, backgroundColor: 'white' }}>
                    <InputLabel>Select Department</InputLabel>
                    <Select
                        value={selectedDeptId}
                        label="Select Department"
                        onChange={(e) => setSelectedDeptId(e.target.value)}
                    >
                        {departments.map(dept => (
                            <MenuItem key={dept.id} value={dept.id}>{dept.department_name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            )}

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {selectedDeptId ? (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenDialog()}
                            sx={{ backgroundColor: '#EF6F53' }}
                        >
                            Add Rule
                        </Button>
                    </Box>

                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                                <TableRow>
                                    <TableCell>Scope</TableCell>
                                    <TableCell>Distribution Method</TableCell>
                                    <TableCell>Active Agents Only</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rules.length > 0 ? (
                                    rules.map((rule) => (
                                        <TableRow key={rule.id}>
                                            <TableCell>{getScopeName(rule)}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={rule.distribution_method?.replace('_', ' ').toUpperCase()}
                                                    color="primary"
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {rule.active_only ? 'Yes' : 'No'}
                                            </TableCell>
                                            <TableCell>
                                                <IconButton onClick={() => handleOpenDialog(rule)} color="primary">
                                                    <EditIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center">No distribution rules found. Default behavior allows manual or basic round robin.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            ) : (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="textSecondary">Please select a department to view rules.</Typography>
                </Paper>
            )}

            {/* Edit/Add Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingRule ? 'Edit Rule' : 'Create New Rule'}</DialogTitle>
                <DialogContent sx={{ mt: 1 }}>
                    <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
                        <InputLabel>Scope</InputLabel>
                        <Select
                            value={ruleForm.scopeType}
                            label="Scope"
                            onChange={(e) => setRuleForm({ ...ruleForm, scopeType: e.target.value })}
                            disabled={!!editingRule || user?.role === 'sub_dept_admin'} // Sub-Dept Admin can ONLY use sub_department scope
                        >
                            {user?.role !== 'sub_dept_admin' && <MenuItem value="department">Whole Department</MenuItem>}
                            <MenuItem value="sub_department">Sub-Department</MenuItem>
                        </Select>
                    </FormControl>

                    {ruleForm.scopeType === 'sub_department' && (
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Sub-Department</InputLabel>
                            <Select
                                value={ruleForm.scopeId}
                                label="Sub-Department"
                                onChange={(e) => setRuleForm({ ...ruleForm, scopeId: e.target.value })}
                                disabled={!!editingRule}
                            >
                                {subDepartments.map(sub => (
                                    <MenuItem key={sub.id} value={sub.id}>{sub.sub_department_name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Distribution Method</InputLabel>
                        <Select
                            value={ruleForm.distributionMethod}
                            label="Distribution Method"
                            onChange={(e) => setRuleForm({ ...ruleForm, distributionMethod: e.target.value })}
                        >
                            <MenuItem value="round_robin">Round Robin</MenuItem>
                            <MenuItem value="equal">Equal Split</MenuItem>
                            <MenuItem value="weighted">Weighted (User Weight)</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControlLabel
                        control={
                            <Switch
                                checked={ruleForm.activeOnly}
                                onChange={(e) => setRuleForm({ ...ruleForm, activeOnly: e.target.checked })}
                                color="primary"
                            />
                        }
                        label="Distribute only to Active (Online) Agents"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleSaveRule} variant="contained" color="primary">Save Rule</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default DistributionSettings;
