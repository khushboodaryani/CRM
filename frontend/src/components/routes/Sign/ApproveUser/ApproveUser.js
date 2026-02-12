// src/components/routes/Sign/ApproveUser/ApproveUser.js

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ApproveUser.css';

const ApproveUser = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleApproval = async (approved) => {
        try {
            const apiUrl = process.env.REACT_APP_API_URL;
            const response = await axios.post(`${apiUrl}/approve-registration`, {
                token,
                approved
            });
            setSuccess(true);
            setError(null);
        } catch (error) {
            console.error('Error handling approval:', error);
            setError(error.response?.data?.message || 'An error occurred');
        }
    };

    return (
        <div className="approve-user-container">
            <div className="approve-user-card">
                <h2 className="approve-user-heading">User Registration Approval</h2>
                
                {error && (
                    <div className="error-messagee">
                        {error}
                    </div>
                )}

                {success ? (
                    <div className="success-messagee">
                        <p>Registration has been processed successfully.</p>
                    </div>
                ) : (
                    <div className="approval-buttons">
                        <p className="approve-user-para">Would you like to approve this user registration?</p>
                        <div className="button-grouppp">
                            <button 
                                onClick={() => handleApproval(true)}
                                className="approve-button"
                            >
                                Approve
                            </button>
                            <button 
                                onClick={() => handleApproval(false)}
                                className="reject-button"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ApproveUser;