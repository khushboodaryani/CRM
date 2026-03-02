// src/components/guards/DeptAdminGuard.js
// Allows access only to users with role='admin' (Dept Admin)

import React from 'react';
import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const DeptAdminGuard = ({ children }) => {
    const token = localStorage.getItem('token');
    if (!token) return <Navigate to="/" replace />;

    try {
        const tokenData = jwtDecode(token);
        const role = (tokenData.role || '').toLowerCase();

        // Updated to include new roles
        if (!['admin', 'dept_admin', 'sub_dept_admin', 'business_head', 'super_admin'].includes(role)) {
            return <Navigate to="/" replace />;
        }
        return children;
    } catch {
        return <Navigate to="/" replace />;
    }
};

export default DeptAdminGuard;
