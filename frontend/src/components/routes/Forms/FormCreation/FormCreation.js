// src/components/routes/Forms/FormCreation/FormCreation.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './FormCreation.css';

const FormCreation = () => {
    const navigate = useNavigate();
    const [customFields, setCustomFields] = useState([]);
    const [loading, setLoading] = useState(true);
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
        } finally {
            setLoading(false);
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
                    <span className="section-label">Mandatory Fields (Non-Editable)</span>
                    <div className="form-grid">
                        {mandatoryFields.map(field => (
                            <div key={field.name} className="field-card mandatory">
                                <label className="field-label">{field.label} <span style={{ color: 'red' }}>*</span></label>
                                <input className="field-preview" type="text" disabled placeholder={`Type: ${field.type}`} />
                                <div className="field-meta">
                                    <span>System Field</span>
                                    <span className="field-type-badge">{field.type}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Custom Fields Section */}
                <div className="custom-section">
                    <span className="section-label">Custom Fields (Added by You)</span>
                    <div className="form-grid">
                        {customFields.map(field => (
                            <div key={field.COLUMN_NAME} className="field-card custom">
                                <label className="field-label">
                                    {field.COLUMN_NAME.replace(/_/g, ' ').toUpperCase()}
                                    {field.IS_NULLABLE === 'NO' && <span style={{ color: 'red' }}> *</span>}
                                </label>
                                <input
                                    className="field-preview"
                                    type="text"
                                    disabled
                                    placeholder={field.COLUMN_DEFAULT ? `Default: ${field.COLUMN_DEFAULT}` : ''}
                                />
                                <div className="field-meta">
                                    <span>Custom Field</span>
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
                    <button className="add-field-btn-large" onClick={() => setShowModal(true)}>
                        <span>+</span> Add New Field
                    </button>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>Add Custom Field</h3>
                        {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

                        <div className="field-form">
                            <input
                                type="text"
                                value={newField.fieldName}
                                onChange={(e) => handleFieldInputChange('fieldName', e.target.value)}
                                placeholder="Field Name (e.g., Customer Type)"
                            />

                            <select
                                value={newField.fieldType}
                                onChange={(e) => handleFieldInputChange('fieldType', e.target.value)}
                            >
                                <option value="VARCHAR">Text (VARCHAR)</option>
                                <option value="TEXT">Long Text (TEXT)</option>
                                <option value="INT">Number (INT)</option>
                                <option value="DECIMAL">Decimal (DECIMAL)</option>
                                <option value="DATE">Date</option>
                                <option value="DATETIME">Date & Time</option>
                                <option value="ENUM">Dropdown (ENUM)</option>
                            </select>

                            {newField.fieldType === 'VARCHAR' && (
                                <input
                                    type="number"
                                    value={newField.fieldLength}
                                    onChange={(e) => handleFieldInputChange('fieldLength', e.target.value)}
                                    placeholder="Max Length"
                                    min="1"
                                    max="65535"
                                />
                            )}

                            {newField.fieldType === 'ENUM' && (
                                <div className="enum-values">
                                    <label>Dropdown Options:</label>
                                    {newField.enumValues.map((value, index) => (
                                        <div key={index} className="enum-value-row">
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
                                                    className="remove-enum-btn"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={addEnumValue}
                                        className="add-enum-btn"
                                    >
                                        + Add Option
                                    </button>
                                </div>
                            )}

                            <input
                                type="text"
                                value={newField.defaultValue}
                                onChange={(e) => handleFieldInputChange('defaultValue', e.target.value)}
                                placeholder="Default Value (optional)"
                            />

                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={newField.isRequired}
                                    onChange={(e) => handleFieldInputChange('isRequired', e.target.checked)}
                                />
                                Required Field
                            </label>

                            <div className="modal-actions">
                                <button onClick={handleCreateField} className="create-button">Create Field</button>
                                <button onClick={() => setShowModal(false)} className="cancel-button">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormCreation;
