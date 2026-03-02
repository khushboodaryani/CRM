// src/components/routes/Forms/AdminPortal/AdminPortal.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    People as PeopleIcon,
    Business as BusinessIcon,
    AdminPanelSettings as AdminIcon,
    GroupAdd as GroupAddIcon,
    PersonAdd as PersonAddIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import './AdminPortal.css';

const AdminPortal = () => {
    const navigate = useNavigate();
    const api = process.env.REACT_APP_API_URL;
    const authHeader = React.useCallback(() => ({ Authorization: `Bearer ${localStorage.getItem('token')}` }), []);
    const [teams, setTeams] = useState([]);
    const [newTeams, setNewTeams] = useState(['']);
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [subDeptsMap, setSubDeptsMap] = useState({}); // { deptId: [subDepts] }
    const [licenseInfo, setLicenseInfo] = useState(null);

    // Dept creation state
    const [newDeptName, setNewDeptName] = useState('');
    const [newDeptDesc, setNewDeptDesc] = useState('');
    const [newSubDept, setNewSubDept] = useState({ department_id: '', sub_department_name: '' });

    // User form state
    const getDefaultPermissions = (role) => {
        const base = {
            create_customer: false, edit_customer: false, delete_customer: false,
            view_customer: false, view_team_customers: false, view_assigned_customers: true,
            upload_document: false, download_data: false
        };
        if (['business_head', 'dept_admin', 'sub_dept_admin'].includes(role)) {
            return { ...base, create_customer: true, edit_customer: true, delete_customer: true, view_customer: true, view_team_customers: true, upload_document: true, download_data: true };
        }
        if (role === 'team_leader') return { ...base, view_team_customers: true, upload_document: true, download_data: true };
        if (role === 'mis') return { ...base, upload_document: true, download_data: true };
        if (role === 'user') return { ...base };
        return base;
    };

    const emptyUser = {
        username: '', email: '', phone_no: '', address: '', team: '', role: 'user',
        permissions: getDefaultPermissions('user'),
        isEditing: false, editingUserId: null,
        department_ids: [], sub_department_id: '',
        requires_delete_approval: true
    };
    const [newUser, setNewUser] = useState(emptyUser);
    const [showEditModal, setShowEditModal] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const permissionDisplayNames = {
        create_customer: 'Create Record', edit_customer: 'Edit Record',
        delete_customer: 'Delete Data', view_customer: 'View All Data',
        view_team_customers: 'View Team Data', view_assigned_customers: 'View Own Data',
        upload_document: 'Upload Document', download_data: 'Download Data'
    };

    useEffect(() => {
        if (error) { alert(error); setError(''); }
        if (success) { alert(success); setSuccess(''); }
    }, [error, success]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const fetchSubDepts = React.useCallback(async (deptId) => {
        try {
            const res = await axios.get(`${api}/departments/${deptId}/sub-departments`, { headers: authHeader() });
            setSubDeptsMap(prev => ({ ...prev, [deptId]: res.data.data || [] }));
        } catch (err) { console.error('Failed to fetch sub-departments:', err); }
    }, [api, authHeader]);

    const fetchTeams = React.useCallback(async () => {
        try {
            const res = await axios.get(`${api}/players/teams`, { headers: authHeader() });
            setTeams(res.data.teams || []);
        } catch { setError('Failed to fetch teams'); }
    }, [api, authHeader]);

    const fetchUsers = React.useCallback(async () => {
        try {
            const res = await axios.get(`${api}/players/users`, { headers: authHeader() });
            setUsers(res.data.data || []);
        } catch { setUsers([]); }
    }, [api, authHeader]);

    const fetchDepartments = React.useCallback(async () => {
        try {
            const res = await axios.get(`${api}/departments`, { headers: authHeader() });
            const depts = res.data.data || [];
            setDepartments(depts);
            // Pre-fetch sub-depts for all departments
            depts.forEach(d => fetchSubDepts(d.id));
        } catch (err) { console.error('Failed to fetch departments:', err); }
    }, [api, authHeader, fetchSubDepts]);

    const fetchLicenseInfo = React.useCallback(async () => {
        try {
            const res = await axios.get(`${api}/super-admin/companies`, { headers: authHeader() });
            const companies = res.data.data || res.data || [];
            // Find current company from token
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const myCompany = companies.find(c => c.id === user.company_id) || companies[0];
            if (myCompany) setLicenseInfo(myCompany);
        } catch (err) { console.error('Failed to fetch license info:', err); }
    }, [api, authHeader]);

    useEffect(() => {
        fetchTeams();
        fetchUsers();
        fetchDepartments();
        fetchLicenseInfo();
    }, [fetchTeams, fetchUsers, fetchDepartments, fetchLicenseInfo]);

    // ── Department handlers ────────────────────────────────────────────────────
    const handleCreateDepartment = async () => {
        if (!newDeptName.trim()) { setError('Department name is required'); return; }
        try {
            await axios.post(`${api}/departments`,
                { department_name: newDeptName.trim(), description: newDeptDesc.trim() || undefined },
                { headers: authHeader() }
            );
            setSuccess('Department created successfully');
            setNewDeptName(''); setNewDeptDesc('');
            fetchDepartments();
        } catch (err) { setError(err.response?.data?.message || 'Failed to create department'); }
    };

    const handleDeleteDepartment = async (deptId) => {
        if (!window.confirm('Delete this department and all its sub-departments?')) return;
        try {
            await axios.delete(`${api}/departments/${deptId}`, { headers: authHeader() });
            setSuccess('Department deleted');
            fetchDepartments();
        } catch (err) { setError(err.response?.data?.message || 'Failed to delete department'); }
    };

    const handleCreateSubDept = async () => {
        if (!newSubDept.department_id || !newSubDept.sub_department_name.trim()) {
            setError('Select a department and enter sub-department name'); return;
        }
        try {
            await axios.post(`${api}/sub-departments`,
                { department_id: newSubDept.department_id, sub_department_name: newSubDept.sub_department_name.trim() },
                { headers: authHeader() }
            );
            setSuccess('Sub-department created');
            fetchSubDepts(newSubDept.department_id);
            setNewSubDept({ department_id: '', sub_department_name: '' });
            fetchDepartments();
        } catch (err) { setError(err.response?.data?.message || 'Failed to create sub-department'); }
    };

    // ── Team handlers ──────────────────────────────────────────────────────────
    // Add dept/sub-dept state for team creation
    const [teamDeptId, setTeamDeptId] = useState('');
    const [teamSubDeptId, setTeamSubDeptId] = useState('');

    const handleCreateTeams = async () => {
        const validTeams = newTeams.filter(t => t.trim());
        if (!validTeams.length) { setError('Enter at least one team name'); return; }
        // Dept is optional for now, but recommended if user wants to link them
        try {
            for (const teamName of validTeams) {
                const payload = {
                    team_name: teamName,
                    department_id: teamDeptId || null,
                    sub_department_id: teamSubDeptId || null
                };
                await axios.post(`${api}/players/teams`, payload, { headers: authHeader() });
            }
            setSuccess('Team(s) created successfully');
            setNewTeams(['']);
            setTeamDeptId('');
            setTeamSubDeptId('');
            fetchTeams();
        } catch { setError('Failed to create team'); }
    };

    const handleDeleteTeam = async (teamId, teamName) => {
        if (!window.confirm(`Delete team "${teamName}"? This cannot be undone.`)) return;
        try {
            await axios.delete(`${api}/players/teams/${teamId}`, { headers: authHeader() });
            setSuccess('Team deleted successfully');
            fetchTeams();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete team');
        }
    };


    // ── User form handlers ─────────────────────────────────────────────────────
    const handleUserInputChange = (field, value) => {
        setNewUser(prev => {
            if (field.startsWith('permission_')) {
                return { ...prev, permissions: { ...prev.permissions, [field.replace('permission_', '')]: value } };
            }
            if (field === 'role') {
                return { ...prev, role: value, team: '', department_ids: [], sub_department_id: '', permissions: getDefaultPermissions(value) };
            }
            if (field === 'department_ids') {
                return { ...prev, department_ids: value, sub_department_id: '' };
            }
            return { ...prev, [field]: value };
        });
    };

    const handleCreateUser = async () => {
        if (!newUser.username.trim()) { setError('Username is required'); return; }
        if (!newUser.email.trim()) { setError('Email is required'); return; }
        if (!['admin', 'dept_admin', 'sub_dept_admin', 'mis'].includes(newUser.role) && !newUser.team) {
            setError('Team selection is required'); return;
        }
        if (['dept_admin', 'sub_dept_admin'].includes(newUser.role) && newUser.department_ids.length === 0) {
            setError('Select at least one department for the admin user'); return;
        }
        try {
            const userData = {
                username: newUser.username.trim(),
                email: newUser.email.trim(),
                team_id: ['dept_admin', 'sub_dept_admin', 'mis'].includes(newUser.role) ? null : newUser.team,
                role_type: newUser.role,
                permissions: newUser.permissions,
                phone_no: newUser.phone_no,
                address: newUser.address,
                requires_delete_approval: newUser.requires_delete_approval || false,
                ...(['admin', 'dept_admin', 'sub_dept_admin'].includes(newUser.role) && {
                    department_ids: newUser.department_ids.map(Number),
                    sub_department_id: newUser.sub_department_id ? Number(newUser.sub_department_id) : null
                })
            };
            const res = await axios.post(`${api}/users/create`, userData, { headers: authHeader() });
            setSuccess(res.data.message || 'User created successfully');
            setNewUser(emptyUser);
            fetchUsers();
        } catch (err) { setError(err.response?.data?.error || 'Failed to create user'); }
    };



    const handleEditUser = (user) => {
        const permsObj = user.permissions
            ? user.permissions.reduce((acc, p) => ({ ...acc, [p]: true }), getDefaultPermissions(user.role))
            : getDefaultPermissions(user.role);
        setNewUser({
            username: user.username, email: user.email, phone_no: user.phone_no || '', address: user.address || '',
            team: user.team_id || '', role: user.role,
            permissions: permsObj, isEditing: true, editingUserId: user.id,
            department_ids: [], sub_department_id: '',
            requires_delete_approval: !!user.requires_delete_approval
        });
        setShowEditModal(true);
    };

    const handleUpdateUser = async () => {
        if (!newUser.username.trim()) { setError('Username is required'); return; }
        try {
            const userData = {
                username: newUser.username.trim(),
                email: newUser.email.trim(),
                team_id: ['admin', 'dept_admin', 'sub_dept_admin', 'mis'].includes(newUser.role) ? null : newUser.team,
                role_type: newUser.role,
                permissions: newUser.permissions,
                phone_no: newUser.phone_no,
                address: newUser.address,
                requires_delete_approval: newUser.requires_delete_approval || false
            };
            await axios.put(`${api}/players/users/${newUser.editingUserId}`, userData, { headers: authHeader() });
            setSuccess('User updated successfully');
            setShowEditModal(false);
            setNewUser(emptyUser);
            fetchUsers();
        } catch (err) { setError(err.response?.data?.error || 'Failed to update user'); }
    };

    const handleDeleteUser = async (userId, username) => {
        if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return;
        try {
            await axios.delete(`${api}/players/users/${userId}`, { headers: authHeader() });
            setSuccess('User deleted successfully');
            fetchUsers();
        } catch (err) { setError(err.response?.data?.error || 'Failed to delete user'); }
    };

    // ── Derived: sub-depts available for selected dept ────────────
    const selectedDeptId = newUser.department_ids.length === 1 ? newUser.department_ids[0] : null;
    const availableSubDepts = selectedDeptId ? (subDeptsMap[selectedDeptId] || []) : [];

    // For Team Creation Sub-dept
    const teamSubDepts = teamDeptId ? (subDeptsMap[teamDeptId] || []) : [];

    // ── Role display label ─────────────────────────────────────────────────────
    const roleLabel = (role) => {
        const labels = {
            super_admin: 'Super Admin',
            business_head: 'IT Admin',
            dept_admin: 'Dept Admin',
            sub_dept_admin: 'Sub-Dept Admin',
            team_leader: 'Team Leader',
            user: 'Agent',
            mis: 'MIS',
            admin: 'Admin'
        };
        return labels[role] || role;
    };

    // ── Users grouped ──────────────────────────────────────────────────────────
    const adminUsers = users.filter(u => ['super_admin', 'business_head', 'dept_admin', 'sub_dept_admin', 'admin'].includes(u.role));
    const teamlessNonAdmin = users.filter(u => ['mis'].includes(u.role));

    // ── Form Components (reusable) ─────────────────────────────────────────────
    const renderUserForm = () => (
        <>
            <div className="ap-user-fields">
                <input className="ap-input" type="text" value={newUser.username}
                    onChange={e => handleUserInputChange('username', e.target.value)} placeholder="Username *" />
                <input className="ap-input" type="email" value={newUser.email}
                    onChange={e => handleUserInputChange('email', e.target.value)} placeholder="Email *" />
                <input className="ap-input" type="text" value={newUser.phone_no || ''}
                    onChange={e => handleUserInputChange('phone_no', e.target.value)} placeholder="Phone No" />
                <input className="ap-input" type="text" value={newUser.address || ''}
                    onChange={e => handleUserInputChange('address', e.target.value)} placeholder="Address (Optional)" />

                {/* Role */}
                <select className="ap-input" value={newUser.role}
                    onChange={e => handleUserInputChange('role', e.target.value)}>
                    <option value="">Select Role</option>
                    <option value="user">Agent (User)</option>
                    <option value="team_leader">Team Leader</option>
                    <option value="dept_admin">Dept Admin</option>
                    <option value="sub_dept_admin">Sub-Dept Admin</option>
                    <option value="mis">MIS</option>
                </select>

                {/* Team — hidden for admins & mis */}
                {!(newUser.role === 'dept_admin' || newUser.role === 'sub_dept_admin' || newUser.role === 'mis') && (
                    <select className="ap-input" value={newUser.team}
                        onChange={e => handleUserInputChange('team', e.target.value)}>
                        <option value="">Select Team *</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.team_name}</option>)}
                    </select>
                )}

                {/* Department — for admin roles */}
                {(newUser.role === 'dept_admin' || newUser.role === 'sub_dept_admin') && (
                    <div className="ap-dept-select-wrap">
                        <label className="ap-label">Assign Department(s) *</label>
                        <select className="ap-input ap-multi-select" multiple
                            value={newUser.department_ids.map(String)}
                            onChange={e => {
                                const selected = Array.from(e.target.selectedOptions, o => parseInt(o.value));
                                handleUserInputChange('department_ids', selected);
                            }}>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
                        </select>
                        <small className="ap-hint">Hold Ctrl/Cmd to select multiple</small>
                    </div>
                )}

                {/* Sub-department */}
                {(newUser.role === 'dept_admin' || newUser.role === 'sub_dept_admin') && availableSubDepts.length > 0 && (
                    <div className="ap-dept-select-wrap">
                        <label className="ap-label">Assign Sub-Department (optional)</label>
                        <select className="ap-input"
                            value={newUser.sub_department_id}
                            onChange={e => handleUserInputChange('sub_department_id', e.target.value)}>
                            <option value="">Entire department</option>
                            {availableSubDepts.map(sd => (
                                <option key={sd.id} value={sd.id}>{sd.sub_department_name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="ap-permissions">
                <h4 className="ap-perm-title">Permissions</h4>
                <div className="ap-perm-grid">
                    {Object.entries(newUser.permissions).map(([key, val]) => (
                        <label key={key} className="ap-perm-item">
                            <input type="checkbox" checked={val}
                                onChange={e => handleUserInputChange(`permission_${key}`, e.target.checked)} />
                            <span>{permissionDisplayNames[key]}</span>
                        </label>
                    ))}
                </div>

                {/* Delete Approval Flag */}
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #e0e0e0' }}>
                    <label className="ap-perm-item" style={{ gap: '0.5rem', alignItems: 'center' }}>
                        <input
                            type="checkbox"
                            checked={newUser.requires_delete_approval || false}
                            onChange={e => handleUserInputChange('requires_delete_approval', e.target.checked)}
                        />
                        <span style={{ fontWeight: 600, color: '#c62828' }}>
                            🔒 Requires Approval to Delete Records
                        </span>
                    </label>
                    <p style={{ margin: '0.25rem 0 0 1.5rem', fontSize: '0.75rem', color: '#888' }}>
                        When enabled, this user must get approval from their supervisor before
                        they can delete a lead or customer record.
                    </p>
                </div>
            </div>
        </>
    );

    return (
        <div className="ap-container">
            <div className="ap-inner">
                {/* ── HEADER ── */}
                <div className="ap-header">
                    <h2 className="ap-title">IT Admin Portal</h2>
                    <button onClick={() => navigate('/form-creation')} className="ap-btn-green">
                        <AddIcon sx={{ fontSize: 20, marginRight: 1 }} /> Add Form
                    </button>
                </div>

                {/* ── LICENSE BANNER ── */}
                {licenseInfo && (() => {
                    const realAdminCount = users.filter(u =>
                        ['business_head', 'dept_admin', 'sub_dept_admin'].includes(u.role)
                    ).length;
                    const realUserCount = users.filter(u =>
                        ['team_leader', 'user', 'mis'].includes(u.role)
                    ).length;
                    return (
                        <div className="ap-license-banner">
                            <div className="ap-license-card">
                                <span className="ap-license-label">Admin Slots</span>
                                <span className="ap-license-value">
                                    {realAdminCount} / {licenseInfo.admin_limit ?? licenseInfo.total_admin_licenses ?? '—'}
                                </span>
                            </div>
                            <div className="ap-license-card">
                                <span className="ap-license-label">User Slots</span>
                                <span className="ap-license-value">
                                    {realUserCount} / {licenseInfo.user_limit ?? licenseInfo.total_user_licenses ?? '—'}
                                </span>
                            </div>
                            <div className="ap-license-card">
                                <span className="ap-license-label">Company</span>
                                <span className="ap-license-value" style={{ fontSize: '0.9rem' }}>{licenseInfo.company_name}</span>
                            </div>
                        </div>
                    );
                })()}

                {/* ── SECTION 1: DEPARTMENTS ── */}
                <div className="ap-section-full">
                    <div className="ap-card">
                        <h3 className="ap-section-title"><BusinessIcon className="ap-icon" /> Departments Management</h3>
                        <div className="ap-row">
                            <input
                                className="ap-input"
                                id="new-dept-name-input"
                                type="text"
                                value={newDeptName}
                                onChange={e => setNewDeptName(e.target.value)}
                                placeholder="Department name *"
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && newDeptName.trim()) {
                                        handleCreateDepartment();
                                        setTimeout(() => document.getElementById('new-dept-name-input')?.focus(), 150);
                                    }
                                }}
                            />
                            <input
                                className="ap-input"
                                type="text"
                                value={newDeptDesc}
                                onChange={e => setNewDeptDesc(e.target.value)}
                                placeholder="Description (optional)"
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && newDeptName.trim()) {
                                        handleCreateDepartment();
                                        setTimeout(() => document.getElementById('new-dept-name-input')?.focus(), 150);
                                    }
                                }}
                            />
                            <button className="ap-btn-blue" onClick={() => {
                                handleCreateDepartment();
                                setTimeout(() => document.getElementById('new-dept-name-input')?.focus(), 150);
                            }}>Create Dept</button>
                        </div>
                        <div className="ap-row" style={{ marginTop: '10px' }}>
                            <select className="ap-input" value={newSubDept.department_id}
                                onChange={e => setNewSubDept(p => ({ ...p, department_id: e.target.value }))}>
                                <option value="">Select Dept for Sub-Dept</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
                            </select>
                            <input
                                className="ap-input"
                                id="new-subdept-name-input"
                                type="text"
                                value={newSubDept.sub_department_name}
                                onChange={e => setNewSubDept(p => ({ ...p, sub_department_name: e.target.value }))}
                                placeholder="Sub-department name"
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && newSubDept.sub_department_name.trim() && newSubDept.department_id) {
                                        handleCreateSubDept();
                                        setTimeout(() => document.getElementById('new-subdept-name-input')?.focus(), 150);
                                    }
                                }}
                            />
                            <button className="ap-btn-blue" onClick={() => {
                                handleCreateSubDept();
                                setTimeout(() => document.getElementById('new-subdept-name-input')?.focus(), 150);
                            }}>Add Sub-Dept</button>
                        </div>
                        {departments.length > 0 && (
                            <div className="ap-dept-list-horizontal">
                                {departments.map(dept => (
                                    <div key={dept.id} className="ap-dept-tag">
                                        <span className="ap-dept-tag-name">{dept.department_name}</span>
                                        <div className="ap-subdept-group">
                                            {(subDeptsMap[dept.id] || []).map(sd => (
                                                <span key={sd.id} className="ap-subdept-pill">{sd.sub_department_name}</span>
                                            ))}
                                        </div>
                                        <button className="ap-dept-del" onClick={() => handleDeleteDepartment(dept.id)}>
                                            <CloseIcon fontSize="small" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── SECTION 2: FORMS ── */}
                <div className="ap-grid-row">
                    {/* Create Team */}
                    <div className="ap-card ap-card-team">
                        <h3 className="ap-section-title"><GroupAddIcon className="ap-icon" /> Create Team</h3>
                        <div className="ap-form-stack">
                            <div className="ap-form-group">
                                <label className="ap-label">Department (Optional)</label>
                                <select className="ap-input" value={teamDeptId} onChange={e => setTeamDeptId(e.target.value)}>
                                    <option value="">Select Department</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
                                </select>
                            </div>

                            {teamSubDepts.length > 0 && (
                                <div className="ap-form-group">
                                    <label className="ap-label">Sub-Department (Optional)</label>
                                    <select className="ap-input" value={teamSubDeptId} onChange={e => setTeamSubDeptId(e.target.value)}>
                                        <option value="">Select Sub-Dept</option>
                                        {teamSubDepts.map(sd => <option key={sd.id} value={sd.id}>{sd.sub_department_name}</option>)}
                                    </select>
                                </div>
                            )}

                            <label className="ap-label">Team Names</label>
                            {newTeams.map((team, i) => (
                                <input key={i} className="ap-input" type="text" value={team}
                                    onChange={e => { const t = [...newTeams]; t[i] = e.target.value; setNewTeams(t); }}
                                    placeholder="Enter Team Name" />
                            ))}
                            <button className="ap-btn-blue" onClick={handleCreateTeams}>Create Team</button>
                        </div>
                    </div>

                    {/* Create User */}
                    <div className="ap-card ap-card-user">
                        <h3 className="ap-section-title"><PersonAddIcon className="ap-icon" /> Create User</h3>
                        <div className="ap-user-form">
                            {renderUserForm()}
                            <div className="ap-form-btns">
                                <button className="ap-btn-blue" onClick={handleCreateUser}>Create User</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── SECTION 3: EXISTING USERS & TEAMS ── */}
                <div className="ap-users-section">
                    <h2 className="ap-main-heading">Existing Users & Teams</h2>

                    {/* Admins Table */}
                    {adminUsers.length > 0 && (
                        <div className="ap-admin-list">
                            <h3 className="ap-list-heading"><AdminIcon className="ap-icon-sm" /> Admins & Heads</h3>
                            <div className="ap-table-wrap">
                                <table className="ap-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th><th>Email</th><th>Role</th><th>Dept / Sub-Dept</th><th>Phone</th><th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {adminUsers.map(user => (
                                            <tr key={user.id}>
                                                <td className="ap-name-cell">{user.username}</td>
                                                <td>{user.email}</td>
                                                <td><span className={`ap-role-badge ${user.role}`}>{roleLabel(user.role)}</span></td>
                                                <td>
                                                    <div className="ap-dept-info-cell">
                                                        <span className="ap-dept-main">{user.department_names || '-'}</span>
                                                        {user.sub_department_name && (
                                                            <span className="ap-subdept-sub"> / {user.sub_department_name}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>{user.phone_no || '-'}</td>
                                                <td>
                                                    <div className="ap-actions">
                                                        <button className="ap-icon-btn" onClick={() => handleEditUser(user)} title="Edit">
                                                            <EditIcon fontSize="small" />
                                                        </button>
                                                        <button className="ap-icon-btn delete" onClick={() => handleDeleteUser(user.id, user.username)} title="Delete">
                                                            <DeleteIcon fontSize="small" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* MIS Table */}
                    {teamlessNonAdmin.length > 0 && (
                        <div className="ap-admin-list">
                            <h3 className="ap-list-heading"><PeopleIcon className="ap-icon-sm" /> MIS / Other Users</h3>
                            <div className="ap-table-wrap">
                                <table className="ap-table">
                                    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        {teamlessNonAdmin.map(user => (
                                            <tr key={user.id}>
                                                <td className="ap-name-cell">{user.username}</td>
                                                <td>{user.email}</td>
                                                <td><span className={`ap-role-badge ${user.role}`}>{roleLabel(user.role)}</span></td>
                                                <td>{user.phone_no || '-'}</td>
                                                <td>
                                                    <div className="ap-actions">
                                                        <button className="ap-icon-btn" onClick={() => handleEditUser(user)} title="Edit">
                                                            <EditIcon fontSize="small" />
                                                        </button>
                                                        <button className="ap-icon-btn delete" onClick={() => handleDeleteUser(user.id, user.username)} title="Delete">
                                                            <DeleteIcon fontSize="small" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Team Cards Grid */}
                    <div className="ap-teams-container">
                        <h2 className="ap-center-heading">Teams</h2>
                        <div className="ap-teams-grid">
                            {teams.map(team => {
                                const teamUsers = users.filter(u => u.team_id === team.id && u.role !== 'super_admin');
                                const sorted = [...teamUsers].sort((a, b) => a.role === 'team_leader' ? -1 : b.role === 'team_leader' ? 1 : 0);
                                const leaders = sorted.filter(u => u.role === 'team_leader');
                                const agents = sorted.filter(u => u.role !== 'team_leader');

                                // Find Dept Name
                                const deptName = team.department_id ? departments.find(d => d.id === team.department_id)?.department_name : null;
                                // Find Sub-Dept Name - we need to look in subDeptsMap or fetch it?
                                // We have subDeptsMap which is { deptId: [subDepts] }.
                                const subDepts = team.department_id ? (subDeptsMap[team.department_id] || []) : [];
                                const subDeptName = team.sub_department_id ? subDepts.find(s => s.id === team.sub_department_id)?.sub_department_name : null;

                                return (
                                    <div key={team.id} className="ap-team-card">
                                        <div className="ap-team-header">
                                            <div className="ap-team-title-row">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <span className="ap-team-title">{team.team_name}</span>
                                                    <button
                                                        onClick={() => handleDeleteTeam(team.id, team.team_name)}
                                                        className="ap-icon-btn delete"
                                                        title="Delete Team"
                                                        style={{ padding: '2px' }}
                                                    >
                                                        <DeleteIcon style={{ fontSize: 18 }} />
                                                    </button>
                                                </div>
                                                <span className="ap-team-count">{teamUsers.length} Users</span>
                                            </div>
                                            {(deptName || subDeptName) && (
                                                <div className="ap-team-meta">
                                                    {deptName && <span className="ap-team-dept">{deptName}</span>}
                                                    {subDeptName && <span className="ap-team-subdept">{subDeptName}</span>}
                                                </div>
                                            )}
                                        </div>
                                        <div className="ap-team-body">
                                            {/* Leaders */}
                                            {leaders.length > 0 && (
                                                <div className="ap-team-section">
                                                    <small>Team Leaders</small>
                                                    {leaders.map(tl => (
                                                        <div key={tl.id} className="ap-member-row tl">
                                                            <span className="ap-member-namewrap">
                                                                <span className="ap-member-name">{tl.username}</span>
                                                                <div className="ap-member-tooltip">
                                                                    <strong>{tl.username}</strong>
                                                                    <span>{tl.email}</span>
                                                                    {tl.phone_no && <span>📞 {tl.phone_no}</span>}
                                                                </div>
                                                            </span>
                                                            <div className="ap-actions-sm">
                                                                <button onClick={() => handleEditUser(tl)} className="ap-icon-btn-orange"><EditIcon style={{ fontSize: 16 }} /></button>
                                                                <button onClick={() => handleDeleteUser(tl.id, tl.username)} className="ap-icon-btn-orange"><CloseIcon style={{ fontSize: 16 }} /></button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {/* Agents */}
                                            <div className="ap-team-section">
                                                <small>Agents</small>
                                                {agents.length > 0 ? agents.map(ag => (
                                                    <div key={ag.id} className="ap-member-row">
                                                        <span className="ap-member-namewrap">
                                                            <span className="ap-member-name">{ag.username}</span>
                                                            <div className="ap-member-tooltip">
                                                                <strong>{ag.username}</strong>
                                                                <span>{ag.email}</span>
                                                                {ag.phone_no && <span>📞 {ag.phone_no}</span>}
                                                            </div>
                                                        </span>
                                                        <div className="ap-actions-sm">
                                                            <button onClick={() => handleEditUser(ag)} className="ap-icon-btn-orange"><EditIcon style={{ fontSize: 16 }} /></button>
                                                            <button onClick={() => handleDeleteUser(ag.id, ag.username)} className="ap-icon-btn-orange"><CloseIcon style={{ fontSize: 16 }} /></button>
                                                        </div>
                                                    </div>
                                                )) : <div className="ap-no-members">No agents assigned</div>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── EDIT USER MODAL ── */}
            {showEditModal && (
                <div className="ap-modal-overlay">
                    <div className="ap-modal">
                        <div className="ap-modal-header">
                            <h3><EditIcon className="ap-icon" /> Edit User</h3>
                            <button className="ap-modal-close" onClick={() => setShowEditModal(false)}>
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="ap-modal-body">
                            {renderUserForm()}
                        </div>
                        <div className="ap-modal-footer">
                            <button className="ap-btn-grey" onClick={() => setShowEditModal(false)}>Cancel</button>
                            <button className="ap-btn-blue" onClick={handleUpdateUser}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};

export default AdminPortal;
