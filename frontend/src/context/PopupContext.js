// src/context/PopupContext.js

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const PopupContext = createContext();

export const PopupProvider = ({ children }) => {
  const [popupMessages, setPopupMessages] = useState([]);

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

  const getReminders = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const token = localStorage.getItem('token');

      if (!token) return;

      const response = await axios.get(`${apiUrl}/customers/reminders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
  };

  useEffect(() => {
    // Initial fetch
    getReminders();

    // Set up polling every minute
    const interval = setInterval(getReminders, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <PopupContext.Provider value={{ popupMessages, addPopupMessage, removePopupMessage }}>
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