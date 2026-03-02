// src/context/PopupContext.js

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const PopupContext = createContext();

export const PopupProvider = ({ children }) => {
  const [popupMessages, setPopupMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState([]);

  const addPopupMessage = (popup) => {
    setPopupMessages(prevMessages => {
      // Check if this specific message has already been shown
      const existingMessageIndex = prevMessages.findIndex(
        msg => msg.customer?.phone_no_primary === popup.customer?.phone_no_primary
      );

      if (existingMessageIndex !== -1) {
        // Update existing message with new priority/time
        const updatedMessages = [...prevMessages];
        updatedMessages[existingMessageIndex] = popup;
        return updatedMessages;
      } else {
        // Add new message
        return [...prevMessages, popup];
      }
    });
  };

  const removePopupMessage = (index) => {
    setPopupMessages(prevMessages => prevMessages.filter((_, i) => i !== index));
  };

  const getReminders = useCallback(async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const token = localStorage.getItem('token');

      if (!token) return;

      const response = await axios.get(`${apiUrl}/customers/reminders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Process reminders for popup notifications
      response.data.forEach(reminder => {
        const minutesUntil = Math.floor((new Date(reminder.scheduled_at) - new Date()) / (1000 * 60));

        // Only show popup for reminders within 15 minutes
        if (minutesUntil <= 15) {
          let priority;
          let color;

          if (minutesUntil <= 5) {
            priority = 'high';
            color = 'red';
          } else if (minutesUntil <= 15) {
            priority = 'medium';
            color = 'orange';
          }

          const popup = {
            customer: reminder,
            priority,
            color,
            minutesUntil,
            onClick: () => {
              window.location.href = `/customers/phone/${reminder.phone_no_primary}`;
            }
          };

          addPopupMessage(popup);
        }
      });
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for notifications and pending delete approval requests
  const fetchNotificationsAndApprovals = useCallback(async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const token = localStorage.getItem('token');
      if (!token) return;

      // 1. Fetch pending approvals (for popups)
      const approvalsRes = await axios.get(`${apiUrl}/customer-delete-requests/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const approvals = approvalsRes.data?.data || [];
      setPendingApprovals(approvals);

      // 2. Fetch notifications (for badge and popups)
      const notificationsRes = await axios.get(`${apiUrl}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const notifications = notificationsRes.data?.data || [];
      setUnreadCount(notificationsRes.data?.unreadCount || 0);

      // Push a popup card for each new pending approval (not already shown)
      approvals.forEach(approval => {
        setPopupMessages(prev => {
          const alreadyShown = prev.some(m => m.type === 'delete_request' && m.requestId === approval.id);
          if (alreadyShown) return prev;
          return [
            ...prev,
            {
              type: 'delete_request',
              requestId: approval.id,
              requesterName: approval.requester_name,
              customerName: approval.customer_name,
              customerId: approval.customer_id,
              createdAt: approval.created_at
            }
          ];
        });
      });

      // Push a popup card for unread delete outcome notifications
      notifications.forEach(notif => {
        if ((notif.type === 'delete_approved' || notif.type === 'delete_rejected') && !notif.is_read) {
          setPopupMessages(prev => {
            const alreadyShown = prev.some(m => m.notificationId === notif.id);
            if (alreadyShown) return prev;
            return [
              ...prev,
              {
                type: 'notification',
                notificationId: notif.id,
                title: notif.title,
                message: notif.message,
                notifType: notif.type,
                createdAt: notif.created_at
              }
            ];
          });
        }
      });
    } catch (error) {
      if (error.response?.status !== 403 && error.response?.status !== 404) {
        console.error('Error fetching notifications/approvals:', error);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Initial fetches
    getReminders();
    fetchNotificationsAndApprovals();

    // Poll every 60 seconds
    const remindersInterval = setInterval(getReminders, 60000);
    const notificationsInterval = setInterval(fetchNotificationsAndApprovals, 30000); // Poll notifications more frequently

    return () => {
      clearInterval(remindersInterval);
      clearInterval(notificationsInterval);
    };
  }, [getReminders, fetchNotificationsAndApprovals]);

  return (
    <PopupContext.Provider value={{
      popupMessages,
      addPopupMessage,
      removePopupMessage,
      unreadCount,
      pendingApprovals,
      refreshApprovals: fetchNotificationsAndApprovals
    }}>
      {children}
    </PopupContext.Provider>
  );
};

export const usePopup = () => {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error('usePopup must be used within a PopupProvider');
  }
  return context;
};