// src/components/routes/Forms/CustomForm/CustomForm.js

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./CustomForm.css";

const CustomForm = () => {
    const [loading, setLoading] = useState(true);
    const [formFields, setFormFields] = useState([{ fieldName: "", fieldType: "text", dropdownOptions: [] }]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [user, setUser] = useState(null); 
    const [error, setError] = useState(null);  
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    
    useEffect(() => {
        const fetchUser = async () => {
            try {
              const token = localStorage.getItem('token'); // or wherever you store your token
              const apiUrl = process.env.REACT_APP_API_URL; // Get the base URL from the environment variable
              const userResponse = await axios.get(`${apiUrl}/current-user`, 
                { 
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              setUser(userResponse.data);
      
              // Check if the user is an admin
              if (userResponse.data.role === 'Admin') {
                  setIsAdmin(true); // Set state to true if user is an admin
                  console.log("User is an admin.");
              } else {
                  console.log("User is not an admin.");
              }
            } catch (error) {
              setError('Failed to fetch user data.');
              console.error('Error fetching user data:', error);
            }
          };
          
        fetchUser(); 
    }, []);

    // Handle form field changes
    const handleFieldChange = (index, event) => {
        const updatedFields = [...formFields];
        updatedFields[index][event.target.name] = event.target.value;
        setFormFields(updatedFields);
    };

    // Handle adding dropdown options
    const handleAddDropdownOption = (index) => {
        const updatedFields = [...formFields];
        updatedFields[index].dropdownOptions.push(""); // Add an empty option
        setFormFields(updatedFields);
    };

    // Handle dropdown option changes
    const handleDropdownOptionChange = (index, optionIndex, event) => {
        const updatedFields = [...formFields];
        updatedFields[index].dropdownOptions[optionIndex] = event.target.value;
        setFormFields(updatedFields);
    };

    // Remove a form field
    const handleRemoveField = (index) => {
        const updatedFields = [...formFields];
        updatedFields.splice(index, 1);
        setFormFields(updatedFields);
    };

    // Submit form data
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
    
        const allFieldsValid = formFields.every(field => {
            if (field.fieldType === 'dropdown') {
                return field.fieldName.trim() !== "" && field.dropdownOptions.every(option => option.trim() !== "");
            }
            return field.fieldName.trim() !== "";
        });
    
        if (!allFieldsValid) {
            alert("All fields must have a name and valid options before submitting!");
            return;
        }
    
        // Map the fields to submit to the backend
        const fieldsToSubmit = formFields.map(field => {
            let customFieldValue;
            switch (field.fieldType) {
                case 'text':
                    customFieldValue = "Default Text"; // Placeholder text
                    break;
                case 'dropdown':
                    customFieldValue = field.dropdownOptions[0] || ""; // First option
                    break;
                case 'dropdown_checkbox':
                    customFieldValue = field.dropdownOptions.join(", "); // Join checkbox options
                    break;
                default:
                    customFieldValue = "";
            }
    
            return {
                fieldName: field.fieldName,
                fieldType: field.fieldType,
                dropdownOptions: field.fieldType === 'dropdown' ? field.dropdownOptions : undefined,
                custom_field_value: customFieldValue, // Default value
            };
        }).filter(field => field.fieldName);

        try {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.REACT_APP_API_URL; 
            const response = await axios.post(`${apiUrl}/customers/custom-fields`,{ 
                formFields: fieldsToSubmit }, 
                {
                    headers: {
                        Authorization: `Bearer ${token}`, 
                    },
                }
            );

            if (response.data && response.data.success) {
                alert("Custom fields added successfully!");
                setFormFields([{ fieldName: "", fieldType: "text", dropdownOptions: [] }]);
                navigate("/customers");
            } else {
                alert("Failed to add custom fields: " + (response.data.message || "Unknown error"));
            }
        } catch (error) {
            alert("Error while adding fields: " + (error.response?.data?.message || "Please try again."));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="custom-form-container">
            <h2 className="custom-headi">Custom Form</h2>

            <form onSubmit={handleSubmit} className="custom-form">
                {formFields.map((field, index) => (
                    <div key={index} className="form-field">
                        <input
                            type="text"
                            name="fieldName"
                            className="fieldname"
                            value={field.fieldName}
                            placeholder="Field Name"
                            onChange={(e) => handleFieldChange(index, e)}
                            required
                        />
                        <select
                            name="fieldType"
                            value={field.fieldType}
                            onChange={(e) => handleFieldChange(index, e)}
                        >
                            <option value="text">Text</option>
                            <option value="dropdown">Dropdown</option>
                        </select>
                        {field.fieldType === "dropdown" && ( 
                            <div>
                                {field.dropdownOptions.map((option, optionIndex) => (
                                    <div key={optionIndex} className="dropdown-option">
                                        <input
                                            type="text"
                                            value={option}
                                            placeholder={`Option ${optionIndex + 1}`}
                                            onChange={(e) => handleDropdownOptionChange(index, optionIndex, e)}
                                        />
                                    </div>
                                ))}
                                <button type="button" onClick={() => handleAddDropdownOption(index)} className="add-option-btn">
                                    Add More Options
                                </button>
                            </div>
                        )}
                        <button type="button" onClick={() => handleRemoveField(index)} className="remove-field-btn">
                            Remove
                        </button>
                    </div>
                ))}
                
                <button type="submit" className="submit-form-btn">
                    Submit
                </button>
            </form>
        </div>
    );
};

export default CustomForm;
