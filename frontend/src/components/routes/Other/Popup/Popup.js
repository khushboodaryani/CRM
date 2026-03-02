// src/components/routes/Other/Popup/Popup.js

import React, { useEffect, useState } from 'react';
import { usePopup } from '../../../../context/PopupContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Popup.css';

const API = process.env.REACT_APP_API_URL;
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const Popup = () => {
    const { popupMessages, removePopupMessage, refreshApprovals } = usePopup();
    const navigate = useNavigate();
    const [permissions, setPermissions] = useState({});
    const [resolving, setResolving] = useState({}); // { requestId: true }

    // Helper function to convert minutes to HH:MM:SS format
    const formatMinutesToTime = (minutes) => {
        if (!minutes || minutes < 0) return '00:00:00';
        const totalMinutes = Math.floor(minutes);
        const hours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;
        const seconds = 0;
        return `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        const fetchUserPermissions = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API}/current-user`, {
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

    // Handle approve / reject on a popup card
    const handleResolve = async (requestId, action, index) => {
        setResolving(prev => ({ ...prev, [requestId]: true }));
        try {
            await axios.patch(
                `${API}/customer-delete-requests/${requestId}/resolve`,
                { action },
                { headers: authHeader() }
            );
            removePopupMessage(index);
            refreshApprovals(); // update badge count
        } catch (err) {
            console.error('Failed to resolve delete request:', err);
        } finally {
            setResolving(prev => ({ ...prev, [requestId]: false }));
        }
    };

    const handleRecordClick = (customer, index) => {
        removePopupMessage(index);
        navigate(`/customers/phone/${customer.phone_no}`, {
            state: { customer, fromReminder: true, permissions },
            replace: true
        });
    };

    const handleClick = (message, index) => {
        if (message.type === 'delete_request') return; // buttons handle it
        if (message.customer) {
            handleRecordClick(message.customer, index);
        } else if (message.onClick) {
            message.onClick();
            removePopupMessage(index);
        }
    };

    if (popupMessages.length === 0) return null;

    return (
        <div className="popup-container">
            {popupMessages.map((message, index) => {
                /* ── Delete Request Card ── */
                if (message.type === 'delete_request') {
                    const busy = resolving[message.requestId];
                    return (
                        <div
                            key={`dr-${message.requestId}`}
                            className="popup-message"
                            style={{
                                borderLeft: '4px solid #d32f2f',
                                background: '#fff8f8',
                                cursor: 'default'
                            }}
                        >
                            <div className="popup-content">
                                <div className="customer-details">
                                    <p style={{ fontWeight: 600, marginBottom: '0.3rem' }}>
                                        🗑️ Lead Delete Approval
                                    </p>
                                    <p style={{ fontSize: '0.82rem', margin: '0 0 0.2rem' }}>
                                        <strong>{message.requesterName}</strong> wants to delete lead{' '}
                                        <strong>{message.customerName || message.targetName}</strong>
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                                    <button
                                        disabled={busy}
                                        onClick={() => handleResolve(message.requestId, 'approved', index)}
                                        style={{
                                            padding: '0.35rem 0.9rem', borderRadius: '5px', border: 'none',
                                            background: '#2e7d32', color: 'white', fontWeight: 600,
                                            cursor: busy ? 'not-allowed' : 'pointer', fontSize: '0.8rem',
                                            opacity: busy ? 0.6 : 1
                                        }}
                                    >
                                        {busy ? '…' : '✅ Approve'}
                                    </button>
                                    <button
                                        disabled={busy}
                                        onClick={() => handleResolve(message.requestId, 'rejected', index)}
                                        style={{
                                            padding: '0.35rem 0.9rem', borderRadius: '5px', border: 'none',
                                            background: '#c62828', color: 'white', fontWeight: 600,
                                            cursor: busy ? 'not-allowed' : 'pointer', fontSize: '0.8rem',
                                            opacity: busy ? 0.6 : 1
                                        }}
                                    >
                                        {busy ? '…' : '❌ Reject'}
                                    </button>
                                </div>
                            </div>
                            <button
                                className="close-button"
                                onClick={(e) => { e.stopPropagation(); removePopupMessage(index); }}
                            >
                                ×
                            </button>
                        </div>
                    );
                }

                /* ── Notification Card (Outcome) ── */
                if (message.type === 'notification') {
                    const isApproved = message.notifType === 'delete_approved';
                    return (
                        <div
                            key={`notif-${message.notificationId}`}
                            className="popup-message"
                            style={{
                                borderLeft: `4px solid ${isApproved ? '#2e7d32' : '#d32f2f'}`,
                                background: isApproved ? '#f1f8e9' : '#fff8f8',
                                cursor: 'pointer'
                            }}
                            onClick={() => {
                                navigate('/notifications');
                                removePopupMessage(index);
                            }}
                        >
                            <div className="popup-content">
                                <p style={{ fontWeight: 600, marginBottom: '0.3rem' }}>
                                    {message.title}
                                </p>
                                <p style={{ fontSize: '0.82rem', margin: 0, color: '#555' }}>
                                    {message.message}
                                </p>
                            </div>
                            <button
                                className="close-button"
                                onClick={(e) => { e.stopPropagation(); removePopupMessage(index); }}
                            >
                                ×
                            </button>
                        </div>
                    );
                }

                /* ── Standard Reminder Card ── */
                return (
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
                            onClick={(e) => { e.stopPropagation(); removePopupMessage(index); }}
                        >
                            ×
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default Popup;
