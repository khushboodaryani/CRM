// src/components/routes/Forms/LastChange/LastChanges.js

import React, { useState, useEffect } from "react";
import axios from "axios"; // Import axios for making API requests
import "./LastChange.css";

const LastChanges = ({ customerId, phone_no }) => {
  const [changes, setChanges] = useState([]);

  useEffect(() => {
    const fetchChangeHistory = async () => {
      if (!customerId) {
        console.log('Waiting for customer ID...');
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const apiUrl = process.env.REACT_APP_API_URL;
        console.log('Fetching changes for customer:', customerId);
        
        const response = await axios.get(
          `${apiUrl}/customers/log-change/${customerId}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (response.data?.changeHistory) {
          console.log('Found changes:', response.data.changeHistory.length);
          setChanges(response.data.changeHistory);
        } else if (response.data?.changes) {
          console.log('Found changes from update:', response.data.changes.length);
          setChanges(response.data.changes);
        } else {
          console.log('No changes found in response');
          setChanges([]);
        }
      } catch (error) {
        console.error("Error fetching change history:", error);
        if (error.response?.status === 403) {
          console.error("Authorization error:", error.response.data);
        }
        setChanges([]);
      }
    };

    fetchChangeHistory();
  }, [customerId]); // Fetch history whenever customerId changes
  
  // Field name mapping
  const fieldLabels = {
    'first_name': 'First Name',
    'last_name': 'Last Name',
    'company_name': 'Company Name',
    'phone_no': 'Phone',
    'email_id': 'Email',
    'address': 'Address',
    'lead_source': 'Lead Source',
    'call_date_time': 'Call Date Time',
    'call_status': 'Call Status',
    'call_outcome': 'Call Outcome',
    'call_recording': 'Call Recording',
    'product': 'Product',
    'budget': 'Budget',
    'decision_making': 'Decision Making',
    'decision_time': 'Decision Time',
    'lead_stage': 'Lead Stage',
    'next_follow_up': 'Next Follow Up',
    'assigned_agent': 'Assigned Agent',
    'reminder_notes': 'Reminder Notes',
    'priority_level': 'Priority Level',
    'customer_category': 'Customer Category',
    'tags_labels': 'Tags/Labels',
    'communcation_channel': 'Communication Channel',
    'deal_value': 'Deal Value',
    'conversion_status': 'Conversion Status',
    'customer_history': 'Customer History',
    'comment': 'Comment',
    'scheduled_at': 'Scheduled At',
    'agent_name': 'Agent Name'
  };

  return (
    <div className="last-changes-container">
        <div className="last-headi">Update History</div>
        {changes.length > 0 ? (
            changes.map((change, index) => (
            <p className="changes-content" key={index}>
              <strong>{change.changed_by}</strong> updated <strong>{fieldLabels[change.field] || change.field},</strong>{" "}
              from <em>{change.old_value || "N/A"}</em>{" "}
              <strong>to</strong> <em>{change.new_value || "N/A"}</em> {" "}
              <strong>at</strong> {new Date(change.changed_at).toLocaleString('en-IN', { 
                timeZone: 'Asia/Kolkata',
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit'
              })} {" "}
            </p>
            ))
        ) : (
            <p>No changes detected.</p>
        )}
    </div> 
  );
};

export default LastChanges;
