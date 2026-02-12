// src/components/routes/Sign/Logout/Logout.js

import React from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Logout = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            // Remove the token from local storage first
            localStorage.removeItem("token");
            
            // Clear any other auth-related data
            sessionStorage.clear();
            
            const apiUrl = process.env.REACT_APP_API_URL;
            // Send a logout request to the server
            await axios.post(`${apiUrl}/logout`).catch(err => {
                // Ignore server errors during logout
                console.warn('Server logout failed:', err);
            });

            // Always redirect to login page
            navigate("/login");
        } catch (error) {
            console.error("Error during logout:", error);
            // Even if there's an error, redirect to login
            navigate("/login");
        }
    };

    return (
        <button onClick={handleLogout}>
            Logout
        </button>
    );
};

export default Logout;
