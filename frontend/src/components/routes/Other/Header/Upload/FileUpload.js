// src/components/routes/Other/Header/Upload/FileUpload.js

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const FileUpload = () => {
    const navigate = useNavigate();
    const [hasUploadPermission, setHasUploadPermission] = useState(false);
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
                    console.log('User is admin, granting upload permission');
                    setHasUploadPermission(true);
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
                    console.log('User is admin (from API), granting upload permission');
                    setHasUploadPermission(true);
                    return;
                }

                // For other roles, check specific permissions
                const userPermissions = userData.permissions || [];
                console.log('User permissions from API:', userPermissions);
                setHasUploadPermission(userPermissions.includes('upload_document'));
            } catch (error) {
                console.error('Error checking upload permission:', error);
            }
        };

        checkPermissions();
    }, []);

    const handleUploadClick = () => {
        // Check if user has permission
        if (userRole === 'super_admin' || userRole === 'it_admin' || userRole === 'business_head' || hasUploadPermission) {
            navigate('/upload');
        } else {
            alert('You do not have permission to upload files.');
        }
    };

    // Show button for admin roles or users with permission
    const shouldRender = userRole === 'super_admin' || 
                        userRole === 'it_admin' || 
                        userRole === 'business_head' || 
                        hasUploadPermission;

    console.log('FileUpload render check:', { userRole, hasUploadPermission, shouldRender });

    if (!shouldRender) return null;

    return (
        <div className="file-upload-section">
            <img 
                src="/uploads/file.svg"
                className="file-icon"
                alt="file upload icon"
                aria-label="Upload file"
                onClick={handleUploadClick}
                style={{ cursor: 'pointer' }}
            />
            <span className="file-upl" onClick={handleUploadClick} style={{ cursor: 'pointer' }}>File Upload</span>
        </div>
    );
};

export default FileUpload;