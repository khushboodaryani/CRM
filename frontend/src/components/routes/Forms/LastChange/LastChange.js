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

  // Dynamic field name formatting - converts snake_case to Title Case
  const formatFieldName = (fieldName) => {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="last-changes-container">
      <div className="last-headi">Update History</div>
      {changes.length > 0 ? (
        changes.map((change, index) => (
          <p className="changes-content" key={index}>
            <strong>{change.changed_by}</strong> updated <strong>{formatFieldName(change.field)},</strong>{" "}
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
