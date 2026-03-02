import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import './Dashboard.css';

const SuperAdminDashboard = () => {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        company_name: '',
        company_email: '',
        company_username: '',
        admin_limit: 5,
        user_limit: 10,
        bh_username: '',
        bh_email: ''
    });
    const [showUserModal, setShowUserModal] = useState(false);
    const [modalUsers, setModalUsers] = useState([]);
    const [modalTitle, setModalTitle] = useState('');
    const [modalLoading, setModalLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [adminCounts, setAdminCounts] = useState({});

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const response = await api.get('/super-admin/companies');
            const companiesData = response.data.data;
            setCompanies(companiesData);
            setLoading(false);

            const counts = {};
            await Promise.all(companiesData.map(async company => {
                try {
                    const res = await api.get('/players/users', {
                        params: { company_id: company.id, role_type: 'admin_view' }
                    });
                    counts[company.id] = (res.data.data || []).length;
                } catch { counts[company.id] = company.used_admin_licenses || 0; }
            }));
            setAdminCounts(counts);
        } catch (error) {
            console.error('Error fetching companies:', error);
            setError('Failed to load companies');
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const response = await api.post('/super-admin/companies', formData);
            setSuccess(response.data.message);
            setShowCreateForm(false);
            setFormData({
                company_name: '',
                company_email: '',
                company_username: '',
                admin_limit: 5,
                user_limit: 10,
                bh_username: '',
                bh_email: ''
            });
            fetchCompanies();
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to create company');
        }
    };

    const handleDeactivate = async (companyId) => {
        if (!window.confirm('Are you sure you want to deactivate this company?')) return;
        try {
            await api.patch(`/super-admin/companies/${companyId}/deactivate`);
            setSuccess('Company deactivated successfully');
            fetchCompanies();
        } catch (error) {
            setError('Failed to deactivate company');
        }
    };

    const handleViewUsers = async (companyId, companyName, type) => {
        setModalTitle(`${type === 'admin_view' ? 'Admins' : 'Users'} - ${companyName}`);
        setModalUsers([]);
        setModalLoading(true);
        setShowUserModal(true);
        try {
            const res = await api.get('/players/users', {
                params: { company_id: companyId, role_type: type }
            });
            setModalUsers(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch users:', err);
            setModalUsers([]);
        } finally {
            setModalLoading(false);
        }
    };

    if (loading) return <div className="loading">Loading...</div>;

    return (
        <div className="super-admin-dashboard">
            <div className="dashboard-header">
                <h1>Super Admin Dashboard</h1>
                <div className="dashboard-actions">
                    <button className="btn-hierarchy" onClick={() => navigate('/super-admin/leads')}>
                        Leads Portal
                    </button>
                    <button className="btn-create-company" onClick={() => setShowCreateForm(!showCreateForm)}>
                        {showCreateForm ? 'Cancel' : '+ Create Company'}
                    </button>
                </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {showCreateForm && (
                <div className="create-company-form">
                    <h2>Create New Company</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Company Name *</label>
                                <input type="text" name="company_name" value={formData.company_name} onChange={handleInputChange} required />
                            </div>
                            <div className="form-group">
                                <label>Admin Limit *</label>
                                <input type="number" name="admin_limit" value={formData.admin_limit} onChange={handleInputChange} min="1" required />
                            </div>
                            <div className="form-group">
                                <label>User Limit *</label>
                                <input type="number" name="user_limit" value={formData.user_limit} onChange={handleInputChange} min="1" required />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Company Email *</label>
                                <input type="email" name="company_email" value={formData.company_email} onChange={handleInputChange} required />
                            </div>
                            <div className="form-group">
                                <label>Company Username *</label>
                                <input type="text" name="company_username" value={formData.company_username} onChange={handleInputChange} required />
                            </div>
                        </div>
                        <h3>Business Head Details</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label>BH Username *</label>
                                <input type="text" name="bh_username" value={formData.bh_username} onChange={handleInputChange} required />
                            </div>
                            <div className="form-group">
                                <label>BH Email *</label>
                                <input type="email" name="bh_email" value={formData.bh_email} onChange={handleInputChange} required />
                            </div>
                        </div>
                        <button type="submit" className="btn-submit">Create Company</button>
                    </form>
                </div>
            )}

            <div className="companies-list">
                <h2>Companies ({companies.length})</h2>
                <div className="companies-grid">
                    {companies.map(company => (
                        <div key={company.id} className={`company-card ${!company.is_active ? 'inactive' : ''}`}>
                            <div className="company-header">
                                <h3>{company.company_name}</h3>
                                <span className={`status-badge ${company.is_active ? 'active' : 'inactive'}`}>
                                    {company.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div className="company-details">
                                <p><strong>Email:</strong> {company.company_email}</p>
                                <p><strong>Business Head:</strong> {company.bh_username}</p>
                                <p><strong>Created:</strong> {new Date(company.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className="license-info">
                                <div className="license-bar">
                                    <div className="license-used admin" style={{ width: `${(company.used_admin_licenses / company.total_admin_licenses) * 100}%`, background: '#EF6F53' }}></div>
                                    <div className="license-used user" style={{ width: `${(company.used_user_licenses / company.total_user_licenses) * 100}%`, background: '#4caf50' }}></div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '4px' }}>
                                    <span style={{ color: '#EF6F53' }}>Admins: {company.used_admin_licenses}/{company.total_admin_licenses}</span>
                                    <span style={{ color: '#4caf50' }}>Users: {company.used_user_licenses}/{company.total_user_licenses}</span>
                                </div>
                                <p><strong>Licenses:</strong> {company.used_licenses} / {company.total_licenses} used ({company.available_licenses} available)</p>
                            </div>
                            <div className="company-stats">
                                <div className="stat" onClick={() => handleViewUsers(company.id, company.company_name, 'admin_view')} style={{ cursor: 'pointer' }}>
                                    <span className="stat-value">{adminCounts[company.id] ?? '...'}</span>
                                    <span className="stat-label">Admins</span>
                                </div>
                                <div className="stat" onClick={() => handleViewUsers(company.id, company.company_name, 'user_view')} style={{ cursor: 'pointer' }}>
                                    <span className="stat-value">{company.total_users}</span>
                                    <span className="stat-label">Users</span>
                                </div>
                            </div>
                            {company.is_active && (
                                <button className="btn-deactivate" onClick={() => handleDeactivate(company.id)}>
                                    Deactivate
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {showUserModal && (
                <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{modalTitle}</h3>
                            <button className="close-btn" onClick={() => setShowUserModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {modalLoading ? <p style={{ padding: '2rem', textAlign: 'center' }}>Loading...</p> : (
                                <table className="user-table">
                                    <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Role</th></tr></thead>
                                    <tbody>
                                        {modalUsers.length > 0 ? modalUsers.map((u, idx) => (
                                            <tr key={u.id}>
                                                <td style={{ color: '#94a3b8' }}>{idx + 1}</td>
                                                <td style={{ fontWeight: 600 }}>{u.username}</td>
                                                <td style={{ color: '#475569' }}>{u.email}</td>
                                                <td><span className={`role-chip ${u.role}`}>{u.role?.replace(/_/g, ' ')}</span></td>
                                            </tr>
                                        )) : <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No users found</td></tr>}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminDashboard;
