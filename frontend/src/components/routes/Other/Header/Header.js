// src/components/routes/Other/Header/Header.js

import React, { useState, useEffect } from "react";
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import FileUpload from './Upload/FileUpload';
import DownloadData from './Download/DownloadData';
import { handleLogoutApi } from '../../../../utils/api';
import "./Header.css";

const Header = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [username, setUsername] = useState('');
    const [userRole, setUserRole] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [permissions, setPermissions] = useState({});
    const navigate = useNavigate(); 

    useEffect(() => {
        console.log('Current permissions state:', permissions);
        console.log('Current role:', userRole);
        console.log('Is admin?', isAdmin);
    }, [permissions, userRole, isAdmin]);

    const fetchUser = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setIsLoading(false);
                return;
            }

            // Get stored user data from localStorage
            const storedUser = JSON.parse(localStorage.getItem('user')) || {};
            console.log('Stored user data:', storedUser);

            const apiUrl = process.env.REACT_APP_API_URL;
            const response = await axios.get(`${apiUrl}/current-user`, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            
            // The actual user data is in response.data
            const userData = response.data;
            console.log('API user data:', userData);
            
            // Set username from userData
            setUsername(userData.username || '');
            
            // Get role directly from userData
            const role = userData.role;
            console.log('Role from API:', role);
            
            // Set admin status based on role
            const isAdminRole = role === 'super_admin' || role === 'it_admin' || role === 'business_head';
            console.log('Is admin role?', isAdminRole);
            
            setIsAdmin(isAdminRole);
            setUserRole(role);

            // For admin roles, set all permissions to true regardless of permissions array
            if (isAdminRole) {
                const adminPermissions = {
                    upload_document: true,
                    download_data: true,
                    view_customer: true,
                    view_team_customers: true,
                    view_assigned_customers: true
                };
                console.log('Setting admin permissions:', adminPermissions);
                setPermissions(adminPermissions);
            } else {
                // For non-admin roles, check specific permissions
                const userPermissions = userData.permissions || [];
                console.log('User permissions from API:', userPermissions);

                const finalPermissions = {
                    upload_document: userPermissions.includes('upload_document'),
                    download_data: userPermissions.includes('download_data'),
                    view_customer: userPermissions.includes('view_customer'),
                    view_team_customers: userPermissions.includes('view_team_customers'),
                    view_assigned_customers: userPermissions.includes('view_assigned_customers')
                };

                console.log('Setting final permissions:', finalPermissions);
                setPermissions(finalPermissions);
            }

        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    // Re-fetch when token changes
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetchUser();
        } else {
            setUsername('');
            setUserRole('');
            setPermissions({});
        }
    }, [localStorage.getItem('token')]);

    const handleSearch = () => {
        if (!searchQuery.trim()) {
            alert("Please enter a search term."); 
            return;
        }

        try {
            const searchTerm = encodeURIComponent(searchQuery.trim());
            navigate(`/customers/search?query=${searchTerm}`);
            setSearchQuery('');
        } catch (error) {
            console.error('Error in search:', error);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleLogout = async () => {
        const confirmLogout = window.confirm("Are you sure you want to log out?");
        if (!confirmLogout) return;
        try {
            await handleLogoutApi(); // This will handle the device ID  and redirect
        } catch (error) {
            console.error('Error during logout:', error);
            // The logout function will handle cleanup and redirect even on error
        }
    };

    const isLoggedIn = !!localStorage.getItem("token");

    const handleReminderClick = () => {
        navigate('/customers/reminders');
    };

    return (
        <div className="header-container">
            {isLoggedIn ? (
                <Link to="/customers" className="logo-link">
                    <img 
                        src="/uploads/logo.webp"
                        className="logo"
                        alt="Company Logo"
                        aria-label="Logo"
                    />
                </Link>
            ) : (
                <img 
                    src="/uploads/logo.webp"
                    className="logo"
                    alt="Company Logo"
                    aria-label="Logo"
                />
            )}
            <div className="header-right">
                {isLoggedIn ? (
                    <>
                        {/* Only show search if user has view permissions */}
                        {(userRole === 'super_admin' || userRole === 'it_admin' || 
                          (permissions && (permissions.view_customer || permissions.view_team_customers || permissions.view_assigned_customers))) && (
                            <div className="header-search">
                                <input
                                    type="text"
                                    className="form-control form-cont"
                                    aria-label="Search input"
                                    placeholder="Search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                />
                                <img 
                                    src="/uploads/search.svg"
                                    className="srch-icon"
                                    alt="search-icon"
                                    onClick={handleSearch}
                                    style={{ cursor: 'pointer' }}
                                />
                            </div>
                        )}
                        
                        {/* Upload button */}
                        {permissions.upload_document && (
                            <div className="file-upload-section">
                                <FileUpload />
                            </div>
                        )}

                        {/* Download button */}
                        {permissions.download_data && (
                            <div className="download-section">
                                <DownloadData /> 
                            </div>
                        )}

                        {/* Only show notification bell if user has view permissions */}
                        {(userRole === 'super_admin' || userRole === 'it_admin' || 
                          (permissions && (permissions.view_customer || permissions.view_team_customers || permissions.view_assigned_customers))) && (
                            <div className="notification-section">
                                <img 
                                    src="/uploads/bell.svg"
                                    className="notification-icon"
                                    alt="notification icon"
                                    aria-label="Notification"
                                    onClick={handleReminderClick}
                                    style={{ cursor: 'pointer' }}
                                />  
                            </div>
                        )}
                        <div className="profile-section">
                            <img 
                                src="/uploads/fundfloat.webp"
                                className="pro-icon"
                                alt="profile icon"
                                aria-label="Profile"
                                onClick={handleLogout}
                            />
                            <span onClick={handleLogout} style={{ cursor: 'pointer', fontSize: '0.85rem', color: '#666' }}>Logout</span>
                            {!isLoading && username && (
                                <span style={{ fontSize: '0.85rem', color: '#666', marginTop: '-2.5px'  }}>
                                    {username}
                                </span>
                            )}
                        </div>
                    </>
                ) : (
                    <Link to="/login">
                        <img 
                            src="/uploads/profile.svg"
                            className="pro-icon"
                            alt="profile icon"
                            aria-label="Profile"
                        />
                    </Link>
                )}
            </div>
        </div>
    );
};

export default Header;
