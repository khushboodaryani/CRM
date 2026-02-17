// src/components/routes/Other/Header/Upload/UploadNew.js

import React, { useState, useEffect, useMemo } from "react";
import Papa from 'papaparse';
import { useNavigate } from "react-router-dom";
import * as XLSX from 'xlsx';
import axios from 'axios';
import "./UploadNew.css";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Typography, Box, FormControl, RadioGroup, FormControlLabel, Radio } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const UploadNew = () => {
    const [systemHeaders, setSystemHeaders] = useState([]);
    const [headerLabelsState, setHeaderLabelsState] = useState({});
    const [enumValuesState, setEnumValuesState] = useState({});
    const [fileHeaders, setFileHeaders] = useState([]);
    const [headerMapping, setHeaderMapping] = useState({});
    const [selectedFileName, setSelectedFileName] = useState("");
    const [error, setError] = useState("");
    const [customerData, setCustomerData] = useState([]);
    const [uploadResult, setUploadResult] = useState(null);
    const [uploadId, setUploadId] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [duplicateRecords, setDuplicateRecords] = useState([]);
    const [duplicateAction, setDuplicateAction] = useState('skip');
    const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
    const navigate = useNavigate();

    // Fetch custom fields from database on component mount
    useEffect(() => {
        const fetchCustomFields = async () => {
            try {
                const token = localStorage.getItem('token');
                const apiUrl = process.env.REACT_APP_API_URL;

                const response = await axios.get(`${apiUrl}/custom-fields`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.success) {
                    // Define system fields that should never be shown in upload
                    const systemFieldsToHide = [
                        'id', 'created_at', 'updated_at', 'last_updated',
                        'company_id', 'team_id', 'duplicate_action', 'C_unique_id'
                    ];

                    // Filter out system fields
                    const allFields = response.data.fields.filter(field =>
                        !systemFieldsToHide.includes(field.COLUMN_NAME)
                    );

                    // Extract field names for systemHeaders
                    const fieldNames = allFields.map(field => field.COLUMN_NAME);
                    setSystemHeaders(fieldNames);

                    // Build headerLabels dynamically
                    const labels = {};
                    const enums = {};

                    allFields.forEach(field => {
                        const fieldName = field.COLUMN_NAME;

                        // Format label: first_name -> First Name
                        const label = fieldName
                            .split('_')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                            .join(' ');

                        // Mark required fields
                        const isRequired = field.IS_NULLABLE === 'NO';
                        labels[fieldName] = isRequired ? `${label} *` : label;

                        // Extract enum values if field is enum type
                        if (field.DATA_TYPE === 'enum') {
                            const options = field.COLUMN_TYPE.match(/'([^']+)'/g)?.map(s => s.replace(/'/g, '')) || [];
                            enums[fieldName] = options;
                        }
                    });

                    setHeaderLabelsState(labels);
                    setEnumValuesState(enums);
                }
            } catch (err) {
                console.error('Error fetching custom fields:', err);
                setError('Failed to load form fields. Please refresh the page.');
            }
        };

        fetchCustomFields();
    }, []);

    // Use dynamic values
    const headerLabels = headerLabelsState;

    // Helper function to convert empty values to null
    const convertEmptyToNull = (data) => {
        return (data || []).filter(item => item && typeof item === 'object').map(item => {
            return Object.fromEntries(
                Object.entries(item || {}).map(([key, value]) => [key, value === "" ? null : value])
            );
        });
    };

    // Add a function to clean the data before sending
    const cleanCustomerData = (data) => {
        return data.map(row => {
            const cleanedRow = {};
            Object.keys(row).forEach(key => {
                let value = row[key]?.toString().trim() || null;

                // Find the corresponding system header for this key
                const systemHeader = Object.keys(headerMapping).find(sysHeader => headerMapping[sysHeader] === key);

                // Normalize enum values if this is an enum field
                if (systemHeader && enumValues[systemHeader] && value) {
                    value = normalizeEnumValue(systemHeader, value);
                }

                cleanedRow[key] = value;
            });
            return cleanedRow;
        });
    };

    // Use dynamic enum values
    const enumValues = enumValuesState;

    // Add validation functions
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const validatePhoneNumber = (phone) => {
        const phoneStr = String(phone);
        // If the phone number starts with '+', remove it for validation
        const normalizedPhone = phoneStr.startsWith('+') ? phoneStr.substring(1) : phoneStr;
        // Check if the normalized phone number (without '+') is numeric and has max 12 digits
        return normalizedPhone.length <= 12 && /^\d+$/.test(normalizedPhone);
    };

    const validateEmail = (email) => {
        return emailRegex.test(String(email).toLowerCase());
    };

    // Function to validate enum values (case-insensitive with format variations)
    const validateEnumValue = (fieldName, value) => {
        if (!value || !enumValues[fieldName]) return true; // Allow null/empty values

        const normalizedValue = String(value).toLowerCase().trim();
        const allowedValues = enumValues[fieldName].map(v => v.toLowerCase());

        // Check direct match first
        if (allowedValues.includes(normalizedValue)) return true;

        // Check with underscore/space variations
        const valueWithSpaces = normalizedValue.replace(/_/g, ' ');
        const valueWithUnderscores = normalizedValue.replace(/ /g, '_');

        return allowedValues.includes(valueWithSpaces) ||
            allowedValues.some(allowed => allowed.replace(/ /g, '_') === valueWithUnderscores);
    };

    // Function to normalize enum values to match database format
    const normalizeEnumValue = (fieldName, value) => {
        if (!value || !enumValues[fieldName]) return value;

        const normalizedValue = String(value).toLowerCase().trim();
        const allowedValues = enumValues[fieldName];

        // Try direct match first
        let matchedValue = allowedValues.find(v => v.toLowerCase() === normalizedValue);

        // If no direct match, try with underscore/space variations
        if (!matchedValue) {
            const valueWithSpaces = normalizedValue.replace(/_/g, ' ');
            const valueWithUnderscores = normalizedValue.replace(/ /g, '_');

            matchedValue = allowedValues.find(v =>
                v.toLowerCase() === valueWithSpaces ||
                v.toLowerCase().replace(/ /g, '_') === valueWithUnderscores
            );
        }

        return matchedValue || value; // Return original if no match found
    };

    const validateData = (data) => {
        const errors = [];
        data.forEach((row, index) => {
            const mappedPhone = headerMapping['phone_no'] ? row[headerMapping['phone_no']] : null;
            const mappedAgent = headerMapping['agent_name'] ? row[headerMapping['agent_name']] : null;

            // Validate phone number
            if (mappedPhone && !validatePhoneNumber(mappedPhone)) {
                errors.push(`Row ${index + 1}: Invalid phone number "${mappedPhone}". Phone numbers must be numeric and maximum 15 digits.`);
            }

            // Validate agent name is not empty
            if (!mappedAgent || !mappedAgent.trim()) {
                errors.push(`Row ${index + 1}: Agent name is required but empty.`);
            }

            // Validate enum fields
            Object.keys(enumValues).forEach(enumField => {
                if (headerMapping[enumField]) {
                    const fieldValue = row[headerMapping[enumField]];
                    if (fieldValue && !validateEnumValue(enumField, fieldValue)) {
                        const allowedValues = enumValues[enumField].join(', ');
                        errors.push(`Row ${index + 1}: Invalid value "${fieldValue}" for ${enumField}. Allowed values: ${allowedValues}`);
                    }
                }
            });
        });
        return errors;
    };

    // Handle file selection and parse headers
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check file size (50MB limit)
            const maxSize = 50 * 1024 * 1024; // 50MB in bytes
            if (file.size > maxSize) {
                setError(`File size exceeds 50MB limit. Please upload a smaller file.`);
                e.target.value = ''; // Clear the file input
                return;
            }

            // Check file extension
            const fileName = file.name.toLowerCase();
            const validExtensions = ['.xlsx', '.csv', '.xls'];
            const isValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

            if (!isValidExtension) {
                alert('Please upload only .xlsx, .xls or .csv files');
                e.target.value = ''; // Clear the file input
                return;
            }

            setSelectedFileName(file.name);
            const fileType = file.type;

            const reader = new FileReader();
            reader.onload = (event) => {
                const data = event.target.result;
                if (fileType === "text/csv" || fileName.endsWith('.csv')) {
                    parseCSV(data);
                } else {
                    parseExcel(data);
                }
            };
            if (fileType === "text/csv" || fileName.endsWith('.csv')) {
                reader.readAsText(file);
            } else {
                reader.readAsBinaryString(file);
            }
        }
    };

    // Parse CSV headers
    const parseCSV = (data) => {
        Papa.parse(data, {
            header: true,
            complete: (result) => {
                setFileHeaders(result.meta.fields || []);
                const modifiedData = convertEmptyToNull(result.data);
                setCustomerData(modifiedData); // Set the customer data here
            }
        });
    };

    // Parse Excel headers
    const parseExcel = (data) => {
        try {
            const workbook = XLSX.read(data, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

            // Check if worksheet is empty or first row is null/undefined
            if (!worksheet || worksheet.length === 0 || !worksheet[0]) {
                alert('Error: The uploaded file contains empty or invalid data. Please ensure the file has valid headers and data.');
                return;
            }

            // Get headers and validate they exist
            const headers = Object.keys(worksheet[0]).filter(header => header && header.trim());
            if (!headers || headers.length === 0) {
                alert('Error: Unable to read file headers. Please check if the file is properly formatted.');
                return;
            }

            setFileHeaders(headers);
            const modifiedData = convertEmptyToNull(worksheet);
            setCustomerData(modifiedData);
        } catch (error) {
            console.error('Error parsing Excel file:', error);
            alert('Error: Unable to process the file. Please ensure the file is not corrupted and contains valid data.');
        }
    };

    // Handle mapping selection change
    const handleMappingChange = (systemHeader, selectedFileHeader) => {
        if (headerMapping[systemHeader]) {
            const previousHeader = headerMapping[systemHeader];
            if (previousHeader === selectedFileHeader) {
                alert("This header is already mapped to another field.");
                return;
            }
        }
        setHeaderMapping(prevMapping => ({
            ...prevMapping,
            [systemHeader]: selectedFileHeader
        }));
    };

    // Function to get available options for the dropdown
    const getAvailableOptions = (systemHeader) => {
        const selectedHeaders = Object.values(headerMapping);
        return fileHeaders.filter(header =>
            header && // Ensure header is not null/undefined
            (!selectedHeaders.includes(header) || header === headerMapping[systemHeader])
        );
    };

    // Handle file upload
    const handleUpload = async () => {
        setIsUploading(true);
        setError(null);

        try {
            // Get user data from localStorage
            const userData = JSON.parse(localStorage.getItem('user'));
            const isMisRole = userData?.role === 'mis';

            // Validate that all required fields are mapped
            const requiredFields = ["first_name", "phone_no", "agent_name"];
            const missingFields = requiredFields.filter(field => !headerMapping[field]);

            if (missingFields.length > 0) {
                setError(`Please map the following required fields: ${(missingFields || []).map(field => headerLabels[field] || field).join(", ")}`);
                return;
            }

            // Additional validation to ensure required fields are not empty in any row
            const rowsWithMissingData = customerData
                .map((row, index) => ({
                    row,
                    index: index + 1,
                    missingFields: requiredFields.filter(field =>
                        !row[headerMapping[field]]?.toString().trim()
                    )
                }))
                .filter(({ missingFields }) => missingFields.length > 0);

            if (rowsWithMissingData.length > 0) {
                const errorMessages = (rowsWithMissingData || []).map(({ index, missingFields }) =>
                    `Row ${index}: Missing ${(missingFields || []).map(field => headerLabels[field] || field).join(", ")}`
                );
                setError(`Required fields missing in some rows:\n${errorMessages.join("\n")}`);
                return;
            }

            // Validate data before upload
            const validationErrors = validateData(customerData);
            if (validationErrors.length > 0) {
                setError(`Validation errors found:\n${validationErrors.join("\n")}`);
                return;
            }

            const apiUrl = process.env.REACT_APP_API_URL;
            const response = await fetch(`${apiUrl}/upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    headerMapping,
                    customerData: cleanCustomerData(customerData),
                    fileName: selectedFileName
                })
            });

            const result = await response.json();

            // Clear any existing error
            setError(null);

            if (!response.ok) {
                if (result.invalidAgents) {
                    const errorMessage = result.invalidAgents
                        .map(item => `Row ${item.index + 1}: Invalid agent name "${item.agentName}"`)
                        .join('\n');
                    setError(`Invalid agent names found:\n${errorMessage}`);
                    return;
                }
                throw new Error(result.error || 'Upload failed');
            }

            // Set upload result regardless of duplicates
            const uploadResultData = {
                totalRecords: result.totalRecords,
                duplicateCount: result.duplicateCount,
                uniqueRecords: result.uniqueRecords,
                duplicates: result.duplicates || [],
                uploadId: result.uploadId
            };
            setUploadResult(uploadResultData);
            setUploadId(result.uploadId);

            // If MIS role, auto-confirm upload and stay on upload page
            if (isMisRole) {
                // Auto-confirm the upload for MIS role
                await handleConfirmDuplicates(uploadResultData);
                // Clear form and show success message
                setSelectedFileName("");
                setFileHeaders([]);
                setHeaderMapping({});
                setCustomerData([]);
                setError(null);
                // Optional: Show a success message
                alert("Upload successful!");
            } else if (uploadResultData.duplicates && uploadResultData.duplicates.length > 0) {
                handleDuplicates(uploadResultData.duplicates);
            } else {
                // Auto-confirm upload when no duplicates for non-MIS users
                await handleConfirmDuplicates(uploadResultData);
                // Navigate to customers page for non-MIS users
                navigate('/customers');
            }
        } catch (error) {
            console.error('Upload error:', error);
            setError(error.message || 'Failed to upload file');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDuplicates = (duplicates) => {
        // Create a formatted display of duplicates
        const formattedDuplicates = duplicates.map(dup => {
            const newName = dup.new_record[headerMapping['first_name']] || 'N/A';
            const newPhone = dup.new_record[headerMapping['phone_no']] || 'N/A';
            const newEmail = dup.new_record[headerMapping['email_id']] || 'N/A';
            const newAgent = dup.agent_name || 'N/A';

            const existingName = dup.existing_record.first_name || 'N/A';
            const existingPhone = dup.existing_record.phone_no || 'N/A';
            const existingEmail = dup.existing_record.email_id || 'N/A';
            const existingAgent = dup.existing_record.agent_name || 'N/A';

            // Determine which fields are duplicates
            const isNameMatch = newName === existingName;
            const isPhoneMatch = newPhone === existingPhone;
            const isEmailMatch = newEmail === existingEmail;
            const isAgentMatch = newAgent === existingAgent;

            return {
                new: {
                    name: newName,
                    phone: newPhone,
                    email: newEmail,
                    agent: newAgent
                },
                existing: {
                    name: existingName,
                    phone: existingPhone,
                    email: existingEmail,
                    agent: existingAgent
                },
                matches: {
                    name: isNameMatch,
                    phone: isPhoneMatch,
                    email: isEmailMatch,
                    agent: isAgentMatch
                }
            };
        });

        setDuplicateRecords(formattedDuplicates);
        setShowDuplicateDialog(true);
    };

    const handleConfirmDuplicates = async (uploadResultData) => {
        try {
            setIsUploading(true);
            setError("");

            const apiUrl = process.env.REACT_APP_API_URL;
            const token = localStorage.getItem('token');

            if (!token) {
                setError('Authentication required. Please login again.');
                setIsUploading(false);
                navigate('/customers');
                return;
            }

            // Check if we have upload ID either from state or passed data
            const currentUploadId = (uploadResultData && uploadResultData.uploadId) ||
                (uploadResult && uploadResult.uploadId);

            if (!currentUploadId) {
                setError('Upload ID not found. Please try again.');
                setIsUploading(false);
                return;
            }

            // Create a map of actions for each duplicate
            const duplicateActions = duplicateRecords.reduce((acc, record, index) => {
                acc[index] = record.action || 'skip';
                return acc;
            }, {});

            const response = await axios.post(
                `${apiUrl}/upload/confirm`,
                {
                    uploadId: currentUploadId,
                    proceed: true,
                    duplicateActions
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.success) {
                setUploadResult(null);
                setShowDuplicateDialog(false);
                navigate('/customers');
            } else {
                setError(response.data.message || 'Failed to process upload');
            }
        } catch (error) {
            console.error('Confirmation error:', error);
            setError(error.response?.data?.message || 'Failed to confirm upload');
        } finally {
            setIsUploading(false);
        }
    };

    // Memoize the dialog content
    const duplicateDialog = (() => (
        <Dialog
            open={showDuplicateDialog}
            onClose={() => setShowDuplicateDialog(false)}
            maxWidth="lg"
            fullWidth
            TransitionProps={{
                mountOnEnter: true,
                unmountOnExit: true
            }}
        >
            <DialogTitle sx={{
                backgroundColor: '#364C63',
                color: 'white',
                fontSize: '1.25rem',
                fontWeight: 600,
                padding: '0.5rem 2rem'
            }}>
                <Box>
                    <Typography variant="h6">Duplicate Records Found</Typography>
                    {error && (
                        <Typography variant="subtitle2" sx={{ mt: 1, color: '#ffcdd2' }}>
                            {(error || '').split('\n').filter(msg => msg).map((msg, index) => (
                                <div key={index}>{msg}</div>
                            ))}
                        </Typography>
                    )}
                </Box>
                <IconButton
                    aria-label="close"
                    onClick={() => setShowDuplicateDialog(false)}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        color: 'white'
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 3, mt: 1 }}>
                {(duplicateRecords || []).filter(record =>
                    record && typeof record === 'object' && record.new && record.existing
                ).map((record, idx) => (
                    <Box key={idx} sx={{
                        mb: 8,
                        borderBottom: idx < duplicateRecords.length - 1 ? '2px solid #eee' : 'none'
                    }}>
                        <TableContainer sx={{ mb: 1, padding: '0' }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{
                                            width: '15%',
                                            backgroundColor: '#f5f5f5',
                                            fontWeight: 600,
                                            fontSize: '1rem',
                                            color: '#364C63',
                                            padding: '8px'
                                        }}>
                                            Field
                                        </TableCell>
                                        <TableCell sx={{
                                            width: '42.5%',
                                            backgroundColor: '#e8f5e9',
                                            color: '#2e7d32',
                                            fontWeight: 600,
                                            fontSize: '1rem',
                                            padding: '8px'
                                        }}>
                                            New Record
                                        </TableCell>
                                        <TableCell sx={{
                                            width: '42.5%',
                                            backgroundColor: '#EF6F53',
                                            color: 'white',
                                            fontWeight: 600,
                                            fontSize: '1rem',
                                            padding: '8px'
                                        }}>
                                            Existing Record <span style={{ fontSize: '0.8rem' }}>(★ indicates matching fields)</span>
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow>
                                        <TableCell sx={{ backgroundColor: '#fafafa', padding: '8px' }}>Name</TableCell>
                                        <TableCell sx={{ backgroundColor: '#f1f8f1', padding: '8px' }}>{record?.new?.name || 'N/A'}</TableCell>
                                        <TableCell sx={{
                                            backgroundColor: record?.matches?.name ? '#ffecb3' : '#fff5f5',
                                            padding: '8px',
                                            fontWeight: record?.matches?.name ? 'bold' : 'normal'
                                        }}>
                                            {record?.existing?.name || 'N/A'}
                                            {record?.matches?.name && <span style={{ color: '#d32f2f', marginLeft: '5px' }}>★</span>}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ backgroundColor: '#fafafa', padding: '8px' }}>Phone</TableCell>
                                        <TableCell sx={{ backgroundColor: '#f1f8f1', padding: '8px' }}>{record?.new?.phone || 'N/A'}</TableCell>
                                        <TableCell sx={{
                                            backgroundColor: record?.matches?.phone ? '#ffecb3' : '#fff5f5',
                                            padding: '8px',
                                            fontWeight: record?.matches?.phone ? 'bold' : 'normal'
                                        }}>
                                            {record?.existing?.phone || 'N/A'}
                                            {record?.matches?.phone && <span style={{ color: '#d32f2f', marginLeft: '5px' }}>★</span>}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ backgroundColor: '#fafafa', padding: '8px' }}>Email</TableCell>
                                        <TableCell sx={{ backgroundColor: '#f1f8f1', padding: '8px' }}>{record?.new?.email || 'N/A'}</TableCell>
                                        <TableCell sx={{
                                            backgroundColor: record?.matches?.email ? '#ffecb3' : '#fff5f5',
                                            padding: '8px',
                                            fontWeight: record?.matches?.email ? 'bold' : 'normal'
                                        }}>
                                            {record?.existing?.email || 'N/A'}
                                            {record?.matches?.email && <span style={{ color: '#d32f2f', marginLeft: '5px' }}>★</span>}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ backgroundColor: '#fafafa', padding: '8px' }}>Agent</TableCell>
                                        <TableCell sx={{ backgroundColor: '#f1f8f1', padding: '8px' }}>{record?.new?.agent || 'N/A'}</TableCell>
                                        <TableCell sx={{
                                            backgroundColor: record?.matches?.agent ? '#ffecb3' : '#fff5f5',
                                            padding: '8px',
                                            fontWeight: record?.matches?.agent ? 'bold' : 'normal'
                                        }}>
                                            {record?.existing?.agent || 'N/A'}
                                            {record?.matches?.agent && <span style={{ color: '#d32f2f', marginLeft: '5px' }}>★</span>}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Box sx={{
                            backgroundColor: '#f8f9fa',
                            p: 1,
                            borderRadius: 1
                        }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, color: '#364C63' }}>
                                How would you like to handle this duplicate?
                            </Typography>
                            <FormControl component="fieldset">
                                <RadioGroup
                                    row
                                    value={record.action || 'skip'}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setDuplicateRecords(prev =>
                                            prev.map((r, i) =>
                                                i === idx ? { ...r, action: value } : r
                                            )
                                        );
                                    }}
                                >
                                    <FormControlLabel
                                        value="skip"
                                        control={<Radio size="small" />}
                                        label="Skip"
                                        sx={{ mr: 3 }}
                                    />
                                    <FormControlLabel
                                        value="append"
                                        control={<Radio size="small" />}
                                        label="Add as new"
                                        sx={{ mr: 3 }}
                                    />
                                    <FormControlLabel
                                        value="replace"
                                        control={<Radio size="small" />}
                                        label="Update existing"
                                    />
                                </RadioGroup>
                            </FormControl>
                        </Box>
                    </Box>
                ))}
            </DialogContent>
            <DialogActions sx={{
                p: 3,
                borderTop: '1px solid #eee',
                backgroundColor: '#fafafa'
            }}>
                <Button
                    onClick={() => setShowDuplicateDialog(false)}
                    disabled={isUploading}
                    sx={{ mr: 1 }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleConfirmDuplicates}
                    variant="contained"
                    color="primary"
                    disabled={isUploading}
                    sx={{
                        backgroundColor: '#364C63',
                        '&:hover': {
                            backgroundColor: '#2b3d4f'
                        }
                    }}
                >
                    {isUploading ? 'Processing...' : 'Proceed'}
                </Button>
            </DialogActions>
        </Dialog>
    ))();

    // Render function that returns the memoized content
    const renderDuplicateDialog = () => duplicateDialog;

    const downloadSampleData = () => {
        const link = document.createElement('a');
        link.href = process.env.PUBLIC_URL + '/uploads/Sample_Upload_File.xlsx';
        link.download = 'Sample_Upload_File.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="file-upload-page">
            <div className="upload-header">
                <h2 className="upload_new_headiiii">Upload File </h2>
                <button
                    className="download-sample-btn"
                    onClick={downloadSampleData}
                >
                    Download Sample Data
                </button>
            </div>
            <div className="file-upload">
                <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".csv,.xlsx,.xls"
                    className="file-input"
                />

            </div>
            <div className="containerr">
                <div className="upload-form">
                    {fileHeaders.length > 0 && (
                        <div className="mapping-container">
                            <div className="mapping-rows">
                                {(systemHeaders || []).filter(header => header).map((systemHeader) => (
                                    <div key={systemHeader} className="mapping-row">
                                        <div className="system-header">
                                            {headerLabels[systemHeader] || systemHeader}
                                        </div>
                                        <div className="file-header">
                                            <select
                                                value={headerMapping[systemHeader] || ''}
                                                onChange={(e) => handleMappingChange(systemHeader, e.target.value)}
                                                className="header-select"
                                            >
                                                <option value="">Select Column</option>
                                                {getAvailableOptions(systemHeader)
                                                    .filter(header => header && header.trim()) // Additional safety check
                                                    .map((header) => (
                                                        <option key={header} value={header}>
                                                            {header}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="submit-container">
                                <button
                                    onClick={handleUpload}
                                    className="submitt-btnn"
                                    disabled={!selectedFileName || fileHeaders.length === 0}
                                >
                                    Submit
                                </button>
                            </div>
                        </div>
                    )}

                </div>

                {uploadResult && (
                    <div className="upload-result">
                        {/* <h3 className="upload_res_headii">Upload Summary</h3>
                    <p className="upload_res_para">Total Records: {uploadResult.totalRecords || 0}</p>
                    <p className="upload_res_para">Duplicate Entries: {uploadResult.duplicateCount || 0}</p>
                    <p className="upload_res_para">Unique Records: {uploadResult.uniqueRecords || 0}</p> */}

                        {uploadResult.duplicates && uploadResult.duplicates.length > 0 && (
                            renderDuplicateDialog()
                        )}
                    </div>
                )}

                {error && (
                    <div className="error-messagee">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UploadNew;