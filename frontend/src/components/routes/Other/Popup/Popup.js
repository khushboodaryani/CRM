// src/components/routes/Other/Popup/Popup.js

import React, { useEffect, useState } from 'react';
import { usePopup } from '../../../../context/PopupContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Popup.css';

const Popup = () => {
    const { popupMessages, removePopupMessage } = usePopup();
    const navigate = useNavigate();
    const [permissions, setPermissions] = useState({});

    // Helper function to convert minutes to HH:MM:SS format
    const formatMinutesToTime = (minutes) => {
        if (!minutes || minutes < 0) return '00:00:00';
        
        const totalMinutes = Math.floor(minutes);
        const hours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;
        const seconds = 0; // Since we're dealing with whole minutes
        
        return `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        const fetchUserPermissions = async () => {
            try {
                const token = localStorage.getItem('token');
                const apiUrl = process.env.REACT_APP_API_URL;
                
                const response = await axios.get(`${apiUrl}/current-user`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                const userPermissions = response.data.permissions || [];
                setPermissions(userPermissions.reduce((acc, perm) => ({ ...acc, [perm]: true }), {}));
            } catch (error) {
                console.error('Error fetching permissions:', error);
            }
        };

        fetchUserPermissions();
    }, []);

    const handleRecordClick = (customer, index) => {
        // First remove the popup
        removePopupMessage(index);
        
        // Then navigate to the customer record
        navigate(`/customers/phone/${customer.phone_no}`, { 
            state: { 
                customer: customer,
                fromReminder: true,
                permissions: permissions
            },
            replace: true // Use replace to prevent back navigation to popup
        });
    };

    const handleClick = (message, index) => {
        if (message.customer) {
            handleRecordClick(message.customer, index);
        } else if (message.onClick) {
            message.onClick();
            removePopupMessage(index);
        }
    };

    if (popupMessages.length === 0) {
        return null;
    }

    return (
        <div className="popup-container">
            {popupMessages.map((message, index) => (
                <div
                    key={index}
                    className={`popup-message ${message.color || message.priority}`}
                    onClick={() => handleClick(message, index)}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="popup-content">
                        <div className="customer-details">
                            <p><strong>Name:</strong> {message.customer?.first_name} {message.customer?.middle_name || ''} {message.customer?.last_name}</p>
                            <p><strong>Phone:</strong> {message.customer?.phone_no}</p>
                            {/* <p><strong>Agent:</strong> {message.customer?.agent_name || 'Not Assigned'}</p> */}
                            {/* {message.customer?.team_name && (
                                <p><strong>Team:</strong> {message.customer?.team_name}</p>
                            )} */}
                        </div>
                        {(message.minutesUntil || message.minutes_until_call) && (
                            <div className="time-info">
                                <p><strong>Scheduled At:</strong> {message.customer?.scheduled_at && new Date(message.customer.scheduled_at).toLocaleString()}</p>
                                <p><strong>Time Until Call:</strong> {formatMinutesToTime(message.minutesUntil || message.minutes_until_call)}</p>
                            </div>
                        )}
                    </div>
                    <button 
                        className="close-button"
                        onClick={(e) => {
                            e.stopPropagation();
                            removePopupMessage(index);
                        }}
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
};

export default Popup;
