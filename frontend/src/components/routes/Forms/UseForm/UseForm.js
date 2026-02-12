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
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hasDeletePermission, setHasDeletePermission] = useState(false);
    const [error, setError] = useState(null); 
    const [customer, setCustomer] = useState(null);
    const [availableAgents, setAvailableAgents] = useState([]); 
    const [editingInfo, setEditingInfo] = useState(false);
    const alertShownRef = useRef(false); // Use a ref to track if the alert has been shown

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        company_name: '',
        phone_no: '',
        email_id: '',
        address: '',
        lead_source: 'website',
        call_date_time: '',
        call_status: 'connected',
        call_outcome: 'interested',
        call_recording: '',
        product: '',
        budget: '',
        decision_making: 'yes',
        decision_time: 'immediate',
        lead_stage: 'new',
        next_follow_up: '',
        assigned_agent: '',
        reminder_notes: '',
        priority_level: 'medium',
        customer_category: 'warm',
        tags_labels: 'premium_customer',
        communcation_channel: 'call',
        deal_value: '',
        conversion_status: 'lead',
        customer_history: 'previous calls',
        comment: '',
        agent_name: '',
        scheduled_at: ''
    });

    const [updatedData, setUpdatedData] = useState(formData);

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
        setUpdatedData(prev => ({ ...prev, [name]: processedValue }));
    };

    const validateRequiredFields = () => {
        const requiredFields = ['first_name', 'email_id', 'phone_no'];
        const missingFields = requiredFields.filter(field => {
            const value = formData[field];
            return !value || (typeof value === 'string' && !value.trim());
        });
        
        if (missingFields.length > 0) {
            setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
            return false;
        }
        return true;
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

            setUser(userResponse.data);
            
            // Get permissions from API response
            const permissions = userResponse.data.permissions || [];
            console.log('Latest user permissions from API:', permissions);
            
            // Check for delete permission
            const hasDeletePerm = Array.isArray(permissions) && permissions.includes('delete_customer');
            console.log('Has delete permission:', hasDeletePerm);
            setHasDeletePermission(hasDeletePerm);

                // Then get the available agents based on user's role
                try {
                    const agentsResponse = await axios.get(`${apiUrl}/players/teams`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    setAvailableAgents(agentsResponse.data);
        } catch (error) {
                    console.error('Error fetching available agents:', error);
                    setError('Failed to fetch available agents');
                }

            } catch (error) {
                console.error('Error in fetchUser:', error);
            setError('Failed to fetch user data');
            setLoading(false);
        }
    };

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
        if (!confirmDelete) return;

        try {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.REACT_APP_API_URL;

            await axios.delete(`${apiUrl}/customers/${customer.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            alert("Customer deleted successfully.");
            navigate("/customers");
        } catch (error) {
            if (error.response && error.response.status === 403) {
                alert("You do not have permission to delete customers.");
                // Refresh user data to get latest permissions
                const fetchUser = async () => {
                    try {
                        const token = localStorage.getItem('token');
                        const apiUrl = process.env.REACT_APP_API_URL;

                        // First get the current user's data
                        const userResponse = await axios.get(`${apiUrl}/current-user`, {
                            headers: {
                                Authorization: `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        setUser(userResponse.data);
                        
                        // Get permissions from API response only
                        const permissions = userResponse.data.permissions || [];
                        console.log('Latest user permissions from API:', permissions);
                        
                        // Check if delete_customer permission exists in the array
                        const hasDeletePerm = Array.isArray(permissions) && permissions.includes('delete_customer');
                        console.log('Has delete permission:', hasDeletePerm);
                        setHasDeletePermission(hasDeletePerm);

                        // Then get the available agents based on user's role
                        try {
                            const agentsResponse = await axios.get(`${apiUrl}/players/teams`, {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                }
                            });
                            setAvailableAgents(agentsResponse.data);
                        } catch (error) {
                            console.error('Error fetching available agents:', error);
                            setError('Failed to fetch available agents');
                        }

                    } catch (error) {
                        console.error('Error in fetchUser:', error);
                        setError('Failed to fetch user data');
                        setLoading(false);
                    }
                };
                await fetchUser();
            } else {
                console.error("Error deleting customer:", error);
                alert("Failed to delete customer. Please try again.");
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // First validate required fields
        const requiredFields = {
            'first_name': 'First Name',
            'phone_no': 'Primary Phone Number',
            'email_id': 'Email'
        };

        const missingFields = Object.entries(requiredFields)
            .filter(([field]) => !formData[field] || !formData[field].trim())
            .map(([_, label]) => label);

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
            const response = await axios.put(
                `${apiUrl}/customers/${customer.id}`, 
                changedFields,
                {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            setCustomer(formData);
            setFormData(formData);
            navigate("/customers");
        } catch (error) {
            console.error('Update error:', error);
            const backendErrors = error.response?.data?.errors;
            if (backendErrors) {
                alert(`Update failed: ${backendErrors.join('\n')}`);
            } else {
                alert('Failed to update customer. Please try again.');
            }
        }
    };
    
    if (loading) return <div>Loading customer data...</div>;
    if (!customer) return <div>No customer data found.</div>;

    return (
        <div>
            <div className="header-containerrr">
                <Link to="/customers">
                    <img src="/uploads/house-fill.svg" alt="Home" className="home-icon" />
                </Link>
                <h2 className="list_form_headiii">EDIT RECORD</h2>
            </div>
            <div className="use-last-container">
                <div className="use-form-container">
                    <div className="customer-info-header">
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
                        {/* Your input fields */}
                        {[
                            ...(editingInfo ? [
                                { 
                                    label: "First Name", name: "first_name", required: true 
                                },
                                { 
                                    label: "Last Name", name: "last_name"
                                },
                                { 
                                    label: "Phone", name: "phone_no", required: true,
                                    type: "tel", maxLength: "20"
                                }
                            ] : []),
                            { 
                              label: "Company Name", name: "company_name"
                            },
                            { 
                              label: "Email", name: "email_id",
                              type: "email"
                            },
                            { 
                              label: "Address", name: "address"
                            },
                            { 
                              label: "Call Recording", name: "call_recording"
                            },
                            { 
                              label: "Product", name: "product"
                            },
                            { 
                              label: "Budget", name: "budget"
                            },
                            { 
                              label: "Assigned Agent", name: "assigned_agent"
                            },
                            { 
                              label: "Deal Value", name: "deal_value"
                            },
                        ].map(({ label, name, type = "text", disabled, maxLength, required, pattern }) => (
                            <div key={name} className="label-input">
                                <label>{label}{required && <span className="required"> *</span>}:</label>
                                <input
                                    type={type}
                                    name={name}
                                    value={formData[name] || ''}
                                    onChange={handleInputChange}
                                    disabled={disabled}
                                    maxLength={maxLength}
                                    pattern={pattern}
                                />
                            </div>
                        ))}

                        {/* Agent Name Field */}
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

                        {/* Lead Source Dropdown */}
                        <div className="label-input">
                            <label>Lead Source:</label>
                            <select name="lead_source" value={formData.lead_source} onChange={handleInputChange}>
                                <option value="website">Website</option>
                                <option value="data">Data</option>   
                                <option value="referral">Referral</option>
                                <option value="ads">Ads</option>
                            </select>
                        </div>

                        {/* Call Date Time */}
                        <div className="label-input">
                            <label>Call Date Time:</label>
                            <input
                                type="datetime-local"
                                name="call_date_time"
                                value={formData.call_date_time || ''}
                                onChange={handleInputChange}
                            />
                        </div>

                        {/* Call Status Dropdown */}
                        <div className="label-input">
                            <label>Call Status:</label>
                            <select name="call_status" value={formData.call_status} onChange={handleInputChange}>
                                <option value="connected">Connected</option>
                                <option value="not_connected">Not Connected</option>
                                <option value="follow_up">Follow Up</option>
                            </select>
                        </div>

                        {/* Call Outcome Dropdown */}
                        <div className="label-input">
                            <label>Call Outcome:</label>
                            <select name="call_outcome" value={formData.call_outcome} onChange={handleInputChange}>
                                <option value="interested">Interested</option>
                                <option value="not_interested">Not Interested</option>
                                <option value="call_later">Call Later</option>
                                <option value="wrong_number">Wrong Number</option>
                            </select>
                        </div>

                        {/* Decision Making Dropdown */}
                        <div className="label-input">
                            <label>Decision Making:</label>
                            <select name="decision_making" value={formData.decision_making} onChange={handleInputChange}>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>

                        {/* Decision Time Dropdown */}
                        <div className="label-input">
                            <label>Decision Time:</label>
                            <select name="decision_time" value={formData.decision_time} onChange={handleInputChange}>
                                <option value="immediate">Immediate</option>
                                <option value="1_week">1 Week</option>
                                <option value="1_month">1 Month</option>
                                <option value="future_investment">Future Investment</option>
                            </select>
                        </div>

                        {/* Lead Stage Dropdown */}
                        <div className="label-input">
                            <label>Lead Stage:</label>
                            <select name="lead_stage" value={formData.lead_stage} onChange={handleInputChange}>
                                <option value="new">New</option>
                                <option value="in_progress">In Progress</option>
                                <option value="qualified">Qualified</option>
                                <option value="converted">Converted</option>
                                <option value="lost">Lost</option>
                            </select>
                        </div>


                        {/* Priority Level Dropdown */}
                        <div className="label-input">
                            <label>Priority Level:</label>
                            <select name="priority_level" value={formData.priority_level} onChange={handleInputChange}>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>

                        {/* Customer Category Dropdown */}
                        <div className="label-input">
                            <label>Customer Category:</label>
                            <select name="customer_category" value={formData.customer_category} onChange={handleInputChange}>
                                <option value="hot">Hot</option>
                                <option value="warm">Warm</option>
                                <option value="cold">Cold</option>
                            </select>
                        </div>

                        {/* Tags/Labels Dropdown */}
                        <div className="label-input">
                            <label>Tags/Labels:</label>
                            <select name="tags_labels" value={formData.tags_labels} onChange={handleInputChange}>
                                <option value="premium_customer">Premium Customer</option>
                                <option value="repeat_customer">Repeat Customer</option>
                                <option value="demo_required">Demo Required</option>
                            </select>
                        </div>

                        {/* Communication Channel Dropdown */}
                        <div className="label-input">
                            <label>Communication Channel:</label>
                            <select name="communcation_channel" value={formData.communcation_channel} onChange={handleInputChange}>
                                <option value="call">Call</option>
                                <option value="whatsapp">WhatsApp</option>
                                <option value="email">Email</option>
                                <option value="sms">SMS</option>
                            </select>
                        </div>

                        {/* Conversion Status Dropdown */}
                        <div className="label-input">
                            <label>Conversion Status:</label>
                            <select name="conversion_status" value={formData.conversion_status} onChange={handleInputChange}>
                                <option value="lead">Lead</option>
                                <option value="opportunity">Opportunity</option>
                                <option value="customer">Customer</option>
                            </select>
                        </div>

                        {/* Customer History Dropdown */}
                        <div className="label-input">
                            <label>Customer History:</label>
                            <select name="customer_history" value={formData.customer_history} onChange={handleInputChange}>
                                <option value="previous calls">Previous Calls</option>
                                <option value="purchases">Purchases</option>
                                <option value="interactions78">Interactions</option>
                            </select>
                        </div>

                        {/* Schedule Call  */}
                        <div className="label-input">
                            <label>Next Follow Up:</label>
                            <input
                                type="datetime-local"
                                name="scheduled_at"
                                value={formData.scheduled_at || ''}
                                onChange={handleInputChange}
                                onKeyDown={(e) => e.preventDefault()}
                                onClick={handleScheduledAtClick}
                                style={{ cursor: 'pointer' }}
                                className="sche_input"
                            />
                        </div>

                        {/* Reminder Notes Section */}
                        <div className="label-input comment">
                            <label>Reminder Notes:</label>
                            <div className="textarea-container">
                                <textarea
                                    name="reminder_notes"
                                    value={formData.reminder_notes || ''}
                                    onChange={handleInputChange}
                                    rows="4"
                                    placeholder="Enter reminder notes"
                                    className="comet"
                                />
                            </div>
                        </div>

                        {/* Comment Section */}
                        {/* <div className="label-input comment">
                            <label>Comment:</label>
                            <div className="textarea-container">
                                <textarea
                                    name="comment"
                                    value={formData.comment || ''}
                                    onChange={handleInputChange}
                                    rows="6"
                                    maxLength={1000}
                                    placeholder="Enter any additional comment"
                                    className="comet"
                                />
                            </div>
                        </div> */}

                        <button className="sbt-use-btn" type="submit">Update</button>
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
                    {/* Pass customerId to LastChanges */}
                    <LastChanges 
                        customerId={customer?.id || ''} 
                        phone_no={formData?.phone_no || ''}
                    />
                </div>
            </div>

        </div>
    );
};

export default UseForm;