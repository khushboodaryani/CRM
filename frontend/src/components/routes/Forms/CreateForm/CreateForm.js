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
    phone_no: '',
    agent_name: ''
  });
  const [customFields, setCustomFields] = useState([]);

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
    fetchCustomFields();
  }, [navigate]);

  const fetchCustomFields = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;

      const response = await axios.get(`${apiUrl}/custom-fields`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Define truly system fields that should never be shown
        const systemFields = [
          'id', 'created_at', 'updated_at', 'last_updated',
          'company_id', 'team_id', 'duplicate_action', 'C_unique_id',
          'department_id', 'sub_department_id', 'assigned_to'
        ];

        // Define mandatory fields that are always shown
        const mandatoryFields = ['first_name', 'phone_no', 'agent_name'];

        // Get all fields except system fields
        const allFields = response.data.fields.filter(field =>
          !systemFields.includes(field.COLUMN_NAME)
        );

        // Separate custom fields (for the customFields state used in rendering)
        const custom = allFields.filter(field =>
          !mandatoryFields.includes(field.COLUMN_NAME)
        );

        setCustomFields(custom);

        // Initialize ALL fields in form state dynamically
        setFormData(prev => {
          const newData = { ...prev };
          allFields.forEach(field => {
            if (newData[field.COLUMN_NAME] === undefined) {
              newData[field.COLUMN_NAME] = field.COLUMN_DEFAULT || '';
            }
          });
          return newData;
        });
      }
    } catch (err) {
      console.error('Error fetching custom fields:', err);
    }
  };

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

  // Validate required fields dynamically
  const validateRequiredFields = () => {
    // Get required fields from customFields state
    const mandatoryFields = ['first_name', 'phone_no', 'agent_name', 'scheduled_at'];
    const allRequiredFields = [
      ...mandatoryFields,
      ...customFields.filter(f => f.IS_NULLABLE === 'NO' && f.COLUMN_NAME !== 'scheduled_at').map(f => f.COLUMN_NAME)
    ];

    for (let field of allRequiredFields) {
      if (!formDataa[field] || (typeof formDataa[field] === 'string' && formDataa[field].trim() === "")) {
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
          phone_no: '',
          agent_name: formDataa.agent_name
        });
        fetchCustomFields(); // Re-fetch to reinitialize all fields
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
    handleSubmit({ preventDefault: () => { } }, action);
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
              <Typography variant="body1" sx={{ margin: '5px', color: '#EF6F53', fontWeight: 600 }}>
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
          {/* Mandatory Fields - Always shown first */}
          <div className="label-input">
            <label>First Name<span className="required"> *</span>:</label>
            <input
              type="text"
              name="first_name"
              value={formDataa.first_name || ''}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="label-input">
            <label>Phone<span className="required"> *</span>:</label>
            <input
              type="text"
              name="phone_no"
              value={formDataa.phone_no || ''}
              onChange={handleInputChange}
              maxLength={15}
              required
            />
          </div>

          <div className="label-input">
            <label>Agent Name<span className="required"> *</span>:</label>
            <input
              type="text"
              name="agent_name"
              value={formDataa.agent_name || ''}
              onChange={handleInputChange}
              readOnly
              style={{ backgroundColor: '#f5f5f5' }}
            />
          </div>

          {/* Dynamic Custom Fields - Fetched from database */}
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
                    value={formDataa[field.COLUMN_NAME] || ''}
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
                      value={formDataa[field.COLUMN_NAME] || ''}
                      onChange={handleInputChange}
                      required={isRequired}
                      rows={4}
                    />
                  </div>
                </div>
              );
            }

            // Determine input type based on DATA_TYPE
            let inputType = 'text';
            if (['int', 'decimal', 'float', 'double', 'bigint'].includes(field.DATA_TYPE.toLowerCase())) {
              inputType = 'number';
            } else if (field.DATA_TYPE.toLowerCase() === 'date') {
              inputType = 'date';
            } else if (['datetime', 'timestamp'].includes(field.DATA_TYPE.toLowerCase())) {
              inputType = 'datetime-local';
            }

            // Special handling for scheduled_at field
            if (field.COLUMN_NAME === 'scheduled_at') {
              return (
                <div key={field.COLUMN_NAME} className="label-input">
                  <label>{label}<span className="required"> *</span>:</label>
                  <input
                    type="datetime-local"
                    name={field.COLUMN_NAME}
                    value={formDataa[field.COLUMN_NAME] || getCurrentISTDateTime()}
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
                  value={formDataa[field.COLUMN_NAME] || ''}
                  onChange={handleInputChange}
                  required={isRequired}
                />
              </div>
            );
          })}

          <button type="submit" className="submit-btn submmit-button">
            Add Customer
          </button>
        </form>
      </div >
    </div >
  );
};

export default CreateForm;
