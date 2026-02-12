// src/controllers/updateCustomers.js

import connectDB from '../db/index.js';  

export const updateCustomer = async (req, res) => {
    const pool = await connectDB();
    let connection;
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
  
      connection = await pool.getConnection();
      await connection.beginTransaction(); 
  
      const customerId = req.params.id;
      const updates = req.body;
  
      if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid updates provided.' });
      }
  
      // Get the current customer details with a lock to prevent concurrent updates
      const [customerRows] = await connection.execute(
        'SELECT * FROM customers WHERE id = ? FOR UPDATE NOWAIT',
        [customerId]
      );
  
      if (customerRows.length === 0) {
        return res.status(404).json({ error: 'Customer not found.' });
      }
  
      const customer = customerRows[0];
      const cUniqueId = customer.C_unique_id;

      // Define allowed fields and their types
      const allowedFields = {
        first_name: 'string',
        last_name: 'string',
        company_name: 'string',
        phone_no: 'string',
        email_id: 'string',
        address: 'string',
        lead_source: 'enum',
        call_date_time: 'datetime',
        call_status: 'enum',
        call_outcome: 'enum',
        call_recording: 'string',
        product: 'string',
        budget: 'string',
        decision_making: 'enum',
        decision_time: 'enum',
        lead_stage: 'enum',
        next_follow_up: 'datetime',
        assigned_agent: 'string',
        reminder_notes: 'string',
        priority_level: 'enum',
        customer_category: 'enum',
        tags_labels: 'enum',
        communcation_channel: 'enum',
        deal_value: 'string',
        conversion_status: 'enum',
        customer_history: 'enum',
        comment: 'string',
        scheduled_at: 'datetime',
        agent_name: 'string'
      };

      // Database enum values for validation and normalization
      const enumValues = {
        'lead_source': ['website', 'data', 'referral', 'ads'],
        'call_status': ['connected', 'not connected', 'follow_up'],
        'call_outcome': ['interested', 'not interested', 'call_later', 'wrong_number'],
        'decision_making': ['yes', 'no'],
        'decision_time': ['immediate', '1_week', '1_month', 'future_investment'],
        'lead_stage': ['new', 'in_progress', 'qualified', 'converted', 'lost'],
        'priority_level': ['low', 'medium', 'high'],
        'customer_category': ['hot', 'warm', 'cold'],
        'tags_labels': ['premium_customer', 'repeat_customer', 'demo_required'],
        'communcation_channel': ['call', 'whatsapp', 'email', 'sms'],
        'conversion_status': ['lead', 'opportunity', 'customer'],
        'customer_history': ['previous calls', 'purchases', 'interactions78']
      };

      // Helper function to validate and normalize enum values
      const normalizeEnumValue = (fieldName, value) => {
        if (!value || !enumValues[fieldName]) return value;
        
        const normalizedValue = String(value).toLowerCase().trim();
        const allowedValues = enumValues[fieldName];
        
        // Try direct match first
        let matchedValue = allowedValues.find(v => v.toLowerCase() === normalizedValue);
        
        // If no direct match, try with underscore/space variations
        if (!matchedValue) {
          const valueWithSpaces = normalizedValue.replace(/_/g, ' ');
          const valueWithUnderscores = normalizedValue.replace(/ /g, '_');
          
          matchedValue = allowedValues.find(v => 
            v.toLowerCase() === valueWithSpaces || 
            v.toLowerCase().replace(/ /g, '_') === valueWithUnderscores
          );
        }
        
        return matchedValue || null; // Return null if no valid match found
      };

      // Helper function to normalize date values
      const normalizeDateValue = (value, type) => {
        if (!value) return null;
        
        if (type === 'date') {
          try {
            const date = new Date(value);
            if (isNaN(date.getTime())) return value;
            // Convert to IST by adding 5 hours and 30 minutes
            date.setHours(date.getHours() + 5);
            date.setMinutes(date.getMinutes() + 30);
            return date.toISOString().slice(0, 10);
          } catch (e) {
            return value;
          }
        }
        
        if (type === 'datetime') {
          try {
            const date = new Date(value);
            if (isNaN(date.getTime())) return value;
            // Convert to IST by adding 5 hours and 30 minutes
            date.setHours(date.getHours() + 5);
            date.setMinutes(date.getMinutes() + 30);
            return date.toISOString().slice(0, 19).replace('T', ' ');
          } catch (e) {
            return value;
          }
        }
        
        return value;
      };

      // Check for recent updates to prevent duplicate entries
      const fieldToUpdate = Object.keys(updates)[0];
      let newValue = Object.values(updates)[0];
      
      // Apply appropriate normalization based on field type
      const fieldType = allowedFields[fieldToUpdate];
      if (fieldType === 'enum') {
        newValue = normalizeEnumValue(fieldToUpdate, newValue);
        if (newValue === null) {
          return res.status(400).json({ 
            error: `Invalid value for ${fieldToUpdate}. Allowed values: ${enumValues[fieldToUpdate].join(', ')}` 
          });
        }
      } else if (fieldType === 'datetime' || fieldType === 'date') {
        newValue = normalizeDateValue(newValue, fieldType);
      }
      
      const [recentUpdates] = await connection.execute(
        `SELECT * FROM updates_customer 
         WHERE customer_id = ? 
         AND field = ?
         AND new_value = ?
         AND changed_at >= DATE_SUB(NOW(), INTERVAL 5 SECOND)`,
        [customerId, fieldToUpdate, newValue]
      );
  
      if (recentUpdates.length > 0) {
        await connection.rollback();
        return res.status(409).json({ 
          message: 'This exact update was just made to this record. Please try again.',
          details: 'Duplicate update prevented'
        });
      }

      // Process only the fields that are actually changing
      const fieldsToUpdate = [];
      const updateValues = [];
      const updateLogs = [];

      for (const [field, newValue] of Object.entries(updates)) {
        // Skip if field is not in allowed list
        if (!allowedFields[field]) continue;

        const fieldType = allowedFields[field];
        const oldValue = customer[field];
        
        // Apply appropriate normalization based on field type
        let normalizedNewValue, normalizedOldValue;
        
        if (fieldType === 'enum') {
          normalizedNewValue = normalizeEnumValue(field, newValue);
          normalizedOldValue = normalizeEnumValue(field, oldValue);
          
          // Skip invalid enum values
          if (newValue && normalizedNewValue === null) {
            console.warn(`Invalid enum value '${newValue}' for field '${field}'. Skipping update.`);
            continue;
          }
        } else if (fieldType === 'datetime' || fieldType === 'date') {
          normalizedNewValue = normalizeDateValue(newValue, fieldType);
          normalizedOldValue = normalizeDateValue(oldValue, fieldType);
        } else {
          normalizedNewValue = newValue;
          normalizedOldValue = oldValue;
        }

        // Skip if values are equal after normalization
        if (normalizedNewValue === normalizedOldValue) continue;
        if (!normalizedNewValue && !normalizedOldValue) continue;

        fieldsToUpdate.push(`${field} = ?`);
        updateValues.push(normalizedNewValue);
        updateLogs.push({
          field,
          oldValue: normalizedOldValue,
          newValue: normalizedNewValue
        });
      }

      // Only proceed if there are actual changes
      if (fieldsToUpdate.length > 0) {
        // Add last_updated to the update
        fieldsToUpdate.push('last_updated = NOW()');
        
        // Update the customers table first
        const updateQuery = `UPDATE customers SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
        updateValues.push(customerId);
        await connection.execute(updateQuery, updateValues);

        // Log the changes using the insertChangeLog function
        await insertChangeLog(connection, customerId, cUniqueId, updateLogs, req.user.username);

        await connection.commit();

        res.status(200).json({ 
          message: 'Customer details updated successfully.',
          updatedFields: updateLogs.map(log => log.field),
          customerId,
          C_unique_id: cUniqueId
        });
      } else {
        await connection.rollback();
        res.status(400).json({ 
          message: 'No changes were made.',
          details: 'All provided values were identical to current values'
        });
      }

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Error updating customer details:', error);
      res.status(500).json({ 
        error: 'Failed to update customer details.',
        details: error.message 
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
};

// **************

// Function to insert change log entries
export const insertChangeLog = async (connection, customerId, C_unique_id, changes, username) => {
  try {
    // Ensure all required fields are present
    if (!customerId || !username) {
      throw new Error('Missing required fields for change log');
    }

    // Insert each change as a separate record
    for (const change of changes) {
      const query = `
        INSERT INTO updates_customer (
          customer_id, C_unique_id, field, 
          old_value, new_value, changed_by, 
          changed_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
      `;

      const params = [
        customerId,
        C_unique_id || null,
        change.field || null,
        change.oldValue || null,
        change.newValue || null,
        username
      ];

      console.log('Inserting change log:', {
        query,
        params,
        change
      });

      await connection.execute(query, params);
    }
  } catch (error) {
    console.error('Error inserting change log:', error);
    throw error;
  }
};

export const historyCustomer = async (req, res) => {
  try {
    // Check if user exists in request
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const connection = await connectDB();
    const { customerId, C_unique_id, changes } = req.body;

    // Validate required fields
    if (!customerId || !changes || !Array.isArray(changes)) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['customerId', 'changes (array)'],
        received: req.body
      });
    }

    // First get the customer to check authorization
    const [customer] = await connection.execute(
      'SELECT agent_name FROM customers WHERE id = ?',
      [customerId]
    );

    if (customer.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Check authorization
    if (req.user.role !== 'super_admin' && req.user.role !== 'business_head' && req.user.role !== 'team_leader' && customer[0].agent_name !== req.user.username) {
      return res.status(403).json({ 
        message: 'You are not authorized to log changes for this customer',
        user: req.user,
        customerAgent: customer[0].agent_name
      });
    }

    // Insert the changes
    await insertChangeLog(
      connection,
      customerId,
      C_unique_id,
      changes,
      req.user.username
    );

    res.status(200).json({ 
      message: 'Changes logged successfully',
      changeCount: changes.length
    });
  } catch (error) {
    console.error('Error logging changes:', error);
    res.status(500).json({ 
      message: 'Failed to log changes', 
      error: error.message,
      user: req.user
    });
  }
};


// Function to fetch change history for a customer
const getChangeHistory = async (connection, customerId) => {
  const fetchHistoryQuery = `
    SELECT * FROM updates_customer 
    WHERE customer_id = ? 
    ORDER BY changed_at DESC, id DESC`;

  const [changeHistory] = await connection.execute(fetchHistoryQuery, [customerId]);
  return changeHistory;
};

// Main function to handle logging and fetching change history
export const gethistoryCustomer = async (req, res) => {
  try {
    // Check if user exists in request
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const connection = await connectDB();
    const customerId = req.params.id;

    // First get the customer to check authorization
    const [customer] = await connection.execute(
      'SELECT agent_name FROM customers WHERE id = ?',
      [customerId]
    );

    if (customer.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Check authorization
    if (req.user.role !== 'super_admin' && req.user.role !== 'business_head' && req.user.role !== 'team_leader' && customer[0].agent_name !== req.user.username) {
      return res.status(403).json({ 
        message: 'You are not authorized to view this customer\'s history',
        user: req.user,
        customerAgent: customer[0].agent_name
      });
    }

    const changeHistory = await getChangeHistory(connection, customerId);
    res.status(200).json({ changeHistory });
  } catch (error) {
    console.error('Error fetching change history:', error);
    res.status(500).json({ 
      message: 'Failed to fetch change history', 
      error: error.message,
      user: req.user
    });
  }
};

