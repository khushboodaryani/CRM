// src/components/routes/Forms/CreateForm/CreateForm.js

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import "./CreateForm.css";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Typography, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const CreateForm = () => {
  const { phone_no } = useParams();
  const [formDataa, setFormData] = useState({
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
    agent_name: ''
  });

  const [formSuccess, setFormSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const [duplicateAction, setDuplicateAction] = useState('skip');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Helper function to get current IST datetime for datetime-local input
  const getCurrentISTDateTime = () => {
    const now = new Date();
    // Add 5 hours 30 minutes (IST offset from UTC)
    const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    return istTime.toISOString().slice(0, 16);
  };

  // Helper function to prepare form data with IST datetime conversion
  const prepareFormDataForSubmission = (data) => {
    const preparedData = { ...data };
    
    // Convert datetime fields to IST if they exist
    const datetimeFields = ['call_date_time', 'scheduled_at', 'next_follow_up'];
    
    datetimeFields.forEach(field => {
      if (preparedData[field]) {
        // The datetime-local input gives us local time, but we want to ensure it's treated as IST
        // Convert to Date object and then to ISO string
        const localDate = new Date(preparedData[field]);
        preparedData[field] = localDate.toISOString();
      }
    });
    
    return preparedData;
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const apiUrl = process.env.REACT_APP_API_URL;
        const response = await axios.get(`${apiUrl}/current-user`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Set agent name in form data
        setFormData(prev => ({
          ...prev,
          agent_name: response.data.username
        }));

        // Log the response for debugging
        console.log('Current user API response:', response.data);

      } catch (error) {
        console.error('Error fetching user:', error);
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for phone numbers
    if (name === 'phone_no' || name === 'whatsapp_num') {
      // Only allow digits and '+' symbol
      const sanitizedValue = value.replace(/[^\d+]/g, '');
      // Ensure '+' only appears at the start
      const finalValue = sanitizedValue.replace(/\+/g, (match, offset) => offset === 0 ? match : '');
      setFormData(prev => ({
        ...prev,
        [name]: finalValue
      }));
      return;
    }
    
    // Special handling for datetime-local
    if (name === 'scheduled_at') {
      // If empty, set to current IST datetime
      const currentDate = getCurrentISTDateTime();
      setFormData(prev => ({
        ...prev,
        [name]: value || currentDate
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // // Handle scheduled_at click
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

  // Validate required fields
  const validateRequiredFields = () => {
    const requiredFields = [
      "first_name", "phone_no", "email_id"
    ];

    for (let field of requiredFields) {
      if (!formDataa[field] || formDataa[field].trim() === "") {
        setError(`Please fill out the "${field.replace(/_/g, ' ').toUpperCase()}" field.`);
        return false;
      }
    }
    
    // Validate phone number format
    const phoneRegex = /^[+\d]+$/;
    if (!phoneRegex.test(formDataa.phone_no)) {
      setError("Phone number can only contain digits and '+' symbol");
      return false;
    }

    // Ensure agent_name is set (should be automatically populated)
    if (!formDataa.agent_name || formDataa.agent_name.trim() === "") {
      console.error("Agent name not automatically populated");
      setError("Agent name not found. Please refresh the page or contact support.");
      return false;
    }
    
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e, action = 'prompt') => {
    e.preventDefault();
    setError('');

    // First validate required fields
    if (!validateRequiredFields()) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      const apiUrl = process.env.REACT_APP_API_URL;

      // Prepare form data with IST datetime conversion
      const preparedData = prepareFormDataForSubmission(formDataa);
      
      const response = await axios.post(
        `${apiUrl}/customers/new`, 
        { ...preparedData, duplicateAction: action },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      if (response.data.success) {
        console.log(response.data);
        setFormSuccess(true);
        alert("Record added successfully!");
        setFormData({
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
          agent_name: formDataa.agent_name,
          // scheduled_at: ''
        });
        navigate('/customers');
      }
    } catch (error) {
      if (error.response?.status === 409) {
        // Handle duplicate record
        const duplicateData = error.response.data;
        
        // Store the duplicate info with calculated matching fields
        setDuplicateInfo({
          ...duplicateData,
          matchingFields: {
            name: formDataa.first_name === duplicateData.existing_record.first_name,
            phone: formDataa.phone_no === duplicateData.existing_record.phone_no,
            email: formDataa.email_id === duplicateData.existing_record.email_id
          }
        });
        
        setShowDuplicateDialog(true);
      } else {
        console.error('Error adding record:', error);
        setError(error.response?.data?.message || 'Error adding record. Please try again.');
      }
    }
  };

  const handleDuplicateAction = (action) => {
    // Validate required fields again before proceeding with the action
    if (!validateRequiredFields()) {
      return;
    }

    setShowDuplicateDialog(false);
    handleSubmit({ preventDefault: () => {} }, action);
  };

  return (
    <div>
      <h2 className="create_form_headiii">New Record</h2>
      <div className="create-form-container">
        {error && <div className="error-messagee">{error}</div>}
        
        {showDuplicateDialog && duplicateInfo && (
          <Dialog 
            open={showDuplicateDialog} 
            onClose={() => setShowDuplicateDialog(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle sx={{ padding: '0 10px 0 10px', backgroundColor: '#1976d2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, textAlign: 'center', width: '100%', color: 'white' }}>Duplicate Record Found</Typography>
              <IconButton edge="end" color="inherit" onClick={() => setShowDuplicateDialog(false)} aria-label="close">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ padding: '20px' }}>
              <Typography variant="body1" sx={{ margin: '5px',color: '#EF6F53', fontWeight: 600}}>
                {duplicateInfo.phone_no_exists 
                  ? "Phone number already exists in the system" 
                  : duplicateInfo.email_exists 
                    ? "Email already exists in the system"
                    : "Duplicate record found"}
              </Typography>
              
              <TableContainer sx={{ marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderRadius: '4px' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ 
                        width: '15%',
                        backgroundColor: '#f5f5f5',
                        fontWeight: 600,
                        padding: '5px'
                      }}>
                        Field
                      </TableCell>
                      <TableCell sx={{ 
                        width: '42.5%',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '1rem',
                        padding: '5px'
                      }}>
                        New Record
                      </TableCell>
                      <TableCell sx={{ 
                        width: '42.5%',
                        backgroundColor: '#EF6F53',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '1rem',
                        padding: '5px'
                      }}>
                        Existing Record <span style={{ fontSize: '0.8rem' }}>(★ indicates matching fields)</span>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ backgroundColor: '#fafafa', padding: '5px' }}>Name</TableCell>
                      <TableCell sx={{ backgroundColor: '#f1f8f1', padding: '5px' }}>{formDataa.first_name}</TableCell>
                      <TableCell sx={{ 
                        backgroundColor: duplicateInfo.matchingFields.name ? '#ffecb3' : '#fff5f5', 
                        padding: '5px',
                        fontWeight: duplicateInfo.matchingFields.name ? 'bold' : 'normal'
                      }}>
                        {duplicateInfo.existing_record.first_name}
                        {duplicateInfo.matchingFields.name && <span style={{ color: '#d32f2f', marginLeft: '5px' }}>★</span>}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ backgroundColor: '#fafafa', padding: '5px' }}>Phone</TableCell>
                      <TableCell sx={{ backgroundColor: '#f1f8f1', padding: '5px' }}>{formDataa.phone_no}</TableCell>
                      <TableCell sx={{ 
                        backgroundColor: duplicateInfo.matchingFields.phone ? '#ffecb3' : '#fff5f5', 
                        padding: '5px',
                        fontWeight: duplicateInfo.matchingFields.phone ? 'bold' : 'normal'
                      }}>
                        {duplicateInfo.existing_record.phone_no}
                        {duplicateInfo.matchingFields.phone && <span style={{ color: '#d32f2f', marginLeft: '5px' }}>★</span>}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ backgroundColor: '#fafafa', padding: '5px' }}>Email</TableCell>
                      <TableCell sx={{ backgroundColor: '#f1f8f1', padding: '5px' }}>{formDataa.email_id}</TableCell>
                      <TableCell sx={{ 
                        backgroundColor: duplicateInfo.matchingFields.email ? '#ffecb3' : '#fff5f5', 
                        padding: '5px',
                        fontWeight: duplicateInfo.matchingFields.email ? 'bold' : 'normal'
                      }}>
                        {duplicateInfo.existing_record.email_id}
                        {duplicateInfo.matchingFields.email && <span style={{ color: '#d32f2f', marginLeft: '5px' }}>★</span>}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '15px' }}>
                <Typography variant="h6" sx={{ margin: 0, fontWeight: 600, fontSize: '1rem', color: '#364C63' }}>Choose Action:</Typography>
                <select 
                  value={duplicateAction}
                  onChange={(e) => setDuplicateAction(e.target.value)}
                  style={{ 
                    padding: '2px 8px', 
                    borderRadius: '6px', 
                    border: '1px solid #364C63',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    width: '300px',
                    color: '#1976d2'
                  }}
                >
                  <option value="skip">Do Not Upload Duplicate</option>
                  <option value="append">Append with suffix (__1, __2, etc.)</option>
                  <option value="replace">Replace existing record</option>
                </select>
              </Box>
            </DialogContent>
            <DialogActions sx={{ padding: '16px', borderTop: '1px solid #eee' }}>
              <Button onClick={() => setShowDuplicateDialog(false)} color="secondary">
                Cancel
              </Button>
              <Button 
                onClick={() => handleDuplicateAction(duplicateAction)} 
                variant="contained" 
                color="primary"
              >
                Confirm
              </Button>
            </DialogActions>
          </Dialog>
        )}

        <form onSubmit={(e) => handleSubmit(e, 'prompt')} className="create-form">
          {[
            { 
              label: "First Name", name: "first_name", required: true 
            },
            { 
              label: "Last Name", name: "last_name"
            },
            { 
              label: "Company Name", name: "company_name"
            },
            { 
              label: "Phone", name: "phone_no", required: true,
              type: "tel", maxLength: "20"
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
          ].map(({ label, name, type = "text", maxLength, required }) => (
            <div key={name} className="label-input">
              <label>{label}{required && <span className="required"> *</span>}:</label>
              <input
                type={type}
                name={name}
                value={formDataa[name] || ''}
                onChange={handleInputChange}
                maxLength={maxLength}
              />
            </div>
          ))}

          {/* Lead Source Dropdown */}
          <div className="label-input">
            <label>Lead Source:</label>
            <select name="lead_source" value={formDataa.lead_source} onChange={handleInputChange}>
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
              value={formDataa.call_date_time || ''}
              onChange={handleInputChange}
            />
          </div>

          {/* Call Status Dropdown */}
          <div className="label-input">
            <label>Call Status:</label>
            <select name="call_status" value={formDataa.call_status} onChange={handleInputChange}>
              <option value="connected">Connected</option>
              <option value="not connected">Not Connected</option>
              <option value="follow_up">Follow Up</option>
            </select>
          </div>

          {/* Call Outcome Dropdown */}
          <div className="label-input">
            <label>Call Outcome:</label>
            <select name="call_outcome" value={formDataa.call_outcome} onChange={handleInputChange}>
              <option value="interested">Interested</option>
              <option value="not interested">Not Interested</option>
              <option value="call_later">Call Later</option>
              <option value="wrong_number">Wrong Number</option>
            </select>
          </div>

          {/* Decision Making Dropdown */}
          <div className="label-input">
            <label>Decision Making:</label>
            <select name="decision_making" value={formDataa.decision_making} onChange={handleInputChange}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          {/* Decision Time Dropdown */}
          <div className="label-input">
            <label>Decision Time:</label>
            <select name="decision_time" value={formDataa.decision_time} onChange={handleInputChange}>
              <option value="imeediate">Immediate</option>
              <option value="1_week">1 Week</option>
              <option value="1_month">1 Month</option>
              <option value="future_investment">Future Investment</option>
            </select>
          </div>

          {/* Lead Stage Dropdown */}
          <div className="label-input">
            <label>Lead Stage:</label>
            <select name="lead_stage" value={formDataa.lead_stage} onChange={handleInputChange}>
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
            <select name="priority_level" value={formDataa.priority_level} onChange={handleInputChange}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Customer Category Dropdown */}
          <div className="label-input">
            <label>Customer Category:</label>
            <select name="customer_category" value={formDataa.customer_category} onChange={handleInputChange}>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          </div>

          {/* Tags/Labels Dropdown */}
          <div className="label-input">
            <label>Tags/Labels:</label>
            <select name="tags_labels" value={formDataa.tags_labels} onChange={handleInputChange}>
              <option value="premium_customer">Premium Customer</option>
              <option value="repeat_customer">Repeat Customer</option>
              <option value="demo_required">Demo Required</option>
            </select>
          </div>

          {/* Communication Channel Dropdown */}
          <div className="label-input">
            <label>Communication Channel:</label>
            <select name="communcation_channel" value={formDataa.communcation_channel} onChange={handleInputChange}>
              <option value="call">Call</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </div>

          {/* Conversion Status Dropdown */}
          <div className="label-input">
            <label>Conversion Status:</label>
            <select name="conversion_status" value={formDataa.conversion_status} onChange={handleInputChange}>
              <option value="lead">Lead</option>
              <option value="opportunity">Opportunity</option>
              <option value="customer">Customer</option>
            </select>
          </div>

          {/* Customer History Dropdown */}
          <div className="label-input">
            <label>Customer History:</label>
            <select name="customer_history" value={formDataa.customer_history} onChange={handleInputChange}>
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
                  value={formDataa.scheduled_at || getCurrentISTDateTime()}
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
                value={formDataa.reminder_notes || ''}
                onChange={handleInputChange}
                rows="4"
                placeholder="Enter reminder notes"
                className="comet"
              />
            </div>
          </div>

          {/* Comment Section
          <div className="label-input comment">
              <label>Comment:</label>
              <div className="textarea-container">
                  <textarea
                      name="comment"
                      value={formDataa.comment || ''}
                      onChange={handleInputChange}
                      rows="6"
                      placeholder="Enter any additional comment"
                      className="comet"
                  />
              </div>
          </div> */}

          <button type="submit" className="submit-btn submmit-button">
            Add Customer
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateForm;
