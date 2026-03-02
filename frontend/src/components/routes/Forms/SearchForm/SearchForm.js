// src/components/routes/Forms/SearchForm/SearchForm.js

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate, Link } from "react-router-dom";
import "./SearchForm.css";

const SearchForm = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [selectedTeamUser, setSelectedTeamUser] = useState('');
  const [availableAgents, setAvailableAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10);
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [canAssignTeam, setCanAssignTeam] = useState(false);
  const [canDeleteCustomers, setCanDeleteCustomers] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchUserAndTeam = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;

      // Fetch current user data
      const userResponse = await axios.get(`${apiUrl}/current-user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const userData = userResponse.data;
      setUser(userData);

      // Get permissions from stored user data
      const userPermissions = userData.permissions || [];
      console.log('User stored permissions:', userPermissions);
      setPermissions(userPermissions.reduce((acc, perm) => ({ ...acc, [perm]: true }), {}));

      // Determine if user can assign teams (based on role only)
      const hasTeamAssignRole = userData &&
        ['super_admin', 'it_admin', 'business_head', 'team_leader'].includes(userData.role);
      setCanAssignTeam(hasTeamAssignRole);

      // Determine if user can delete (based on role and permission)
      // sub_dept_admin and dept_admin also get the delete button (approval flow handles enforcement)
      const canDeleteRole = userData &&
        ['super_admin', 'it_admin', 'business_head', 'team_leader', 'sub_dept_admin', 'admin'].includes(userData.role);
      setCanDeleteCustomers(canDeleteRole && userPermissions.includes('delete_customer'));

      // Fetch available agents if user can assign teams
      if (hasTeamAssignRole) {
        const isAdmin = ['super_admin', 'it_admin', 'business_head'].includes(userData.role);
        let agentsEndpoint;

        if (isAdmin) {
          agentsEndpoint = `${apiUrl}/users/all`;
        } else if (userData.role === 'team_leader') {
          agentsEndpoint = `${apiUrl}/users/team/${userData.team_id}`;
        }

        if (agentsEndpoint) {
          const agentsResponse = await axios.get(agentsEndpoint, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          let agents = [];
          if (agentsResponse.data && Array.isArray(agentsResponse.data.data)) {
            agents = agentsResponse.data.data;
          } else if (agentsResponse.data && Array.isArray(agentsResponse.data)) {
            agents = agentsResponse.data;
          }

          // Filter out admin users if current user is team leader
          if (userData.role === 'team_leader') {
            agents = agents.filter(agent =>
              agent.role === 'user' && agent.team_id === userData.team_id
            );
          }

          setAvailableAgents(agents);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    fetchUserAndTeam();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams(location.search);
        const searchQuery = query.get('query');

        if (!searchQuery) {
          setSearchResults([]);
          setLoading(false);
          return;
        }

        const token = localStorage.getItem('token');
        const apiUrl = process.env.REACT_APP_API_URL;

        // Build search URL based on user role
        let searchUrl = `${apiUrl}/customers/search?query=${searchQuery}`;

        // Add role-specific parameters
        if (user && user.role === 'team_leader' && user.team_id) {
          searchUrl += `&team_id=${user.team_id}`;
        }

        const response = await axios.get(searchUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        // Handle different response formats
        let results = [];
        if (response.data) {
          if (Array.isArray(response.data)) {
            results = response.data;
          } else if (response.data.data && Array.isArray(response.data.data)) {
            results = response.data.data;
          } else if (typeof response.data === 'object') {
            // If it's a single object, wrap it in an array
            results = [response.data];
          }
        }

        console.log('Search results:', results); // Debug log
        setSearchResults(results);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching search results:', error);
        setSearchResults([]);
        setLoading(false);
      }
    };

    fetchData();
  }, [location.search, user]);

  const handleEdit = (customer) => {
    navigate('/customers/phone/' + customer.phone_no, { state: { customer } });
  };

  const handleSelect = (C_unique_id) => {
    setSelectedRecords(prev => {
      const record = searchResults.find(r => r.C_unique_id === C_unique_id);
      if (!record) return prev;

      if (prev.some(r => r.C_unique_id === C_unique_id)) {
        return prev.filter(r => r.C_unique_id !== C_unique_id);
      } else {
        return [...prev, record];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedRecords.length === currentRecords.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(currentRecords);
    }
  };

  const handleAssignTeam = async () => {
    if (!selectedTeamUser || selectedRecords.length === 0) {
      alert('Please select both a user and at least one customer');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;

      // Debug logs
      console.log('Selected Team User:', selectedTeamUser);
      console.log('Selected Records:', selectedRecords);

      const response = await axios.post(
        `${apiUrl}/customers/assign-team`,
        {
          agent_id: parseInt(selectedTeamUser),
          customer_ids: selectedRecords.map(c => c.id)
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        alert('Customers assigned successfully');
        setSelectedRecords([]);
        setSelectedTeamUser('');

        // Refresh the search results
        const query = new URLSearchParams(location.search);
        const searchQuery = query.get('query');
        if (searchQuery) {
          const searchResponse = await axios.get(
            `${apiUrl}/customers/search?query=${searchQuery}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );

          // Handle different response formats
          let results = [];
          if (searchResponse.data) {
            if (Array.isArray(searchResponse.data)) {
              results = searchResponse.data;
            } else if (searchResponse.data.data && Array.isArray(searchResponse.data.data)) {
              results = searchResponse.data.data;
            } else if (typeof searchResponse.data === 'object') {
              results = [searchResponse.data];
            }
          }

          console.log('Updated search results:', results); // Debug log
          setSearchResults(results);
        }
      } else {
        alert(response.data.message || 'Failed to assign customers');
      }
    } catch (error) {
      console.error('Error assigning customers:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to assign customers';
      alert(errorMessage);
    }
  };

  const handleDeleteSelected = async () => {
    if (!canDeleteCustomers) {
      alert("You do not have permission to delete customers.");
      return;
    }

    if (selectedRecords.length === 0) {
      alert("Please select customers to delete.");
      return;
    }

    const confirmDelete = window.confirm(`Are you sure you want to delete ${selectedRecords.length} selected customers?`);
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      const customerIds = selectedRecords.map(c => c.id);

      // Check if current user needs approval before deleting
      const meResponse = await axios.get(`${apiUrl}/current-user`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const me = meResponse.data;
      const approvalRoles = ['team_leader', 'sub_dept_admin'];
      const needsApproval = approvalRoles.includes(me.role) && me.requires_delete_approval;

      if (needsApproval) {
        let sent = 0;
        for (const c of selectedRecords) {
          try {
            await axios.post(
              `${apiUrl}/customers/${c.id}/request-delete`,
              {},
              { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
            );
            sent++;
          } catch (e) {
            if (e.response?.status !== 409) console.error(`Failed to request delete for customer ${c.id}:`, e);
          }
        }
        setSelectedRecords([]);
        alert(`${sent} approval request(s) sent. You will be notified once reviewed.`);
        return;
      }

      // Direct delete — no approval needed
      await axios.post(`${apiUrl}/customers/delete-multiple`,
        { customerIds },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Remove deleted customers from state
      setSearchResults(prev => prev.filter(c => !customerIds.includes(c.id)));
      setSelectedRecords([]);

      // Show success alert
      alert(`Successfully deleted ${customerIds.length} records!`);
    } catch (error) {
      console.error('Error deleting customers:', error);
      if (error.response?.status === 403) {
        alert("You do not have permission to delete customers.");
        // Refresh user data to get latest permissions
        await fetchUserAndTeam();
      } else {
        alert("Failed to delete selected records");
      }
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

  const getCurrentPageRecords = () => {
    const results = Array.isArray(searchResults) ? searchResults : [];
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    return results.slice(indexOfFirstRecord, indexOfLastRecord);
  };

  const currentRecords = getCurrentPageRecords();

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="header-containerrr">
        <Link to="/customers">
          <img src="/uploads/house-fill.svg" alt="Home" className="home-icon" />
        </Link>
        <h2 className="list_form_headiii">Search Results</h2>
      </div>
      <div className="list-containerr">
        {searchResults.length > 0 ? (
          <table className="customers-table">
            <thead>
              <tr className="customer-row">
                {canAssignTeam && (
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedRecords.length === currentRecords.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                <th>S.no.</th>
                <th>Unique Id</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Lead Source</th>
                <th>Product</th>
                <th>Priority Level</th>
                <th>Conversion Status</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody className="customer-body">
              {currentRecords.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={(e) => {
                    if (e.target.type !== 'checkbox') {
                      handleEdit(customer);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {canAssignTeam && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedRecords.some(r => r.C_unique_id === customer.C_unique_id)}
                        onChange={() => handleSelect(customer.C_unique_id)}
                      />
                    </td>
                  )}
                  <td>{(currentPage - 1) * recordsPerPage + searchResults.indexOf(customer) + 1}</td>
                  <td>{customer.C_unique_id}</td>
                  <td className="customer-name">{customer.first_name} {customer.last_name}</td>
                  <td><a href={`tel:${customer.phone_no}`}>{customer.phone_no}</a></td>
                  <td>{customer.email_id}</td>
                  <td>{customer.lead_source}</td>
                  <td>{customer.product}</td>
                  <td>{customer.priority_level}</td>
                  <td>{customer.conversion_status}</td>
                  <td>{customer.last_updated ? new Date(customer.last_updated).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No results found.</p>
        )}
      </div>


      {/* Controls section */}
      {(canAssignTeam || canDeleteCustomers) && (
        <div className="team-assignment-controls" style={{ marginTop: '0.5rem' }}>
          {/* Show delete button if user has delete permission — independent of canAssignTeam */}
          {canDeleteCustomers && (
            <button
              onClick={handleDeleteSelected}
              className="delete-selected-btn"
              disabled={selectedRecords.length === 0}
            >
              Delete Selected
            </button>
          )}

          {/* Team assignment controls — only for roles that can assign teams */}
          {canAssignTeam && (
            <>
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
                disabled={!selectedTeamUser || selectedRecords.length === 0}
              >
                Assign to Selected User
              </button>
            </>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {searchResults.length > 0 && (
        <div className="pagination-containerr">
          <div className="paginationn">
            {currentPage > 1 && (
              <button
                onClick={() => paginate(currentPage - 1)}
                className="page-numberr"
                aria-label="Previous page"
              >
                Previous
              </button>
            )}

            {[...Array(Math.ceil(searchResults.length / recordsPerPage)).keys()].map((_, idx) => idx + 1)
              .filter((pageNumber) => {
                const totalPages = Math.ceil(searchResults.length / recordsPerPage);
                return (
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1
                );
              })
              .map((pageNumber, index, array) => {
                const isGap = array[index + 1] !== pageNumber + 1 && pageNumber !== Math.ceil(searchResults.length / recordsPerPage);
                return (
                  <React.Fragment key={pageNumber}>
                    <button
                      onClick={() => paginate(pageNumber)}
                      className={`page-numberr ${currentPage === pageNumber ? 'active' : ''}`}
                      aria-label={`Go to page ${pageNumber}`}
                    >
                      {pageNumber}
                    </button>
                    {isGap && <span className="ellipsiss">...</span>}
                  </React.Fragment>
                );
              })}

            {currentPage < Math.ceil(searchResults.length / recordsPerPage) && (
              <button
                onClick={() => paginate(currentPage + 1)}
                className="page-number"
                aria-label="Next page"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default SearchForm;
