// src/components/routes/Sign/Login/Login.js

import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../../../utils/api";
import { jwtDecode } from "jwt-decode";
import { getDeviceId } from "../../../../utils/device";
import "./Login.css";

const Login = () => {
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [lockoutTimer, setLockoutTimer] = useState(0);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    // Check if user is locked out
    const checkLockoutStatus = async (email) => {
        if (!email) return;

        const lockedUntil = localStorage.getItem(`lockout_${email}`);
        if (lockedUntil) {
            const remainingTime = Math.ceil((parseInt(lockedUntil) - Date.now()) / 1000);
            if (remainingTime > 0) {
                setIsLocked(true);
                setLockoutTimer(remainingTime);
                startLockoutTimer(remainingTime, email);
            } else {
                localStorage.removeItem(`lockout_${email}`);
            }
        }
    };

    const startLockoutTimer = (duration, email) => {
        setLockoutTimer(duration);

        const timer = setInterval(() => {
            setLockoutTimer(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setIsLocked(false);
                    localStorage.removeItem(`lockout_${email}`);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return timer;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // Check lockout status when email changes
        if (name === 'email') {
            checkLockoutStatus(value);
        }

        // Clear error when user starts typing
        setError(null);
    };

    // Function to validate form inputs
    const validateForm = () => {
        const { email, password } = formData;
        if (!email || !password) {
            setError('Please fill in all the required fields');
            return false;
        }
        if (password.length < 8) {
            setError('Please enter a password with a minimum length of 8 characters');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('🔵 Login form submitted');
        console.log('📧 Email:', formData.email);
        console.log('🔒 Password length:', formData.password.length);

        // Validation checks
        if (!validateForm()) {
            console.log('❌ Validation failed');
            return;
        }
        console.log('✅ Validation passed');

        if (isLocked) {
            console.log('🔒 Account is locked');
            setError(`Account locked. Try again in ${lockoutTimer} seconds`);
            return;
        }

        console.log('🚀 Starting login API call...');
        setLoading(true);

        try {
            // Clear any existing tokens first
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            const deviceId = getDeviceId();
            console.log('📱 Device ID:', deviceId);

            const response = await api.post('/login', formData, {
                headers: {
                    'x-device-id': deviceId
                }
            });
            console.log('✅ Login API response:', response.data);

            if (response.data && response.data.token) {
                // Parse token to get role and permissions
                const tokenData = jwtDecode(response.data.token);
                console.log('Token data:', tokenData);

                // Get default permissions based on role
                const defaultPermissions = {
                    create_customer: ['super_admin', 'it_admin'].includes(tokenData.role),
                    edit_customer: ['super_admin', 'it_admin'].includes(tokenData.role),
                    delete_customer: ['super_admin', 'it_admin'].includes(tokenData.role),
                    view_customer: ['super_admin', 'it_admin', 'business_head'].includes(tokenData.role),
                    view_team_customers: ['super_admin', 'it_admin', 'business_head', 'team_leader'].includes(tokenData.role),
                    view_assigned_customers: true, // All roles can view their own data
                    upload_document: ['super_admin', 'it_admin', 'business_head'].includes(tokenData.role),
                    download_data: ['super_admin', 'it_admin', 'business_head', 'team_leader'].includes(tokenData.role)
                };

                // Store user data with both role-based and token permissions
                const userData = {
                    id: tokenData.userId,
                    username: tokenData.username,
                    email: tokenData.email,
                    role: tokenData.role,
                    company_id: tokenData.company_id || null, // CRITICAL: For multi-tenant isolation
                    team_id: tokenData.team_id,
                    // Combine role-based and token permissions
                    permissions: defaultPermissions,
                    // Store token permissions separately
                    tokenPermissions: tokenData.permissions || []
                };

                console.log('Storing user data:', userData);

                // Store token and user data
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(userData));
                localStorage.setItem('needsReload', 'true');

                // Navigate based on user role
                if (tokenData.role === 'super_admin') {
                    navigate('/super-admin/dashboard', { replace: true });
                } else if (tokenData.role === 'business_head') {
                    navigate('/admin', { replace: true });
                } else if (tokenData.role === 'mis') {
                    navigate('/upload', { replace: true });
                } else {
                    navigate('/customers', { replace: true });
                }
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error("Error during login:", error);

            // Handle lockout
            if (error.response?.status === 429) {
                const { remainingTime } = error.response.data;
                setIsLocked(true);

                // Store lockout expiry time
                const lockoutExpiry = Date.now() + (remainingTime * 1000);
                localStorage.setItem(`lockout_${formData.email}`, lockoutExpiry.toString());

                // Start countdown timer
                startLockoutTimer(remainingTime, formData.email);
                setError(`Too many failed attempts. Try again in ${remainingTime} seconds`);
            } else {
                setError(error.response?.data?.message || "Login failed. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    // Initialize lockout check on component mount
    useEffect(() => {
        const email = formData.email;
        if (email) {
            checkLockoutStatus(email);
        }
    }, []);

    return (
        <div className="login-page">
            <h2 className="login-headi">Login</h2>
            <div className="login-container">
                <div className="login-left">
                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}
                    {isLocked && (
                        <div className="lockout-message">
                            Account locked. Try again in {lockoutTimer} seconds
                        </div>
                    )}
                    <form onSubmit={handleSubmit}>
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            placeholder="Enter email"
                            value={formData.email}
                            onChange={handleInputChange}
                            disabled={isLocked}
                            className={isLocked ? 'input-locked' : ''}
                            required
                        />

                        <label>Password</label>
                        <input
                            type="password"
                            name="password"
                            placeholder="Enter password"
                            value={formData.password}
                            onChange={handleInputChange}
                            disabled={isLocked}
                            className={isLocked ? 'input-locked' : ''}
                            required
                        />

                        <button type="submit">Login</button>
                        <div className="forgot-password-link">
                            <Link to="/forgot-password">Forgot Password</Link>
                        </div>
                    </form>
                </div>

                <div className="login-right">
                    <img
                        src="/uploads/sign.webp"
                        className="sign-icon"
                        alt="sing icon"
                        aria-label="sign"
                    />
                </div>
            </div>
        </div>
    );
};

export default Login;
