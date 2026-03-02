
import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import {
    Assignment as LeadsIcon,
    Business as BusinessIcon,
    FilterList as FilterIcon,
    Edit,
    ArrowBack,
    Search,
    History as HistoryIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import LastChanges from '../routes/Forms/LastChange/LastChange';
import './SuperLeadsPortal.css';

const SuperLeadsPortal = () => {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState('');
    const [departments, setDepartments] = useState([]);
    const [selectedDept, setSelectedDept] = useState('');
    const [subDepartments, setSubDepartments] = useState([]);
    const [selectedSubDept, setSelectedSubDept] = useState('');
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState('');

    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [permissions, setPermissions] = useState({});
    const [customFields, setCustomFields] = useState([]); // dynamic schema fields for table preview
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedLeadForHistory, setSelectedLeadForHistory] = useState(null);

    useEffect(() => {
        fetchCurrentUser();
        fetchCompanies();
    }, []);

    const fetchCurrentUser = async () => {
        try {
            const res = await api.get('/current-user');
            const userPerms = res.data.permissions || [];
            const permMap = userPerms.reduce((acc, p) => ({ ...acc, [p]: true }), {});
            setPermissions(permMap);
        } catch (err) { console.error(err); }
    };

    // When company changes → fetch depts + schema, reset lower filters
    useEffect(() => {
        if (selectedCompany) {
            fetchDepartments(selectedCompany);
            fetchCustomFields();
        } else {
            setDepartments([]);
            setSubDepartments([]);
            setTeams([]);
            setLeads([]);
            setCustomFields([]);
        }
        setSelectedDept('');
        setSelectedSubDept('');
        setSelectedTeam('');
    }, [selectedCompany]);

    // When dept changes → fetch subdepts + teams, reset lower filters
    useEffect(() => {
        if (selectedDept) {
            fetchSubDepartments(selectedDept);
            fetchTeamsByDept(selectedDept);
        } else {
            setSubDepartments([]);
            setTeams([]);
        }
        setSelectedSubDept('');
        setSelectedTeam('');
    }, [selectedDept]);

    // Fetch leads whenever any filter changes (including company)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (selectedCompany) {
            fetchLeads();
        }
    }, [selectedCompany, selectedDept, selectedSubDept, selectedTeam]);

    const fetchCompanies = async () => {
        try {
            const res = await api.get('/super-admin/companies');
            setCompanies(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch companies:', err);
        }
    };

    const fetchCustomFields = async () => {
        try {
            const res = await api.get('/custom-fields');
            if (res.data.success) {
                // Exclude always-shown, system, and relation-ID fields
                const excluded = [
                    'id', 'created_at', 'updated_at', 'last_updated', 'date_created',
                    'company_id', 'team_id', 'C_unique_id', 'duplicate_action',
                    'first_name', 'last_name', 'phone_no', 'agent_name',
                    'department_id', 'sub_department_id', 'assigned_to'
                ];
                const fields = (res.data.fields || []).filter(f => !excluded.includes(f.COLUMN_NAME));
                // Show up to 4 preview columns in table
                setCustomFields(fields.slice(0, 4));
            }
        } catch (err) {
            console.error('Failed to fetch custom fields:', err);
            setCustomFields([]);
        }
    };

    const fetchDepartments = async (companyId) => {
        try {
            const res = await api.get(`/departments?company_id=${companyId}`);
            setDepartments(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch departments:', err);
            setDepartments([]);
        }
    };

    const fetchSubDepartments = async (deptId) => {
        try {
            const res = await api.get(`/departments/${deptId}/sub-departments`);
            setSubDepartments(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch sub-departments:', err);
            setSubDepartments([]);
        }
    };

    const fetchTeamsByDept = async (deptId) => {
        try {
            // Pass company_id so backend filters to selected company only
            const url = selectedCompany
                ? `/players/teams?company_id=${selectedCompany}`
                : `/players/teams`;
            const res = await api.get(url);
            // Response shape: { success: true, teams: [...] }
            const allTeams = res.data.teams || [];
            const filtered = allTeams.filter(t => String(t.department_id) === String(deptId));
            setTeams(filtered);
        } catch (err) {
            console.error('Failed to fetch teams:', err);
            setTeams([]);
        }
    };

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedCompany) params.append('company_id', selectedCompany);
            if (selectedDept) params.append('department_id', selectedDept);
            if (selectedSubDept) params.append('sub_department_id', selectedSubDept);
            if (selectedTeam) params.append('team_id', selectedTeam);

            const res = await api.get(`/customers?${params.toString()}`);
            setLeads(res.data.data || res.data.customers || []);
        } catch (err) {
            console.error('Failed to fetch leads:', err);
        } finally {
            setLoading(false);
        }
    };



    const handleViewHistory = (lead) => {
        setSelectedLeadForHistory(lead);
        setShowHistoryModal(true);
    };

    const handleEditLead = (lead) => {
        navigate(`/customers/phone/${lead.phone_no}`, {
            state: { customer: lead, permissions, readOnly: false }
        });
    };

    const filteredLeads = leads.filter(l =>
        (l.first_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.phone_no?.includes(searchTerm)) ||
        (l.email_id?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="slp-container">
            <div className="slp-header">
                <div className="slp-header-left">
                    <button className="slp-back-btn" onClick={() => navigate('/super-admin/dashboard')}>
                        <ArrowBack /> Dashboard
                    </button>
                    <h1 className="slp-title">
                        <LeadsIcon className="slp-icon-title" /> Leads Management
                    </h1>
                </div>
                {selectedCompany && (
                    <div className="slp-leads-count">
                        <span>{filteredLeads.length}</span> leads
                    </div>
                )}
            </div>

            <div className="slp-controls">
                <div className="slp-filter-grid">
                    <div className="slp-filter-group">
                        <label><BusinessIcon fontSize="small" /> Company</label>
                        <select
                            value={selectedCompany}
                            onChange={(e) => setSelectedCompany(e.target.value)}
                        >
                            <option value="">Select a Company</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.company_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="slp-filter-group">
                        <label><FilterIcon fontSize="small" /> Department</label>
                        <select
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                            disabled={!selectedCompany}
                        >
                            <option value="">{selectedCompany && departments.length === 0 ? 'No departments found' : 'All Departments'}</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.department_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="slp-filter-group">
                        <label>Sub-Department</label>
                        <select
                            value={selectedSubDept}
                            onChange={(e) => setSelectedSubDept(e.target.value)}
                            disabled={!selectedDept}
                        >
                            <option value="">{selectedDept && subDepartments.length === 0 ? 'No sub-depts' : 'All Sub-Depts'}</option>
                            {subDepartments.map(sd => (
                                <option key={sd.id} value={sd.id}>{sd.sub_department_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="slp-filter-group">
                        <label>Team</label>
                        <select
                            value={selectedTeam}
                            onChange={(e) => setSelectedTeam(e.target.value)}
                            disabled={!selectedDept}
                        >
                            <option value="">{selectedDept && teams.length === 0 ? 'No teams' : 'All Teams'}</option>
                            {teams.map(t => (
                                <option key={t.id} value={t.id}>{t.team_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="slp-search-group">
                        <label><Search fontSize="small" /> Search</label>
                        <input
                            type="text"
                            placeholder="Name, Phone, or Email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="slp-content">
                {loading ? (
                    <div className="slp-loading">Loading leads...</div>
                ) : !selectedCompany ? (
                    <div className="slp-empty">Please select a company to view leads.</div>
                ) : filteredLeads.length === 0 ? (
                    <div className="slp-empty">No leads found matching your criteria.</div>
                ) : (
                    <div className="slp-table-container">
                        <table className="slp-table">
                            <thead>
                                <tr>
                                    <th>Customer Name</th>
                                    <th>Phone</th>
                                    {customFields.map(f => (
                                        <th key={f.COLUMN_NAME}>
                                            {f.COLUMN_NAME.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                        </th>
                                    ))}
                                    <th>Last Updated</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLeads.map(lead => (
                                    <tr key={lead.id}>
                                        <td className="slp-name-cell">{lead.first_name} {lead.last_name || ''}</td>
                                        <td>{lead.phone_no}</td>
                                        {customFields.map(f => (
                                            <td key={f.COLUMN_NAME}>
                                                {f.COLUMN_NAME === 'call_status'
                                                    ? <span className={`slp-status-tag ${(lead[f.COLUMN_NAME] || 'new').toLowerCase().replace(/ /g, '-')}`}>
                                                        {lead[f.COLUMN_NAME] || 'New'}
                                                    </span>
                                                    : (lead[f.COLUMN_NAME] ?? '—')
                                                }
                                            </td>
                                        ))}
                                        <td>{lead.last_updated ? new Date(lead.last_updated).toLocaleString() : '—'}</td>
                                        <td className="slp-actions">
                                            <div className="slp-actions">
                                                <button
                                                    className="slp-action-btn edit"
                                                    onClick={() => handleEditLead(lead)}
                                                >
                                                    <Edit sx={{ fontSize: 16 }} /> Edit
                                                </button>
                                                <button
                                                    className="slp-action-btn history"
                                                    onClick={() => handleViewHistory(lead)}
                                                    title="View Update History"
                                                >
                                                    <HistoryIcon sx={{ fontSize: 16 }} /> History
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* History Modal */}
            {showHistoryModal && selectedLeadForHistory && (
                <div className="ap-modal-overlay">
                    <div className="ap-modal">
                        <div className="ap-modal-header">
                            <h3><HistoryIcon className="ap-icon" /> Update History: {selectedLeadForHistory.first_name}</h3>
                            <button className="ap-modal-close" onClick={() => setShowHistoryModal(false)}>
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="ap-modal-body">
                            <LastChanges
                                customerId={selectedLeadForHistory.id}
                                phone_no={selectedLeadForHistory.phone_no}
                            />
                        </div>
                        <div className="ap-modal-footer">
                            <button className="ap-btn-grey" onClick={() => setShowHistoryModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperLeadsPortal;
