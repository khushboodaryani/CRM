// src/components/routes/Other/Reminder/Reminder.js

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { usePopup } from '../../../../context/PopupContext';
import { useNavigate } from 'react-router-dom';
import './Reminder.css';

const API = process.env.REACT_APP_API_URL;
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const Reminder = () => {
    const { pendingApprovals, refreshApprovals, popupMessages } = usePopup();
    const [reminders, setReminders] = useState([]);
    const [error, setError] = useState(null);
    const [resolving, setResolving] = useState({}); // { requestId: true } while in flight
    const [resolveMsg, setResolveMsg] = useState('');
    const navigate = useNavigate();

    // Helper function to convert minutes to HH:MM:SS format
    const formatMinutesToTime = (minutes) => {
        if (!minutes || minutes < 0) return '00:00:00';
        const totalMinutes = Math.floor(minutes);
        const hours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;
        return `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:00`;
    };

    const fetchAllReminders = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) { setError('No authentication token found'); return; }
            const response = await axios.get(`${API}/customers/getAllReminders`, { headers: authHeader() });
            const sortedReminders = response.data.sort((a, b) =>
                new Date(a.scheduled_at) - new Date(b.scheduled_at)
            );
            setReminders(sortedReminders);
        } catch (err) {
            console.error('Error fetching reminders:', err);
            setError('Error fetching reminders: ' + err.message);
        }
    }, []);

    // Handle click on a reminder record
    const handleRecordClick = (customer) => {
        navigate(`/customers/phone/${customer.phone_no}`, {
            state: { customer, fromReminder: true }
        });
    };

    // Approve or reject a delete request
    const handleResolve = async (requestId, action) => {
        setResolving(prev => ({ ...prev, [requestId]: true }));
        try {
            const res = await axios.patch(
                `${API}/customer-delete-requests/${requestId}/resolve`,
                { action },
                { headers: authHeader() }
            );
            setResolveMsg(`✅ Request ${action}: ${res.data.customerName || ''}`);
            refreshApprovals();
        } catch (err) {
            setResolveMsg(`❌ Failed: ${err.response?.data?.error || err.message}`);
        } finally {
            setResolving(prev => ({ ...prev, [requestId]: false }));
            setTimeout(() => setResolveMsg(''), 4000);
        }
    };

    useEffect(() => {
        fetchAllReminders();
        const interval = setInterval(fetchAllReminders, 60000);
        return () => clearInterval(interval);
    }, [fetchAllReminders]);

    // Status colour based on time until call
    const getStatusColor = (scheduledAt) => {
        const minutesUntil = Math.floor((new Date(scheduledAt) - new Date()) / (1000 * 60));
        if (minutesUntil <= 5) return 'red';
        if (minutesUntil <= 15) return 'orange';
        return 'green';
    };

    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="reminder-page-container" style={{ padding: '0 1rem' }}>
            {/* ── PENDING DELETE APPROVALS ───────────────────────────────── */}
            {pendingApprovals.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                    <h2 className="list_reminder_headi" style={{ color: '#d32f2f' }}>
                        🔔 Pending Lead Delete Approvals ({pendingApprovals.length})
                    </h2>

                    {resolveMsg && (
                        <div style={{
                            padding: '0.6rem 1rem', marginBottom: '1rem',
                            background: resolveMsg.startsWith('✅') ? '#e8f5e9' : '#ffebee',
                            border: `1px solid ${resolveMsg.startsWith('✅') ? '#a5d6a7' : '#ef9a9a'}`,
                            borderRadius: '6px', fontSize: '0.9rem'
                        }}>
                            {resolveMsg}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {pendingApprovals.map(approval => (
                            <div key={approval.id} style={{
                                background: '#fff8f8',
                                border: '1px solid #ffcdd2',
                                borderLeft: '4px solid #d32f2f',
                                borderRadius: '8px',
                                padding: '1rem 1.25rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '0.75rem'
                            }}>
                                <div>
                                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>
                                        🗑️ Lead Delete Request
                                    </p>
                                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#555' }}>
                                        <strong>{approval.requester_name}</strong> wants to delete lead{' '}
                                        <strong>{approval.customer_name}</strong>
                                    </p>
                                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#999' }}>
                                        Requested: {new Date(approval.created_at).toLocaleString()}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        disabled={resolving[approval.id]}
                                        onClick={() => handleResolve(approval.id, 'approved')}
                                        style={{
                                            padding: '0.45rem 1rem', borderRadius: '6px', border: 'none',
                                            background: '#2e7d32', color: 'white', fontWeight: 600,
                                            cursor: resolving[approval.id] ? 'not-allowed' : 'pointer',
                                            opacity: resolving[approval.id] ? 0.6 : 1, fontSize: '0.85rem'
                                        }}
                                    >
                                        {resolving[approval.id] ? '…' : '✅ Approve'}
                                    </button>
                                    <button
                                        disabled={resolving[approval.id]}
                                        onClick={() => handleResolve(approval.id, 'rejected')}
                                        style={{
                                            padding: '0.45rem 1rem', borderRadius: '6px', border: 'none',
                                            background: '#c62828', color: 'white', fontWeight: 600,
                                            cursor: resolving[approval.id] ? 'not-allowed' : 'pointer',
                                            opacity: resolving[approval.id] ? 0.6 : 1, fontSize: '0.85rem'
                                        }}
                                    >
                                        {resolving[approval.id] ? '…' : '❌ Reject'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── UPCOMING REMINDERS ────────────────────────────────────── */}
            <h2 className="list_reminder_headi">Upcoming Reminders</h2>
            <div className="reminders-container" style={{ marginBottom: '2.5rem' }}>
                <div className="reminders-list">
                    {reminders.length === 0 ? (
                        <p className="empty-reminders-msg" style={{ padding: '2rem', color: '#718096', fontSize: '0.95rem', fontStyle: 'italic', textAlign: 'center' }}>
                            ✨ No upcoming reminders at the moment
                        </p>
                    ) : (
                        reminders.map((reminder, index) => (
                            <div
                                key={index}
                                className={`reminder-item ${getStatusColor(reminder.scheduled_at)}`}
                                onClick={() => handleRecordClick(reminder)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="customer-info">
                                    <p><strong>Name:</strong> {reminder.first_name} {reminder.middle_name || ''} {reminder.last_name}</p>
                                    <p><strong>Phone:</strong> {reminder.phone_no}</p>
                                </div>
                                <div className="time-info">
                                    <p><strong>Scheduled At:</strong> {new Date(reminder.scheduled_at).toLocaleString()}</p>
                                    <p>
                                        <strong>Time Until Call:</strong>{' '}
                                        {formatMinutesToTime(Math.floor((new Date(reminder.scheduled_at) - new Date()) / (1000 * 60)))}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ── NOTIFICATION HISTORY ──────────────────────────────────── */}
            <div className="notification-history-section">
                <div className="history-header">
                    <h2 className="list_reminder_headi" style={{ margin: 0, textTransform: 'none' }}>🔔 Recent Notifications</h2>
                    <button
                        className="mark-read-btn"
                        onClick={async () => {
                            try {
                                await axios.patch(`${API}/notifications/read-all`, {}, { headers: authHeader() });
                                refreshApprovals(); // update badge count
                            } catch (err) { console.error(err); }
                        }}
                    >
                        Mark all as read
                    </button>
                </div>

                <div className="notification-cards-list">
                    {popupMessages.filter(m => m.type === 'notification').length === 0 ? (
                        <div className="empty-history">
                            <p>No past notifications to show</p>
                        </div>
                    ) : (
                        popupMessages
                            .filter(m => m.type === 'notification')
                            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                            .map(notif => (
                                <div key={notif.notificationId} className={`notification-card-item ${notif.notifType === 'delete_approved' ? 'approved' : 'rejected'}`}>
                                    <div className="card-header">
                                        <p className="card-title">
                                            {notif.title}
                                        </p>
                                        <span className="card-time">
                                            {new Date(notif.createdAt).toLocaleString([], {
                                                month: 'short', day: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <div className="card-body">
                                        <p className="card-message">
                                            {notif.message}
                                        </p>
                                    </div>
                                </div>
                            ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reminder;