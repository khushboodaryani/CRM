// src/components/guards/AdminGuard.js

import React from 'react';
import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const AdminGuard = ({ children }) => {
    // Get token and decode it
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('No token found');
        return <Navigate to="/" replace />;
    }

    try {
        const tokenData = jwtDecode(token);
        console.log('Token data in AdminGuard:', tokenData);

        // Check if user is super_admin or it_admin
        const isAdmin = tokenData.role.toLowerCase() === 'super_admin' || tokenData.role.toLowerCase() === 'it_admin';
        console.log('Is admin:', isAdmin, 'Role:', tokenData.role);

        if (!isAdmin) {
            // Redirect to home or unauthorized page if not admin
            return <Navigate to="/" replace />;
        }

        return children;
    } catch (error) {
        console.error('Error decoding token:', error);
        return <Navigate to="/" replace />;
    }
};

export default AdminGuard;
