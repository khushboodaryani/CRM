// src/components/guards/RequireAuth.js

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const RequireAuth = ({ children }) => {
    const location = useLocation();
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Check if user is authenticated
    if (!token) {
        // Redirect to login page but save the attempted url
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check if user has necessary permissions
    const hasUploadPermission = user.role === 'super_admin' || 
                               user.role === 'it_admin' || 
                               user.role === 'business_head' ||
                               user.role === 'mis' ||
                               (Array.isArray(user.permissions) && user.permissions.includes('upload_document'));

    const hasDownloadPermission = user.role === 'super_admin' || 
                                 user.role === 'it_admin' || 
                                 user.role === 'business_head' ||
                                 user.role === 'mis' ||
                                 (Array.isArray(user.permissions) && user.permissions.includes('download_data'));

    // Redirect MIS role to upload page after login
    if (user.role === 'mis' && location.pathname === '/') {
        return <Navigate to="/upload" replace />;
    }

    // If trying to access upload page
    if (location.pathname === '/upload' && !hasUploadPermission) {
        console.log('User denied upload access:', { role: user.role, permissions: user.permissions });
    }

    // If trying to access download page
    if (location.pathname === '/download' && !hasDownloadPermission) {
        console.log('User denied download access:', { role: user.role, permissions: user.permissions });
    }

    return children;
};

export default RequireAuth;
