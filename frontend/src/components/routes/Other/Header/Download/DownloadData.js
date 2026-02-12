// src/components/routes/Other/Header/Download/DownloadData.js

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const DownloadData = () => {
    const navigate = useNavigate();
    const [hasDownloadPermission, setHasDownloadPermission] = useState(false);
    const [userRole, setUserRole] = useState('');

    useEffect(() => {
        // Check user permissions on mount
        const checkPermissions = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const user = JSON.parse(localStorage.getItem('user') || '{}');
                console.log('User from localStorage:', user);

                // Admin roles always have permission
                if (user.role === 'super_admin' || user.role === 'it_admin' || user.role === 'business_head') {
                    console.log('User is admin, granting download permission');
                    setHasDownloadPermission(true);
                    setUserRole(user.role);
                    return;
                }

                const apiUrl = process.env.REACT_APP_API_URL;
                const response = await axios.get(`${apiUrl}/current-user`, {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                });
                
                const userData = response.data;
                console.log('API user data:', userData);
                
                const role = userData.role;
                setUserRole(role);

                // Admin roles always have permission
                if (role === 'super_admin' || role === 'it_admin' || role === 'business_head') {
                    console.log('User is admin (from API), granting download permission');
                    setHasDownloadPermission(true);
                    return;
                }

                // For other roles, check specific permissions
                const userPermissions = userData.permissions || [];
                console.log('User permissions from API:', userPermissions);
                setHasDownloadPermission(userPermissions.includes('download_data'));
            } catch (error) {
                console.error('Error checking download permission:', error);
            }
        };

        checkPermissions();
    }, []);

    const handleDownloadClick = () => {
        // Check if user has permission
        if (userRole === 'super_admin' || userRole === 'it_admin' || userRole === 'business_head' || hasDownloadPermission) {
            navigate('/download');
        } else {
            alert('You do not have permission to download data.');
        }
    };

    // Show button for admin roles or users with permission
    const shouldRender = userRole === 'super_admin' || 
                        userRole === 'it_admin' || 
                        userRole === 'business_head' || 
                        hasDownloadPermission;

    console.log('DownloadData render check:', { userRole, hasDownloadPermission, shouldRender });

    if (!shouldRender) return null;

    return (
        <div className="download-section">
            <img 
                src="/uploads/download.svg"
                className="download-icon"
                alt="download data icon"
                aria-label="Download data"
                onClick={handleDownloadClick}
                style={{ cursor: 'pointer' }}
            />
            <span className="download-text" onClick={handleDownloadClick} style={{ cursor: 'pointer' }}>Download</span>
        </div>
    );
};

export default DownloadData;