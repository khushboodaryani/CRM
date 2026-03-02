// src/components/routes/Forms/UseForm/UseForm.js

import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";
import "./UseForm.css";
import LastChanges from "../LastChange/LastChange";
import EditIcon from '@mui/icons-material/Edit';  // Import edit icon


const UseForm = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { phone_no } = useParams();
    const [loading, setLoading] = useState(true);
    const [hasDeletePermission, setHasDeletePermission] = useState(false);
    const [requiresDeleteApproval, setRequiresDeleteApproval] = useState(false);
    const [customer, setCustomer] = useState(null);
    const [editingInfo, setEditingInfo] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
    const alertShownRef = useRef(false);

    // Check if we are in read-only mode (passed from View button in admin portals)
    const readOnly = location.state?.readOnly === true;

    const [formData, setFormData] = useState({
        first_name: '',
        phone_no: '',
        agent_name: ''
    });
    const [customFields, setCustomFields] = useState([]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        let processedValue = value;

        // Special handling for phone numbers
        if (name.includes('phone')) {
            // Allow + only at the start and numbers
            processedValue = value.replace(/[^0-9+]/g, '');
            if (processedValue.includes('+') && !processedValue.startsWith('+')) {
                processedValue = processedValue.replace('+', '');
            }
        }

        setFormData(prev => ({ ...prev, [name]: processedValue }));
    };


    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';

            // Format as YYYY-MM-DDThh:mm
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');

            return `${year}-${month}-${day}T${hours}:${minutes}`;
        } catch (error) {
            console.error('Error formatting date:', error);
            return '';
        }
    };

    const formatPhoneForDisplay = (phone) => {
        if (!phone) return '';
        // If number starts with 00, replace with +
        if (phone.startsWith('00')) {
            return '+' + phone.substring(2);
        }
        return phone;
    };

    const formatPhoneForStorage = (phone) => {
        if (!phone) return '';
        // If number starts with +, replace with 00
        if (phone.startsWith('+')) {
            return '00' + phone.substring(1);
        }
        return phone;
    };

    const handleScheduledAtClick = (e) => {
        // Remove readonly temporarily to allow picker to show
        e.target.readOnly = false;
        e.target.showPicker();
        // Add an event listener to make it readonly again after selection
        e.target.addEventListener('blur', function onBlur() {
            e.target.readOnly = true;
            e.target.removeEventListener('blur', onBlur);
        });
    };

    const fetchUser = async () => {
        try {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.REACT_APP_API_URL;

            // Get user data
            const userResponse = await axios.get(`${apiUrl}/current-user`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const userData = userResponse.data;

            // Check for delete permission
            const permissions = userData.permissions || [];
            const hasDeletePerm = Array.isArray(permissions) && permissions.includes('delete_customer');
            setHasDeletePermission(hasDeletePerm);

            // Store requires_delete_approval flag so handleDelete can act on it proactively
            setRequiresDeleteApproval(userData.requires_delete_approval === true);

        } catch (fetchErr) {
            console.error('Error in fetchUser:', fetchErr);
            setLoading(false);
        }
    };

    // Fetch custom fields on component mount
    useEffect(() => {
        const fetchCustomFields = async () => {
            try {
                const token = localStorage.getItem('token');
                const apiUrl = process.env.REACT_APP_API_URL;

                const response = await axios.get(`${apiUrl}/custom-fields`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.success) {
                    const systemFields = [
                        'id', 'created_at', 'updated_at', 'last_updated',
                        'company_id', 'team_id', 'duplicate_action', 'C_unique_id', 'date_created',
                        'department_id', 'sub_department_id', 'assigned_to'
                    ];
                    const mandatoryFields = ['first_name', 'phone_no', 'agent_name'];

                    const allFields = response.data.fields.filter(field =>
                        !systemFields.includes(field.COLUMN_NAME)
                    );

                    const custom = allFields.filter(field =>
                        !mandatoryFields.includes(field.COLUMN_NAME)
                    );

                    setCustomFields(custom);
                }
            } catch (err) {
                console.error('Error fetching custom fields:', err);
            }
        };
        fetchCustomFields();
    }, []);

    useEffect(() => {
        fetchUser();
        const fetchCustomerData = async () => {
            if (location.state?.customer) {
                const customerData = location.state.customer;
                setCustomer(customerData);

                // Format data for display
                const displayData = { ...customerData };
                Object.keys(displayData).forEach(key => {
                    if (key.includes('phone') && displayData[key]) {
                        displayData[key] = formatPhoneForDisplay(displayData[key]);
                    }
                    // Format datetime fields for input
                    if ((key === 'call_date_time' || key === 'next_follow_up' || key === 'scheduled_at') && displayData[key]) {
                        displayData[key] = formatDateForInput(displayData[key]);
                    }
                });
                setFormData(displayData);
                setLoading(false);
            } else if (phone_no) {
                try {
                    const apiUrl = process.env.REACT_APP_API_URL;
                    const token = localStorage.getItem('token');
                    const response = await axios.get(`${apiUrl}/customers/phone/${phone_no}`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    });
                    if (response.data?.customer) {
                        const customerData = response.data.customer;
                        setCustomer(customerData);

                        // Format data for display
                        const displayData = { ...customerData };
                        Object.keys(displayData).forEach(key => {
                            if (key.includes('phone') && displayData[key]) {
                                displayData[key] = formatPhoneForDisplay(displayData[key]);
                            }
                            // Format datetime fields for input
                            if ((key === 'call_date_time' || key === 'next_follow_up' || key === 'scheduled_at') && displayData[key]) {
                                displayData[key] = formatDateForInput(displayData[key]);
                            }
                        });
                        setFormData(displayData);
                    } else {
                        navigate(`/customer/new/${phone_no}`, { state: { phone_no } });
                    }
                } catch (error) {
                    if (!alertShownRef.current && error.response?.status === 404) {
                        alert("Customer not found. Redirecting to create a new customer.");
                        alertShownRef.current = true;
                        navigate(`/customer/new/${phone_no}`, { state: { phone_no } });
                    } else {
                        console.error(error);
                    }
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchCustomerData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phone_no]); // Add phone_no as dependency since it's used in fetchCustomerData

    useEffect(() => {
        if (customer) {
            // Format phone numbers and datetime fields for display when loading data
            const displayData = { ...customer };
            Object.keys(displayData).forEach(key => {
                if (key.includes('phone') && displayData[key]) {
                    displayData[key] = formatPhoneForDisplay(displayData[key]);
                }
                // Format datetime fields for input
                if ((key === 'call_date_time' || key === 'next_follow_up' || key === 'scheduled_at') && displayData[key]) {
                    displayData[key] = formatDateForInput(displayData[key]);
                }
            });
            setFormData(displayData);
        }
    }, [customer]);

    const handleDelete = async () => {
        if (!hasDeletePermission) {
            alert("You do not have permission to delete customers.");
            return;
        }
        const confirmDelete = window.confirm("Are you sure you want to delete this customer?");
        console.log('[DEBUG] Single delete confirmed for ID:', customer.id);
        if (!confirmDelete) return;

        const token = localStorage.getItem('token');
        const apiUrl = process.env.REACT_APP_API_URL;

        try {
            // ── Proactive approval check: if we already know this user needs approval,
            //    skip the DELETE call entirely and go straight to the request endpoint.
            if (requiresDeleteApproval) {
                await axios.post(
                    `${apiUrl}/customers/${customer.id}/request-delete`,
                    {},
                    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
                );
                const name = customer.first_name
                    ? `${customer.first_name} ${customer.last_name || ''}`.trim()
                    : `#${customer.id}`;
                alert(`Approval request sent for deleting "${name}". You will be notified once reviewed.`);
                return; // Customer stays — don't navigate away
            }

            // ── Normal delete (no approval required) ─────────────────────────────
            const response = await axios.delete(`${apiUrl}/customers/${customer.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            // Backend safety-net: 202 = approval required (stale state edge-case)
            if (response.status === 202 && response.data?.requires_approval) {
                await axios.post(
                    `${apiUrl}/customers/${customer.id}/request-delete`,
                    {},
                    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
                );
                alert(`Approval request sent for deleting "${response.data.customerName}". You will be notified once reviewed.`);
                return;
            }

            alert('Customer deleted successfully.');
            navigate('/customers');
        } catch (error) {
            if (error.response?.status === 409) {
                // Duplicate pending request — treat as success
                alert('A delete approval request is already pending for this record.');
            } else if (error.response?.status === 403) {
                alert('You do not have permission to delete customers.');
                await fetchUser(); // Refresh permissions
            } else {
                console.error('Error deleting customer:', error);
                alert('Failed to delete customer. Please try again.');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate required fields dynamically
        const mandatoryFields = ['first_name', 'phone_no', 'agent_name'];
        const allRequiredFields = [
            ...mandatoryFields,
            ...customFields.filter(f => f.IS_NULLABLE === 'NO').map(f => f.COLUMN_NAME)
        ];

        const missingFields = allRequiredFields
            .filter(field => !formData[field] || (typeof formData[field] === 'string' && !formData[field].trim()))
            .map(field => field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));

        if (missingFields.length > 0) {
            alert(`Please fill in the following mandatory details:\n• ${missingFields.join('\n• ')}`);
            return;
        }

        // Check if any fields have actually changed and prepare data for backend
        const changedFields = {};
        Object.keys(formData).forEach(key => {
            let currentValue = formData[key];
            let originalValue = customer[key];

            // Convert phone numbers back to storage format for comparison and submission
            if (key.includes('phone') && currentValue) {
                currentValue = formatPhoneForStorage(currentValue);
            }

            // For datetime fields, ensure proper formatting
            if ((key === 'call_date_time' || key === 'next_follow_up' || key === 'scheduled_at') && currentValue) {
                // If the value is already in the correct format, keep it; otherwise format it
                if (currentValue && !currentValue.includes('T')) {
                    currentValue = formatDateForInput(currentValue);
                }
            }

            if (currentValue !== originalValue) {
                changedFields[key] = currentValue;
            }
        });

        // If no fields changed, return early without making API call
        if (Object.keys(changedFields).length === 0) {
            navigate("/customers");
            return;
        }

        // Validate phone number length (excluding + if present)
        const phoneLength = formData.phone_no.replace('+', '').length;
        if (phoneLength < 8) {
            alert('Primary phone number must be at least 8 digits');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.REACT_APP_API_URL;

            // Update customer data - only send changed fields
            await axios.put(
                `${apiUrl}/customers/${customer.id}`,
                changedFields,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            // Re-fetch the updated customer to refresh data and history
            const refreshed = await axios.get(`${apiUrl}/customers/phone/${formData.phone_no || phone_no}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const updatedCustomer = refreshed.data?.customer || formData;
            setCustomer(updatedCustomer);
            setFormData(updatedCustomer);

            // Increment refresh key to trigger LastChanges re-fetch
            setHistoryRefreshKey(prev => prev + 1);

            // Show brief inline success
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 4000);
        } catch (error) {
            console.error('Update error:', error);
            console.error('Error response:', error.response?.data);
            const backendErrors = error.response?.data?.errors;
            if (backendErrors) {
                alert(`Update failed: ${backendErrors.join('\n')}`);
            } else if (error.response?.data?.error) {
                alert(`Update failed: ${error.response.data.error}`);
            } else if (error.response?.data?.message) {
                alert(`Update failed: ${error.response.data.message}`);
            } else {
                alert(`Failed to update customer. Please try again.\nError: ${error.message}`);
            }
        }
    };

    if (loading) return <div className="uf-loading">Loading customer data...</div>;
    if (!customer) return <div className="uf-loading">No customer data found.</div>;

    /* ── Read-Only View Mode ──────────────────────────────────────────── */
    if (readOnly) {
        return (
            <div>
                <div className="header-containerrr">
                    <button
                        onClick={() => navigate(-1)}
                        className="uf-back-btn"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                        <img src="/uploads/house-fill.svg" alt="Back" className="home-icon" />
                    </button>
                    <h2 className="list_form_headiii">VIEW RECORD</h2>
                    <button
                        className="uf-edit-switch-btn"
                        onClick={() => navigate(`/customers/phone/${formData.phone_no || phone_no}`, { state: { customer, permissions: location.state?.permissions, readOnly: false } })}
                        style={{
                            background: '#1a73e8', color: 'white', border: 'none',
                            padding: '6px 16px', borderRadius: '8px', cursor: 'pointer',
                            fontWeight: 600, fontSize: '0.85rem'
                        }}
                    >
                        ✏️ Edit
                    </button>
                </div>

                <div className="use-last-container">
                    <div className="use-form-container">
                        <div className="customer-info-header">
                            <div className="customer-info-section">
                                <div className="customer-name">{formData.first_name} {formData.last_name}</div>
                                <div className="customer-phone">{formatPhoneForDisplay(formData.phone_no)}</div>
                            </div>
                        </div>

                        <div className="uf-view-grid">
                            {/* Fixed fields */}
                            <div className="uf-view-field">
                                <span className="uf-view-label">Agent</span>
                                <span className="uf-view-value">{formData.agent_name || '—'}</span>
                            </div>

                            <div className="uf-view-field">
                                <span className="uf-view-label">Last Updated</span>
                                <span className="uf-view-value">
                                    {formData.last_updated ? new Date(formData.last_updated).toLocaleString() : '—'}
                                </span>
                            </div>

                            {/* Dynamic custom fields */}
                            {customFields.map(field => {
                                const label = field.COLUMN_NAME.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                                const value = formData[field.COLUMN_NAME];
                                return (
                                    <div key={field.COLUMN_NAME} className="uf-view-field">
                                        <span className="uf-view-label">{label}</span>
                                        <span className="uf-view-value">{value || '—'}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <LastChanges
                            customerId={customer?.id || ''}
                            phone_no={formData?.phone_no || ''}
                            refreshKey={historyRefreshKey}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="header-containerrr">
                <Link to="/customers">
                    <img src="/uploads/house-fill.svg" alt="Home" className="home-icon" />
                </Link>
                <h2 className="list_form_headiii">EDIT RECORD</h2>
            </div>

            {/* Inline Save Toast — appears near Update button, not screen-wide */}

            <div className="use-last-container">
                <div className="use-form-container"><br />
                    <div className="customer-info-header"><br />

                        <div className="customer-info-section">
                            <div className="customer-name">
                                {formData.first_name} {formData.last_name}
                            </div>
                            <div className="customer-phone">
                                {formatPhoneForDisplay(formData.phone_no)}
                            </div>
                        </div>
                        <EditIcon
                            className={`edit-icon ${editingInfo ? 'active' : ''}`}
                            onClick={() => {
                                setEditingInfo(!editingInfo);
                                if (!editingInfo) {
                                    setTimeout(() => document.querySelector('input[name="first_name"]')?.focus(), 100);
                                }
                            }}
                        />
                    </div>
                    <form onSubmit={handleSubmit}>
                        {/* Editable Basic Info - shown when edit icon clicked */}
                        {editingInfo && (
                            <>
                                <div className="label-input">
                                    <label>First Name<span className="required"> *</span>:</label>
                                    <input
                                        type="text"
                                        name="first_name"
                                        value={formData.first_name || ''}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="label-input">
                                    <label>Phone<span className="required"> *</span>:</label>
                                    <input
                                        type="text"
                                        name="phone_no"
                                        value={formData.phone_no || ''}
                                        onChange={handleInputChange}
                                        maxLength={15}
                                        required
                                    />
                                </div>
                            </>
                        )}

                        {/* Agent Name - Always shown, always disabled */}
                        <div className="label-input">
                            <label>Agent Name:</label>
                            <input
                                type="text"
                                name="agent_name"
                                value={formData.agent_name || ''}
                                disabled
                                className="agent-input"
                            />
                        </div>

                        {formData.last_updated && (
                            <div className="label-input">
                                <label>Last Updated:</label>
                                <input
                                    type="text"
                                    value={new Date(formData.last_updated).toLocaleString()}
                                    disabled
                                    className="agent-input"
                                />
                            </div>
                        )}

                        {/* Dynamic Custom Fields */}
                        {customFields.map(field => {
                            const isRequired = field.IS_NULLABLE === 'NO';
                            const label = field.COLUMN_NAME.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

                            // Handle ENUM fields
                            if (field.DATA_TYPE === 'enum') {
                                const options = field.COLUMN_TYPE.match(/'([^']+)'/g)?.map(s => s.replace(/'/g, '')) || [];

                                return (
                                    <div key={field.COLUMN_NAME} className="label-input">
                                        <label>{label}{isRequired && <span className="required"> *</span>}:</label>
                                        <select
                                            name={field.COLUMN_NAME}
                                            value={formData[field.COLUMN_NAME] || ''}
                                            onChange={handleInputChange}
                                            required={isRequired}
                                        >
                                            <option value="">Select {label}</option>
                                            {options.map(opt => (
                                                <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>
                                            ))}
                                        </select>
                                    </div>
                                );
                            }

                            // Handle TEXT/LONGTEXT fields
                            if (['text', 'longtext', 'mediumtext'].includes(field.DATA_TYPE.toLowerCase())) {
                                return (
                                    <div key={field.COLUMN_NAME} className="label-input comment">
                                        <label>{label}{isRequired && <span className="required"> *</span>}:</label>
                                        <div className="textarea-container">
                                            <textarea
                                                name={field.COLUMN_NAME}
                                                value={formData[field.COLUMN_NAME] || ''}
                                                onChange={handleInputChange}
                                                required={isRequired}
                                                rows={4}
                                            />
                                        </div>
                                    </div>
                                );
                            }

                            // Determine input type
                            let inputType = 'text';
                            if (['int', 'decimal', 'float', 'double', 'bigint'].includes(field.DATA_TYPE.toLowerCase())) {
                                inputType = 'number';
                            } else if (field.DATA_TYPE.toLowerCase() === 'date') {
                                inputType = 'date';
                            } else if (['datetime', 'timestamp'].includes(field.DATA_TYPE.toLowerCase())) {
                                inputType = 'datetime-local';
                            }

                            // Special handling for scheduled_at
                            if (field.COLUMN_NAME === 'scheduled_at') {
                                return (
                                    <div key={field.COLUMN_NAME} className="label-input">
                                        <label>{label}{isRequired && <span className="required"> *</span>}:</label>
                                        <input
                                            type="datetime-local"
                                            name={field.COLUMN_NAME}
                                            value={formData[field.COLUMN_NAME] || ''}
                                            onChange={handleInputChange}
                                            onKeyDown={(e) => e.preventDefault()}
                                            onClick={handleScheduledAtClick}
                                            style={{ cursor: 'pointer' }}
                                            className="sche_input"
                                            required={isRequired}
                                        />
                                    </div>
                                );
                            }

                            // Default input rendering
                            return (
                                <div key={field.COLUMN_NAME} className="label-input">
                                    <label>{label}{isRequired && <span className="required"> *</span>}:</label>
                                    <input
                                        type={inputType}
                                        name={field.COLUMN_NAME}
                                        value={formData[field.COLUMN_NAME] || ''}
                                        onChange={handleInputChange}
                                        required={isRequired}
                                    />
                                </div>
                            );
                        })}

                        <button className="sbt-use-btn" type="submit">Update</button>
                        {saveSuccess && (
                            <span className="uf-inline-toast">
                                ✅ Saved! Update history refreshed in the panel →
                            </span>
                        )}
                    </form>
                    {hasDeletePermission && (
                        <button
                            onClick={handleDelete}
                            className="add-field-btnnn"
                            aria-label="Delete customer"
                        >
                            Delete Record
                        </button>
                    )}
                </div>

                <div>
                    {/* Pass customerId and refreshKey to LastChanges */}
                    <LastChanges
                        customerId={customer?.id || ''}
                        phone_no={formData?.phone_no || ''}
                        refreshKey={historyRefreshKey}
                    />
                </div>
            </div>

        </div>
    );
};

export default UseForm;