// frontend/src/components/SuperAdmin/Dashboard.js
// Super Admin Dashboard for managing companies

import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import './Dashboard.css';

const SuperAdminDashboard = () => {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        company_name: '',
        company_email: '',
        company_username: '',
        license_limit: 10,
        bh_username: '',
        bh_email: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const response = await api.get('/super-admin/companies');
            setCompanies(response.data.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching companies:', error);
            setError('Failed to load companies');
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
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
                license_limit: 10,
                bh_username: '',
                bh_email: ''
            });
            fetchCompanies();
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to create company');
        }
    };

    const handleDeactivate = async (companyId) => {
        if (!window.confirm('Are you sure you want to deactivate this company?')) {
            return;
        }

        try {
            await api.patch(`/super-admin/companies/${companyId}/deactivate`);
            setSuccess('Company deactivated successfully');
            fetchCompanies();
        } catch (error) {
            setError('Failed to deactivate company');
        }
    };

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="super-admin-dashboard">
            <div className="dashboard-header">
                <h1>Super Admin Dashboard</h1>
                <button
                    className="btn-create-company"
                    onClick={() => setShowCreateForm(!showCreateForm)}
                >
                    {showCreateForm ? 'Cancel' : '+ Create Company'}
                </button>
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
                                <input
                                    type="text"
                                    name="company_name"
                                    value={formData.company_name}
                                    onChange={handleInputChange}
                                    placeholder="e.g., XYZ Corporation"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>License Limit *</label>
                                <input
                                    type="number"
                                    name="license_limit"
                                    value={formData.license_limit}
                                    onChange={handleInputChange}
                                    min="1"
                                    placeholder="Number of users allowed"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Company Email *</label>
                                <input
                                    type="email"
                                    name="company_email"
                                    value={formData.company_email}
                                    onChange={handleInputChange}
                                    placeholder="e.g., contact@xyzcompany.com"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Company Username *</label>
                                <input
                                    type="text"
                                    name="company_username"
                                    value={formData.company_username}
                                    onChange={handleInputChange}
                                    placeholder="e.g., xyzcompany"
                                    required
                                />
                            </div>
                        </div>

                        <h3>Business Head Details</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label>BH Username *</label>
                                <input
                                    type="text"
                                    name="bh_username"
                                    value={formData.bh_username}
                                    onChange={handleInputChange}
                                    placeholder="e.g., john_doe"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>BH Email *</label>
                                <input
                                    type="email"
                                    name="bh_email"
                                    value={formData.bh_email}
                                    onChange={handleInputChange}
                                    placeholder="e.g., admin@xyzcompany.com"
                                    required
                                />
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
                                    <div
                                        className="license-used"
                                        style={{ width: `${(company.used_licenses / company.total_licenses) * 100}%` }}
                                    ></div>
                                </div>
                                <p>
                                    <strong>Licenses:</strong> {company.used_licenses} / {company.total_licenses} used
                                    ({company.available_licenses} available)
                                </p>
                            </div>
                            <div className="company-stats">
                                <div className="stat">
                                    <span className="stat-value">{company.total_users}</span>
                                    <span className="stat-label">Users</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-value">{company.total_customers}</span>
                                    <span className="stat-label">Customers</span>
                                </div>
                            </div>
                            {company.is_active && (
                                <button
                                    className="btn-deactivate"
                                    onClick={() => handleDeactivate(company.id)}
                                >
                                    Deactivate
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
