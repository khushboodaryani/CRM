// src/components/routes/Forms/AdminPortal/DeptAdminPortal.js
// Portal for users with role in ['dept_admin', 'sub_dept_admin']
// Shows leads filtered to their assigned department(s) only

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
    Edit as EditIcon,
    PersonAdd as AssignIcon,
    Settings as SettingsIcon,
    Refresh as RefreshIcon,
    Add as AddIcon,
    ArrowBack as BackIcon,
    Group as TeamIcon,
    ExpandMore as ExpandIcon,
    ExpandLess as CollapseIcon,
    Person as PersonIcon,
    History as HistoryIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import LastChanges from '../LastChange/LastChange';
import './DeptAdminPortal.css';

const DeptAdminPortal = () => {
    const navigate = useNavigate();
    const api = process.env.REACT_APP_API_URL;
    const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

    const [departments, setDepartments] = useState([]);
    const [selectedDept, setSelectedDept] = useState('all');
    const [selectedSubDept, setSelectedSubDept] = useState('all');
    const [subDepts, setSubDepts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const [selectedTeamUser, setSelectedTeamUser] = useState('');
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [permissions, setPermissions] = useState({});
    const [showTeams, setShowTeams] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState(null);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [memberSearch, setMemberSearch] = useState('');

    const fetchCurrentUser = useCallback(async () => {
        try {
            const res = await axios.get(`${api}/current-user`, { headers: authHeader() });
            setCurrentUser(res.data);
            const userPerms = res.data.permissions || [];
            const permMap = userPerms.reduce((acc, p) => ({ ...acc, [p]: true }), {});
            setPermissions(permMap);
        } catch (err) { console.error(err); }
    }, [api]);

    const fetchMyDepartments = useCallback(async () => {
        try {
            const res = await axios.get(`${api}/departments`, { headers: authHeader() });
            setDepartments(res.data.data || []);
        } catch (err) { console.error('Failed to fetch departments:', err); }
    }, [api]);

    const fetchSubDepts = useCallback(async (deptId) => {
        try {
            const res = await axios.get(`${api}/departments/${deptId}/sub-departments`, { headers: authHeader() });
            setSubDepts(res.data.data || []);
        } catch (err) { setSubDepts([]); }
    }, [api]);

    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedDept && selectedDept !== 'all') params.append('department_id', selectedDept);
            if (selectedSubDept && selectedSubDept !== 'all') params.append('sub_department_id', selectedSubDept);
            const res = await axios.get(`${api}/customers?${params.toString()}`, { headers: authHeader() });
            let data = res.data.customers || res.data.data || res.data || [];
            setCustomers(data);
        } catch (err) {
            console.error('Failed to fetch customers:', err);
            setCustomers([]);
        } finally { setLoading(false); }
    }, [api, selectedDept, selectedSubDept]);

    const fetchDeptUsers = useCallback(async () => {
        try {
            const res = await axios.get(`${api}/users/all`, { headers: authHeader() });
            setUsers(res.data.data || res.data || []);
        } catch (err) { setUsers([]); }
    }, [api]);

    const fetchTeams = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (selectedDept && selectedDept !== 'all') params.append('department_id', selectedDept);
            if (selectedSubDept && selectedSubDept !== 'all') params.append('sub_department_id', selectedSubDept);

            const res = await axios.get(`${api}/players/teams?${params.toString()}`, { headers: authHeader() });
            setTeams(res.data.teams || []);
        } catch (err) { setTeams([]); }
    }, [api, selectedDept, selectedSubDept]);


    const handleSelectAll = () => {
        if (selectedCustomers.length === filtered.length) {
            setSelectedCustomers([]);
        } else {
            setSelectedCustomers(filtered);
        }
    };

    const handleSelectCustomer = (customer) => {
        setSelectedCustomers(prev => {
            const isSelected = prev.find(c => c.id === customer.id);
            if (isSelected) return prev.filter(c => c.id !== customer.id);
            else return [...prev, customer];
        });
    };




    const handleViewHistory = (customer) => {
        setSelectedCustomerForHistory(customer);
        setShowHistoryModal(true);
    };

    const handleEditCustomer = (customer) => {
        navigate(`/customers/phone/${customer.phone_no}`, {
            state: { customer, permissions, readOnly: false }
        });
    };

    const handleAssignTeam = async () => {
        if (!selectedTeamUser || selectedCustomers.length === 0) {
            alert('Please select both a user and at least one lead');
            return;
        }
        try {
            await axios.post(
                `${api}/customers/assign-team`,
                {
                    agent_id: parseInt(selectedTeamUser),
                    customer_ids: selectedCustomers.map(c => c.id)
                },
                { headers: authHeader() }
            );
            alert('Leads assigned successfully');
            setSelectedCustomers([]);
            setSelectedTeamUser('');
            fetchCustomers();
        } catch (err) {
            alert('Failed to assign leads: ' + (err.response?.data?.message || err.message));
        }
    };

    // Filter customers by search
    const filtered = customers.filter(c => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            (c.first_name || '').toLowerCase().includes(q) ||
            (c.phone_no || '').toLowerCase().includes(q) ||
            (c.agent_name || '').toLowerCase().includes(q) ||
            (c.C_unique_id || '').toLowerCase().includes(q)
        );
    });

    const deptName = (id) => departments.find(d => d.id === parseInt(id))?.department_name || id;
    const subDeptName = (id) => subDepts.find(s => s.id === parseInt(id))?.sub_department_name || '-';

    // Group users by team for My Teams section
    const getUsersOfTeam = (teamId) => users.filter(u => u.team_id === teamId);

    // List of users filtered by modal search
    const filteredUsers = users.filter(u =>
        (u.username || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(memberSearch.toLowerCase())
    );

    useEffect(() => {
        fetchCurrentUser();
        fetchDeptUsers();
        fetchMyDepartments();
    }, [fetchCurrentUser, fetchDeptUsers, fetchMyDepartments]);

    useEffect(() => {
        fetchCustomers();
        fetchTeams();
    }, [selectedDept, selectedSubDept, fetchCustomers, fetchTeams]);

    useEffect(() => {
        if (selectedDept) {
            fetchSubDepts(selectedDept);
        }
    }, [selectedDept, fetchSubDepts]);

    return (
        <div className="dap-container">
            {/* Header */}
            <div className="dap-header">
                <div className="dap-header-left">
                    <h2 className="dap-title">Department Admin Portal</h2>
                    {currentUser && (
                        <p className="dap-subtitle">Logged in as: <strong>{currentUser.username}</strong></p>
                    )}
                </div>
                <div className="dap-header-actions">
                    <button className="dap-btn-icon dap-btn-primary" onClick={() => navigate('/customer/new')}>
                        <AddIcon fontSize="small" /> Create Lead
                    </button>
                    {(currentUser?.role === 'dept_admin' || currentUser?.role === 'super_admin') && (
                        <button className="dap-btn-icon dap-btn-outline" onClick={() => navigate('/distribution-rules')}>
                            <SettingsIcon fontSize="small" /> Configure Rules
                        </button>
                    )}
                    <button className="dap-btn-icon dap-btn-outline" onClick={() => navigate('/customers')}>
                        <BackIcon fontSize="small" /> All Customers
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="dap-stats">
                <div className="dap-stat-card">
                    <span className="dap-stat-num">{customers.length}</span>
                    <span className="dap-stat-label">Total Leads</span>
                </div>
                <div className="dap-stat-card">
                    <span className="dap-stat-num">{departments.length}</span>
                    <span className="dap-stat-label">My Departments</span>
                </div>
                <div className="dap-stat-card clickable" onClick={() => setShowMembersModal(true)}>
                    <span className="dap-stat-num">{users.length}</span>
                    <span className="dap-stat-label">Team Members</span>
                </div>
                <div className="dap-stat-card" onClick={() => setShowTeams(!showTeams)}>
                    <span className="dap-stat-num">{teams.length}</span>
                    <span className="dap-stat-label">Teams</span>
                </div>
            </div>

            {/* Filters */}
            <div className="dap-filters">
                <select className="dap-select" value={selectedDept}
                    onChange={e => { setSelectedDept(e.target.value); setSelectedSubDept('all'); }}>
                    <option value="all">All Departments</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
                </select>

                {subDepts.length > 0 && (
                    <select className="dap-select" value={selectedSubDept}
                        onChange={e => setSelectedSubDept(e.target.value)}>
                        <option value="all">All Sub-Departments</option>
                        {subDepts.map(s => <option key={s.id} value={s.id}>{s.sub_department_name}</option>)}
                    </select>
                )}

                <input className="dap-search" type="text" value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, phone, agent..." />

                <button className="dap-btn-icon dap-btn-secondary" onClick={fetchCustomers}>
                    <RefreshIcon fontSize="small" /> Refresh
                </button>
            </div>

            {/* Active filter label */}
            {(selectedDept !== 'all' || selectedSubDept !== 'all') && (
                <div className="dap-filter-label">
                    Showing: <strong>{selectedDept !== 'all' ? deptName(selectedDept) : 'All Depts'}</strong>
                    {selectedSubDept !== 'all' && <> → <strong>{subDeptName(selectedSubDept)}</strong></>}
                    <button className="dap-clear-filter" onClick={() => { setSelectedDept('all'); setSelectedSubDept('all'); }}>
                        ✕ Clear
                    </button>
                </div>
            )}

            {/* Customers table */}
            <div className="dap-table-wrap">
                {loading ? (
                    <div className="dap-loading">Loading leads...</div>
                ) : filtered.length === 0 ? (
                    <div className="dap-empty">No leads found for the selected filters.</div>
                ) : (
                    <table className="dap-table">
                        <thead>
                            <tr>
                                <th>
                                    <input type="checkbox"
                                        checked={filtered.length > 0 && selectedCustomers.length === filtered.length}
                                        onChange={handleSelectAll} />
                                </th>
                                <th>#</th>
                                <th>Name</th>
                                <th>Phone</th>
                                <th>Agent</th>
                                <th>Department</th>
                                <th>Last Updated</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((c, i) => (
                                <tr key={c.id} className={`dap-row${selectedCustomers.some(sc => sc.id === c.id) ? ' dap-row-selected' : ''}`}>
                                    <td onClick={e => e.stopPropagation()}>
                                        <input type="checkbox"
                                            checked={selectedCustomers.some(sc => sc.id === c.id)}
                                            onChange={() => handleSelectCustomer(c)} />
                                    </td>
                                    <td className="dap-num">{i + 1}</td>
                                    <td className="dap-name">{c.first_name}</td>
                                    <td className="dap-phone">{c.phone_no}</td>
                                    <td className="dap-agent">{c.agent_name || '—'}</td>
                                    <td>
                                        <div className="dap-dept-info">
                                            <span className="dap-badge-dept">
                                                {c.department_name || (c.department_id ? departments.find(d => d.id === c.department_id)?.department_name : '') || '—'}
                                            </span>
                                            {c.sub_department_id && (
                                                <span className="dap-badge-subdept">
                                                    {c.sub_department_name || subDeptName(c.sub_department_id)}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="dap-updated">
                                        {c.last_updated ? new Date(c.last_updated).toLocaleString() : '—'}
                                    </td>
                                    <td>
                                        <div className="dap-action-btns">
                                            {permissions.edit_customer && (
                                                <button
                                                    className="dap-action-btn edit"
                                                    onClick={() => handleEditCustomer(c)}
                                                >
                                                    <EditIcon fontSize="inherit" /> Edit
                                                </button>
                                            )}
                                            <button
                                                className="dap-action-btn history"
                                                onClick={() => handleViewHistory(c)}
                                                title="View Update History"
                                            >
                                                <HistoryIcon fontSize="inherit" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Bulk Actions */}
            {selectedCustomers.length > 0 && (
                <div className="dap-bulk-actions">
                    <span className="dap-selected-count">{selectedCustomers.length} leads selected</span>
                    <div className="dap-assign-box">
                        <select className="dap-select-sm" value={selectedTeamUser} onChange={e => setSelectedTeamUser(e.target.value)}>
                            <option value="">Select User to Assign</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                            ))}
                        </select>
                        <button className="dap-btn-icon dap-btn-primary" onClick={handleAssignTeam}>
                            <AssignIcon fontSize="small" /> Assign Leads
                        </button>
                    </div>
                </div>
            )}

            {/* My Teams Section */}
            <div className="dap-teams-section">
                <button className="dap-teams-toggle" onClick={() => setShowTeams(!showTeams)}>
                    <TeamIcon fontSize="small" />
                    My Teams ({teams.length})
                    {showTeams ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
                </button>

                {showTeams && (
                    <div className="dap-teams-grid">
                        {teams.length === 0 ? (
                            <div className="dap-empty">No teams found.</div>
                        ) : teams.map(team => {
                            const teamMembers = getUsersOfTeam(team.id);
                            const leaders = teamMembers.filter(u => u.role === 'team_leader');
                            const agents = teamMembers.filter(u => u.role !== 'team_leader');
                            const deptForTeam = team.department_id ? departments.find(d => d.id === team.department_id)?.department_name : null;
                            return (
                                <div key={team.id} className="dap-team-card">
                                    <div className="dap-team-header">
                                        <div className="dap-team-title-row">
                                            <TeamIcon fontSize="small" className="dap-team-icon" />
                                            <span className="dap-team-name">{team.team_name}</span>
                                            <span className="dap-team-badge">{teamMembers.length} members</span>
                                        </div>
                                        <div className="dap-team-scope-tags">
                                            {team.department_name && (
                                                <span className="dap-team-dept-tag">{team.department_name}</span>
                                            )}
                                            {team.sub_department_name && (
                                                <span className="dap-team-subdept-tag">{team.sub_department_name}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="dap-team-body">
                                        {leaders.length > 0 && (
                                            <div className="dap-team-group">
                                                <span className="dap-team-group-label">Team Leaders</span>
                                                {leaders.map(tl => (
                                                    <div key={tl.id} className="dap-member-row tl">
                                                        <PersonIcon fontSize="small" className="dap-member-icon tl" />
                                                        <div className="dap-member-info">
                                                            <span className="dap-member-name" title={`Email: ${tl.email}\nPhone: ${tl.phone_no || 'N/A'}`}>{tl.username}</span>
                                                            <span className="dap-member-email">{tl.email}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="dap-team-group">
                                            <span className="dap-team-group-label">Agents</span>
                                            {agents.length > 0 ? agents.map(ag => (
                                                <div key={ag.id} className="dap-member-row">
                                                    <PersonIcon fontSize="small" className="dap-member-icon" />
                                                    <div className="dap-member-info">
                                                        <span className="dap-member-name">{ag.username}</span>
                                                        <span className="dap-member-email">{ag.email}</span>
                                                    </div>
                                                </div>
                                            )) : (
                                                <span className="dap-no-members">No agents assigned</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Member Modal */}
            {
                showMembersModal && (
                    <div className="dap-modal-overlay">
                        <div className="dap-modal member-list-modal">
                            <div className="dap-modal-header dark">
                                <div className="header-title-group">
                                    <h3><TeamIcon className="ap-icon" /> Department Team Members</h3>
                                    <p>Detailed list of all staff in your assigned departments</p>
                                </div>
                                <button className="dap-modal-close" onClick={() => setShowMembersModal(false)}>
                                    <CloseIcon />
                                </button>
                            </div>
                            <div className="dap-modal-search">
                                <input
                                    type="text"
                                    placeholder="Search members by name or email..."
                                    value={memberSearch}
                                    onChange={(e) => setMemberSearch(e.target.value)}
                                    className="dap-modal-search-input"
                                />
                            </div>
                            <div className="dap-modal-body no-padding">
                                {filteredUsers.length === 0 ? (
                                    <div className="dap-empty">No members found.</div>
                                ) : (
                                    <table className="ap-table">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Email</th>
                                                <th>Role</th>
                                                <th>Dept / Sub-Dept</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredUsers.map(user => (
                                                <tr key={user.id}>
                                                    <td className="ap-name-cell">{user.username}</td>
                                                    <td>{user.email}</td>
                                                    <td>
                                                        <span className={`ap-role-badge ${user.role}`}>
                                                            {user.role?.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="ap-dept-info-cell">
                                                        <div className="ap-dept-main">{user.department_names || '-'}</div>
                                                        <div className="ap-subdept-sub">{user.sub_department_names || '-'}</div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                            <div className="dap-modal-footer">
                                <button className="dap-btn-grey" onClick={() => setShowMembersModal(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* History Modal */}
            {
                showHistoryModal && selectedCustomerForHistory && (
                    <div className="dap-modal-overlay">
                        <div className="dap-modal">
                            <div className="dap-modal-header">
                                <h3><HistoryIcon className="dap-icon" /> Update History: {selectedCustomerForHistory.first_name}</h3>
                                <button className="dap-modal-close" onClick={() => setShowHistoryModal(false)}>
                                    <CloseIcon />
                                </button>
                            </div>
                            <div className="dap-modal-body">
                                <LastChanges
                                    customerId={selectedCustomerForHistory.id}
                                    phone_no={selectedCustomerForHistory.phone_no}
                                />
                            </div>
                            <div className="dap-modal-footer">
                                <button className="dap-btn-grey" onClick={() => setShowHistoryModal(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default DeptAdminPortal;
