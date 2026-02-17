// src/components/routes/Forms/ListForm/ListForm.js

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./ListForm.css";

const ListForm = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [selectedTeamUser, setSelectedTeamUser] = useState('');
  const [availableAgents, setAvailableAgents] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [customersPerPage] = useState(20);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [canAssignTeam, setCanAssignTeam] = useState(false);
  const [canDeleteCustomers, setCanDeleteCustomers] = useState(false);
  const navigate = useNavigate();
  const apiUrl = process.env.REACT_APP_API_URL;

  useEffect(() => {
    const fetchUserAndData = async () => {
      try {
        const token = localStorage.getItem('token');

        // Fetch current user data
        const userResponse = await axios.get(`${apiUrl}/current-user`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const userData = userResponse.data;
        setUser(userData);
        console.log('User data:', userData);

        // Get permissions from stored user data
        const userPermissions = userData.permissions || [];
        // Add view_customer permission if user is an admin role
        if (['super_admin', 'it_admin', 'business_head'].includes(userData.role)) {
          userPermissions.push('view_customer');
        }
        console.log('User stored permissions:', userPermissions);
        setPermissions(userPermissions.reduce((acc, perm) => ({ ...acc, [perm]: true }), {}));

        // Determine if user is admin
        const isAdmin = ['super_admin', 'it_admin', 'business_head'].includes(userData.role);
        console.log('Is admin role?', isAdmin);

        // Determine if user can assign teams (based on role only)
        const hasTeamAssignRole = userData &&
          ['super_admin', 'it_admin', 'business_head', 'team_leader'].includes(userData.role);
        setCanAssignTeam(hasTeamAssignRole);

        // Determine if user can delete (based on role and permission)
        setCanDeleteCustomers(hasTeamAssignRole && userPermissions.includes('delete_customer'));

        // Fetch customers based on user role and permissions
        let customerEndpoint;
        if (userData.role === 'team_leader') {
          customerEndpoint = `${apiUrl}/customers/team`;
        } else if (userData.role === 'user' && userPermissions.includes('view_assigned_customers')) {
          customerEndpoint = `${apiUrl}/customers/assigned`;
        } else {
          customerEndpoint = `${apiUrl}/customers`;
        }

        console.log('Fetching customers from:', customerEndpoint);
        const customersResponse = await axios.get(customerEndpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('Customers response:', customersResponse.data);

        // Handle the response data
        if (customersResponse.data.success && customersResponse.data.data) {
          console.log('Setting customers from data array:', customersResponse.data.data);
          setCustomers(customersResponse.data.data);
        } else if (customersResponse.data.success && customersResponse.data.customers) {
          console.log('Setting customers from customers array:', customersResponse.data.customers);
          setCustomers(customersResponse.data.customers);
        } else if (Array.isArray(customersResponse.data)) {
          console.log('Setting customers from direct array:', customersResponse.data);
          setCustomers(customersResponse.data);
        } else {
          console.log('No valid customer data found in response');
          setCustomers([]);
        }

        // Fetch available agents based on user role and permissions
        if (hasTeamAssignRole) {
          let agentsEndpoint;
          if (isAdmin) {
            // Admin roles can see all users
            agentsEndpoint = `${apiUrl}/users/all`;
            console.log('Admin fetching all users');
          } else if (userData.role === 'team_leader') {
            // Team leaders can only see their team members
            agentsEndpoint = `${apiUrl}/users/team/${userData.team_id}`;
            console.log('Team leader fetching team members');
          }

          if (agentsEndpoint) {
            console.log('Fetching agents from:', agentsEndpoint);
            const agentsResponse = await axios.get(agentsEndpoint, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            // Process agents response
            let agents = [];
            if (agentsResponse.data && Array.isArray(agentsResponse.data.data)) {
              agents = agentsResponse.data.data;
            } else if (agentsResponse.data && Array.isArray(agentsResponse.data)) {
              agents = agentsResponse.data;
            }

            // Filter out admin users from the list if the current user is a team leader
            if (userData.role === 'team_leader') {
              agents = agents.filter(agent =>
                agent.role === 'user' && agent.team_id === userData.team_id
              );
            }

            console.log('Available agents after filtering:', agents);
            setAvailableAgents(agents);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error);
        setLoading(false);
      }
    };

    fetchUserAndData();
  }, [apiUrl]);

  // Get current customers for pagination
  const indexOfLastCustomer = currentPage * customersPerPage;
  const indexOfFirstCustomer = indexOfLastCustomer - customersPerPage;
  const currentCustomers = Array.isArray(customers) ? customers.slice(indexOfFirstCustomer, indexOfLastCustomer) : [];

  // Calculate total pages safely
  const totalPages = Math.ceil((Array.isArray(customers) ? customers.length : 0) / customersPerPage);

  // Pagination component
  const renderPagination = () => {
    if (!Array.isArray(customers) || customers.length === 0) return null;

    return (
      <div className="pagination">
        {currentPage > 1 && (
          <button
            onClick={() => paginate(currentPage - 1)}
            className="page-number"
            aria-label="Previous page"
          >
            Previous
          </button>
        )}

        {[...Array(totalPages).keys()].map((_, idx) => idx + 1)
          .filter((pageNumber) => {
            return (
              pageNumber === 1 || // Always show the first page
              pageNumber === totalPages || // Always show the last page
              pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1 // Show current page and adjacent pages
            );
          })
          .map((pageNumber, index, array) => {
            const isGap = array[index + 1] !== pageNumber + 1 && pageNumber !== totalPages;
            return (
              <React.Fragment key={pageNumber}>
                <button
                  onClick={() => paginate(pageNumber)}
                  className={`page-number ${currentPage === pageNumber ? 'active' : ''}`}
                  aria-label={`Go to page ${pageNumber}`}
                >
                  {pageNumber}
                </button>
                {isGap && <span className="ellipsis">...</span>}
              </React.Fragment>
            );
          })}

        {currentPage < totalPages && (
          <button
            onClick={() => paginate(currentPage + 1)}
            className="page-number"
            aria-label="Next page"
          >
            Next
          </button>
        )}
      </div>
    );
  };

  const handleSelectCustomer = (customer) => {
    if (!canAssignTeam) return;

    setSelectedCustomers(prev => {
      const isSelected = prev.find(c => c.id === customer.id);
      if (isSelected) {
        return prev.filter(c => c.id !== customer.id);
      } else {
        return [...prev, customer];
      }
    });
  };

  const handleSelectAll = () => {
    if (!canAssignTeam) return;

    if (selectedCustomers.length === currentCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(currentCustomers);
    }
  };

  // Handle team assignment
  const handleAssignTeam = async () => {
    if (!selectedTeamUser || selectedCustomers.length === 0) {
      alert('Please select both a user and at least one customer');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${apiUrl}/customers/assign-team`,
        {
          agent_id: parseInt(selectedTeamUser),
          customer_ids: selectedCustomers.map(c => c.id)
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        alert('Customers assigned successfully');
        setSelectedCustomers([]);
        setSelectedTeamUser('');
        // Refresh the customer list
        window.location.reload();
      } else {
        alert(response.data.message || 'Failed to assign customers');
      }
    } catch (error) {
      console.error('Error assigning customers:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to assign customers';
      alert(errorMessage);
    }
  };

  // Function to format the last updated timestamp
  const formatDateTime = (dateString) => {
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };
    return new Date(dateString).toLocaleString('en-GB', options);
  };

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Function to view/edit customer details
  const handleViewCustomer = (customer) => {
    navigate('/customers/phone/' + customer.phone_no, {
      state: {
        customer,
        permissions // Pass permissions to UseForm
      }
    });
  };

  const handleAddRecord = () => {
    if (!permissions.create_customer) {
      setError('You do not have permission to create new customers');
      return;
    }
    navigate("/customer/new");
  };

  // Add handleDeleteSelected function
  const handleDeleteSelected = async () => {
    if (!canDeleteCustomers) {
      alert("You do not have permission to delete customers.");
      return;
    }

    if (selectedCustomers.length === 0) {
      alert("Please select customers to delete.");
      return;
    }

    const confirmDelete = window.confirm(`Are you sure you want to delete ${selectedCustomers.length} selected customers?`);
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem('token');
      const customerIds = selectedCustomers.map(c => c.id);

      const response = await axios.post(`${apiUrl}/customers/delete-multiple`,
        { customerIds },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Remove deleted customers from state
      setCustomers(prev => prev.filter(c => !customerIds.includes(c.id)));
      setSelectedCustomers([]);

      // Show success alert
      alert(`Successfully deleted ${customerIds.length} records!`);
    } catch (error) {
      console.error('Error deleting customers:', error);
      setError('Failed to delete selected records');
    }
  };

  return (
    <div className="list-form-container">
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="error-message">{error.message}</div>
      ) : (
        <div>
          <h2 className="list_form_headi">Customer Relationship Management</h2>
          <div className="list-container">
            <div className="table-container">
              {Array.isArray(customers) && customers.length > 0 ? (
                <div>
                  <table className="customers-table">
                    <thead>
                      <tr className="customer-row">
                        {canAssignTeam && (
                          <th>
                            <input
                              type="checkbox"
                              checked={selectedCustomers.length === currentCustomers.length}
                              onChange={handleSelectAll}
                            />
                          </th>
                        )}
                        <th>S.no.</th>
                        <th>Name</th>
                        <th>Phone</th>
                      </tr>
                    </thead>
                    <tbody className="customer-body">
                      {currentCustomers.map((customer, index) => (
                        <tr
                          key={customer.id}
                          onClick={(e) => {
                            if (e.target.type !== 'checkbox') {
                              handleViewCustomer(customer);
                            }
                          }}
                          className="clickable-row"
                          title="Click to view details"
                        >
                          {canAssignTeam && (
                            <td onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedCustomers.some(c => c.id === customer.id)}
                                onChange={() => handleSelectCustomer(customer)}
                              />
                            </td>
                          )}
                          <td>{(currentPage - 1) * customersPerPage + index + 1}</td>
                          <td className="customer-name">{customer.first_name} {customer.last_name}</td>
                          <td><a href={`tel:${customer.phone_no}`}>{customer.phone_no}</a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No recent records found.</p>
              )}
            </div>

            {/* Team assignment and delete controls */}
            {canAssignTeam && (
              <div className="team-assignment-controls">
                {/* Only show delete button if user has delete permission */}
                {canDeleteCustomers && (
                  <button
                    onClick={handleDeleteSelected}
                    className="delete-selected-btn"
                    disabled={selectedCustomers.length === 0}
                  >
                    Delete Selected
                  </button>
                )}

                {/* Team assignment controls always visible if canAssignTeam */}
                <select
                  value={selectedTeamUser}
                  onChange={(e) => setSelectedTeamUser(e.target.value)}
                  className="team-user-select"
                >
                  <option value="">Select User</option>
                  {availableAgents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.username} {agent.role === 'user' ? '(Agent)' : `(${agent.role})`}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssignTeam}
                  className="assign-team-btn"
                  disabled={!selectedTeamUser || selectedCustomers.length === 0}
                >
                  Assign to Selected User
                </button>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="pagination-container">
              {permissions.create_customer && (
                <button
                  onClick={handleAddRecord}
                  className="add-record-btn"
                  aria-label="Add new customer"
                >
                  Add Record
                </button>
              )}
              {renderPagination()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListForm;
