// src/components/routes/Forms/FormCreation/FormCreation.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './FormCreation.css';

const FormCreation = () => {
    const navigate = useNavigate();
    const [customFields, setCustomFields] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState('');

    // New field state
    const [newField, setNewField] = useState({
        fieldName: '',
        fieldType: 'VARCHAR',
        fieldLength: '255',
        enumValues: [''],
        defaultValue: '',
        isRequired: false
    });

    // Mandatory fields that are always present
    const mandatoryFields = [
        { name: 'first_name', label: 'First Name', type: 'VARCHAR', required: true },
        { name: 'phone_no', label: 'Phone', type: 'VARCHAR', required: true },
        { name: 'agent_name', label: 'Assigned Agent', type: 'VARCHAR', required: true }
    ];

    useEffect(() => {
        fetchCustomFields();
    }, []);

    const fetchCustomFields = async () => {
        try {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.REACT_APP_API_URL;

            const response = await axios.get(`${apiUrl}/custom-fields`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                // Filter out standard fields and keep only custom ones added by BH
                // For this demo, we'll try to identify custom fields or simply exclude known standard ones
                const standardFields = [
                    'id', 'created_at', 'updated_at', 'last_updated',
                    'first_name', 'last_name', 'company_name', 'phone_no', 'email_id',
                    'address', 'lead_source', 'call_date_time', 'call_status',
                    'call_outcome', 'call_recording', 'product', 'budget',
                    'decision_making', 'decision_time', 'lead_stage', 'next_follow_up',
                    'assigned_agent', 'reminder_notes', 'priority_level', 'customer_category',
                    'tags_labels', 'communcation_channel', 'deal_value', 'conversion_status',
                    'customer_history', 'comment', 'agent_name', 'company_id', 'team_id', 'duplicate_action'
                ];

                const custom = response.data.fields.filter(field =>
                    !standardFields.includes(field.COLUMN_NAME)
                );

                setCustomFields(custom);
            }
        } catch (err) {
            console.error('Error fetching fields:', err);
            setError('Failed to load custom fields');
        }
    };

    const handleFieldInputChange = (field, value) => {
        setNewField(prev => ({ ...prev, [field]: value }));
    };

    const handleEnumValueChange = (index, value) => {
        const updated = [...newField.enumValues];
        updated[index] = value;
        setNewField(prev => ({ ...prev, enumValues: updated }));
    };

    const addEnumValue = () => {
        setNewField(prev => ({ ...prev, enumValues: [...prev.enumValues, ''] }));
    };

    const removeEnumValue = (index) => {
        if (newField.enumValues.length > 1) {
            setNewField(prev => ({
                ...prev,
                enumValues: prev.enumValues.filter((_, i) => i !== index)
            }));
        }
    };

    const handleCreateField = async () => {
        try {
            if (!newField.fieldName.trim()) {
                setError('Field name is required');
                return;
            }

            const token = localStorage.getItem('token');
            const apiUrl = process.env.REACT_APP_API_URL;

            const fieldData = {
                fieldName: newField.fieldName,
                fieldType: newField.fieldType,
                fieldLength: newField.fieldLength,
                enumValues: newField.fieldType === 'ENUM' ? newField.enumValues.filter(v => v.trim()) : null,
                defaultValue: newField.defaultValue,
                isRequired: newField.isRequired
            };

            await axios.post(`${apiUrl}/custom-fields`, fieldData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            setShowModal(false);
            setNewField({
                fieldName: '',
                fieldType: 'VARCHAR',
                fieldLength: '255',
                enumValues: [''],
                defaultValue: '',
                isRequired: false
            });
            fetchCustomFields(); // Refresh list
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create field');
        }
    };

    const handleDeleteField = async (fieldName) => {
        if (!window.confirm(`Are you sure you want to delete the field "${fieldName}"? This will permanently delete all data in this column!`)) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.REACT_APP_API_URL;

            await axios.delete(`${apiUrl}/custom-fields/${fieldName}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            fetchCustomFields();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete field');
        }
    };

    return (
        <div className="form-creation-container">
            <div className="form-header">
                <h2>CRM Field Form</h2>
                <button className="back-btn" onClick={() => navigate('/admin')}>
                    Back to Portal
                </button>
            </div>

            <div className="form-layout-preview">
                {/* Mandatory Section */}
                <div className="mandatory-section">
                    <div className="section-header">
                        <span className="section-icon">🛡️</span>
                        <div className="section-text">
                            <h3 className="section-title">Essential System Fields</h3>
                            <p className="section-subtitle">These fields are required for the core CRM functionality and cannot be modified.</p>
                        </div>
                    </div>
                    <div className="form-grid">
                        {mandatoryFields.map(field => (
                            <div key={field.name} className="field-card mandatory">
                                <label className="field-label">{field.label} <span className="required-star">*</span></label>
                                <input className="field-preview" type="text" disabled placeholder={`Data Type: ${field.type}`} />
                                <div className="field-meta">
                                    <span className="meta-tag">System Field</span>
                                    <span className="field-type-badge">{field.type}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Custom Fields Section */}
                <div className="custom-section">
                    <div className="section-header">
                        <span className="section-icon">✨</span>
                        <div className="section-text">
                            <h3 className="section-title">Your Custom Fields</h3>
                            <p className="section-subtitle">Additional fields you've added to capture specific data for your business.</p>
                        </div>
                    </div>
                    <div className="form-grid">
                        {customFields.map(field => (
                            <div key={field.COLUMN_NAME} className="field-card custom">
                                <label className="field-label">
                                    {field.COLUMN_NAME.replace(/_/g, ' ').toUpperCase()}
                                    {field.IS_NULLABLE === 'NO' && <span className="required-star"> *</span>}
                                </label>
                                <input
                                    className="field-preview"
                                    type="text"
                                    disabled
                                    placeholder={field.COLUMN_DEFAULT ? `Default: ${field.COLUMN_DEFAULT}` : 'No default value'}
                                />
                                <div className="field-meta">
                                    <span className="meta-tag">Custom Field</span>
                                    <span className="field-type-badge">{field.DATA_TYPE.toUpperCase()}</span>
                                </div>
                                <button
                                    className="delete-field-btn"
                                    onClick={() => handleDeleteField(field.COLUMN_NAME)}
                                    title="Delete Field"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Add Field Button */}
                <div className="add-field-section">
                    <button className="add-field-btn-premium" onClick={() => setShowModal(true)}>
                        <span className="btn-icon">+</span>
                        <span className="btn-text">Define New Custom Field</span>
                    </button>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content premium-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header-premium">
                            <div className="header-content">
                                <h3>Create Custom Field</h3>
                                <p>Define a new data column for your CRM records</p>
                            </div>
                            <button className="close-modal-btn" onClick={() => setShowModal(false)}>&times;</button>
                        </div>

                        {error && <div className="modal-error-message">{error}</div>}

                        <div className="premium-form">
                            <div className="form-row">
                                <div className="form-group full">
                                    <label>Display Name</label>
                                    <input
                                        type="text"
                                        value={newField.fieldName}
                                        onChange={(e) => handleFieldInputChange('fieldName', e.target.value)}
                                        placeholder="e.g., WhatsApp Number, Customer Interest"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="form-row split">
                                <div className="form-group">
                                    <label>Data Type</label>
                                    <select
                                        value={newField.fieldType}
                                        onChange={(e) => handleFieldInputChange('fieldType', e.target.value)}
                                    >
                                        <option value="VARCHAR">Short Text (VARCHAR)</option>
                                        <option value="TEXT">Long Text (TEXT)</option>
                                        <option value="INT">Whole Number (INT)</option>
                                        <option value="DECIMAL">Price/Decimal (DECIMAL)</option>
                                        <option value="DATE">Calendar Date</option>
                                        <option value="DATETIME">Date & Time</option>
                                        <option value="ENUM">Fixed Dropdown (ENUM)</option>
                                    </select>
                                </div>

                                {newField.fieldType === 'VARCHAR' && (
                                    <div className="form-group">
                                        <label>Max Characters</label>
                                        <input
                                            type="number"
                                            value={newField.fieldLength}
                                            onChange={(e) => handleFieldInputChange('fieldLength', e.target.value)}
                                            placeholder="255"
                                            min="1"
                                            max="65535"
                                        />
                                    </div>
                                )}
                            </div>

                            {newField.fieldType === 'ENUM' && (
                                <div className="enum-builder">
                                    <label>Dropdown Options</label>
                                    <div className="enum-list">
                                        {newField.enumValues.map((value, index) => (
                                            <div key={index} className="enum-input-wrap">
                                                <input
                                                    type="text"
                                                    value={value}
                                                    onChange={(e) => handleEnumValueChange(index, e.target.value)}
                                                    placeholder={`Option ${index + 1}`}
                                                />
                                                {newField.enumValues.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeEnumValue(index)}
                                                        className="remove-option-btn"
                                                    >
                                                        &times;
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addEnumValue}
                                        className="add-option-link"
                                    >
                                        + Add another option
                                    </button>
                                </div>
                            )}

                            <div className="form-row">
                                <div className="form-group full">
                                    <label>Default Value (Optional)</label>
                                    <input
                                        type="text"
                                        value={newField.defaultValue}
                                        onChange={(e) => handleFieldInputChange('defaultValue', e.target.value)}
                                        placeholder="What should be pre-filled?"
                                    />
                                </div>
                            </div>

                            <div className="form-footer-options">
                                <label className="premium-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={newField.isRequired}
                                        onChange={(e) => handleFieldInputChange('isRequired', e.target.checked)}
                                    />
                                    <span className="checkbox-text">Make this field mandatory</span>
                                </label>
                            </div>

                            <div className="premium-modal-actions">
                                <button onClick={() => setShowModal(false)} className="btn-cancel">Cancel</button>
                                <button onClick={handleCreateField} className="btn-submit">Initialize Field</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormCreation;
