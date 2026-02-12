// /src/components/routes/Sign/Register/Register.js

import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./Register.css"

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        department_id: ""
    });
    const [departments, setDepartments] = useState([]);
    const [alertMessage, setAlertMessage] = useState(null);
    const [alertType, setAlertType] = useState(null);
    const [registrationStatus, setRegistrationStatus] = useState(null);
    const [isRegistering, setIsRegistering] = useState(false);

    useEffect(() => {
        // Fetch departments when component mounts
        const fetchDepartments = async () => {
            try {
                const apiUrl = process.env.REACT_APP_API_URL;
                const response = await axios.get(`${apiUrl}/departments`);
                setDepartments(response.data);
            } catch (error) {
                console.error("Error fetching departments:", error);
                setAlertMessage("Failed to load departments");
            }
        };
        fetchDepartments();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Function to validate form inputs
    const validateForm = () => {
        const { username, email, password, department_id } = formData;
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        
        if (!username || !email || !password || !department_id) {
            setAlertMessage('Please fill in all the required fields');
            return false;
        }
        if (!emailRegex.test(email)) {
            setAlertMessage('Please enter a valid email address');
            return false;
        }
        if (password.length < 8) {
            setAlertMessage('Please enter a password with a minimum length of 8 characters');
            return false;
        }
        return true;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        // Validation checks
        if (!validateForm()) return;

        setIsRegistering(true);
        setAlertMessage(null);
        
        const userData = {
            ...formData,
            role: 'User' // Default role
        };
        console.log('Request data:', userData);

        try {
            const apiUrl = process.env.REACT_APP_API_URL;
            const response = await axios.post(`${apiUrl}/register`, userData);
            setRegistrationStatus('pending');
            setAlertType('success');
            setAlertMessage("Registration submitted! Please wait for department admin approval. You'll receive an email once approved.");
            
            // Clear form
            setFormData({
                username: "",
                email: "",
                password: "",
                department_id: ""
            });
        } catch (error) {
            console.error('Error during registration:', error.response ? error.response.data : error.message);
            
            if (error.response) {
                const errorData = error.response.data;
                setAlertType('error');
                if (errorData.message) {
                    setAlertMessage(errorData.message);
                } else {
                    setAlertMessage("An unexpected error occurred. Please try again.");
                }
            } else if (error.message === 'No authentication token found') {
                setAlertType('error');
                setAlertMessage("No authentication token found. Please try logging in again.");
            } else {
                setAlertType('error');
                setAlertMessage("Network error. Please check your internet connection and try again.");
            }
        } finally {
            setIsRegistering(false);
        }
    };

    return (
        <div>
            <h2 className="register-headi">Registration</h2>
            {alertMessage && (
                <div className={`alert ${alertType === 'error' ? 'alert-error' : 'alert-success'}`}>
                    {alertMessage}
                </div>
            )}
            {registrationStatus === 'pending' ? (
                <div className="pending-approval">
                    <h3 className="pending-heading">Registration Pending Approval</h3>
                    <p className="pending-text">Your registration is pending approval from the department admin.</p>
                    <p className="pending-text">You will receive an email once your registration is approved.</p>
                </div>
            ) : (
                <div className="register-container">
                    <div className="register-left">
                        <form onSubmit={handleSubmit}>
                            <label>Username</label>
                            <input 
                                type="text" 
                                name="username" 
                                placeholder="Enter username"
                                value={formData.username} 
                                onChange={handleInputChange} 
                                required 
                                aria-label="Username"
                            />
                            
                            <label>Email</label>
                            <input 
                                type="email" 
                                name="email" 
                                placeholder="Enter email"
                                value={formData.email} 
                                onChange={handleInputChange} 
                                required 
                                aria-label="Email"
                            />
                            
                            <label>Password</label>
                            <input 
                                type="password" 
                                name="password" 
                                placeholder="Enter password"
                                value={formData.password} 
                                onChange={handleInputChange} 
                                required 
                                aria-label="Password"
                                minLength="8"
                            />

                            <label>Choose Department</label>
                            <select
                                name="department_id"
                                value={formData.department_id}
                                onChange={handleInputChange}
                                required
                                aria-label="Department"
                            >
                                <option value="">Select a department</option>
                                {departments.filter(dept => dept.name !== 'Team 007').map(dept => (
                                    <option key={dept.id} value={dept.id}>
                                        {dept.name}
                                    </option>
                                ))}
                            </select>
                            
                            <button 
                                type="submit" 
                                disabled={isRegistering}
                                className={isRegistering ? 'button-registering' : ''}
                            >
                                {isRegistering ? 'Registering...' : 'Register'}
                            </button>
                        </form>

                        <div className="logis">
                            <h6 className="head2">Already have an account?</h6>
                            <Link to="/login" className="login-link">
                                Login
                            </Link>
                        </div>
                    </div>

                    <div className="register-right">
                        <img
                            src="/uploads/sign.webp"
                            className="register-icon"
                            alt="register icon"
                            aria-label="sign"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Register;
