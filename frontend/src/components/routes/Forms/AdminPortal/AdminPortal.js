// src/components/routes/Forms/AdminPortal/AdminPortal.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AdminPortal.css';

const AdminPortal = () => {
    const isLoggedIn = !!localStorage.getItem("token");
    const navigate = useNavigate(); // Add navigation hook
    const [teams, setTeams] = useState([]);
    const [newTeams, setNewTeams] = useState(['']);
    const [users, setUsers] = useState([]);

    // Define default permissions by role
    const getDefaultPermissions = (role) => {
        const permissions = {
            create_customer: ['super_admin', 'it_admin', 'business_head'].includes(role),
            edit_customer: ['super_admin', 'it_admin', 'business_head'].includes(role),
            delete_customer: ['super_admin', 'it_admin', 'business_head'].includes(role),
            view_customer: ['super_admin', 'it_admin', 'business_head'].includes(role),
            view_team_customers: ['super_admin', 'it_admin', 'business_head', 'team_leader'].includes(role),
            view_assigned_customers: true, // All roles can view their own data
            upload_document: ['super_admin', 'it_admin', 'business_head', 'team_leader', 'mis'].includes(role),
            download_data: ['super_admin', 'it_admin', 'business_head', 'team_leader', 'mis'].includes(role)
        };

        // For business_head, ensure all view permissions are true
        if (role === 'business_head') {
            permissions.view_customer = true;
            permissions.view_team_customers = true;
            permissions.view_assigned_customers = true;
        }

        // For MIS role, only allow upload and download
        if (role === 'mis') {
            Object.keys(permissions).forEach(key => {
                permissions[key] = key === 'upload_document' || key === 'download_data';
            });
        }

        return permissions;
    };

    const [newUser, setNewUser] = useState({
        username: '',
        email: '',
        team: '',
        role: 'user',
        permissions: getDefaultPermissions('user'),
        isEditing: false,
        editingUserId: null
    });

    // Permission display names mapping
    const permissionDisplayNames = {
        create_customer: 'Create Record',
        edit_customer: 'Edit Record',
        delete_customer: 'Delete Data',
        view_customer: 'View All Data',
        view_team_customers: 'View Team Data',
        view_assigned_customers: 'View Own Data',
        upload_document: 'Upload Document',
        download_data: 'Download Data'
    };
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (error) {
            alert(error);
            setError(null);
        }
        if (success) {
            alert(success);
            setSuccess(null);
        }
    }, [error, success]);

    // Fetch teams on component mount
    useEffect(() => {
        fetchTeams();
        fetchUsers();
    }, []);

    const fetchTeams = async () => {
        try {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.REACT_APP_API_URL;
            const response = await axios.get(`${apiUrl}/players/teams`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            setTeams(response.data);
        } catch (err) {
            setError('Failed to fetch teams');
        }
    };

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.REACT_APP_API_URL;
            const response = await axios.get(`${apiUrl}/players/users`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            setUsers(response.data.data || []); // Access the data property and provide a fallback empty array
        } catch (err) {
            setError('Failed to fetch users');
            setUsers([]); // Set empty array on error
        }
    };

    const handleTeamInputChange = (index, value) => {
        const updatedTeams = [...newTeams];
        updatedTeams[index] = value;
        setNewTeams(updatedTeams);
    };

    const handleCreateTeams = async () => {
        const validTeams = newTeams.filter(team => team.trim() !== '');
        try {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.REACT_APP_API_URL;
            for (const teamName of validTeams) {
                await axios.post(`${apiUrl}/players/teams`,
                    { team_name: teamName },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }
            setSuccess('Team created successfully');
            setNewTeams(['']);
            fetchTeams();
        } catch (err) {
            setError('Failed to create team');
        }
    };

    const handleUserInputChange = (field, value) => {
        setNewUser(prev => {
            // For permission changes
            if (field.startsWith('permission_')) {
                const permissionName = field.replace('permission_', '');
                return {
                    ...prev,
                    permissions: {
                        ...prev.permissions,
                        [permissionName]: value
                    }
                };
            }

            // For role changes, set default permissions based on role
            if (field === 'role') {
                const defaultPermissions = getDefaultPermissions(value);

                return {
                    ...prev,
                    [field]: value,
                    team: value === 'business_head' ? '' : prev.team,
                    permissions: defaultPermissions
                };
            }

            // For other field changes
            return {
                ...prev,
                [field]: value
            };
        });
    };

    const handleCreateUser = async () => {
        try {
            // Validate required fields
            if (!newUser.username.trim()) {
                setError('Username is required');
                return;
            }
            if (!newUser.email.trim()) {
                setError('Email is required');
                return;
            }
            // Only validate team_id if role is not business_head
            if (newUser.role !== 'business_head' && newUser.role !== 'mis' && !newUser.team) {
                setError('Team selection is required for users and team leaders');
                return;
            }

            const token = localStorage.getItem('token');
            const apiUrl = process.env.REACT_APP_API_URL;

            // Format user data for backend
            const userData = {
                username: newUser.username.trim(),
                email: newUser.email.trim(),
                team_id: (newUser.role === 'business_head' || newUser.role === 'mis') ? null : newUser.team, // Set team_id as null for business_head and mis
                role_type: newUser.role,
                permissions: newUser.permissions
            };

            const response = await axios.post(`${apiUrl}/users/create`,
                userData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            );
            setSuccess(response.data.message);
            setNewUser({
                username: '',
                email: '',
                team: '',
                role: 'user',
                permissions: getDefaultPermissions('user')
            });
            fetchUsers();
        } catch (err) {
            console.error('Error creating user:', err.response?.data || err);
            setError(err.response?.data?.error || 'Failed to create user');
        }
    };


    // Handle edit user - populate form with user data
    const handleEditUser = (user) => {
        console.log('=== EDIT USER CLICKED ===');
        console.log('User data:', user);
        console.log('User permissions:', user.permissions);

        setNewUser({
            username: user.username,
            email: user.email,
            team: user.team_id || '',
            role: user.role,
            permissions: user.permissions ? user.permissions.reduce((acc, perm) => ({ ...acc, [perm]: true }), getDefaultPermissions(user.role)) : getDefaultPermissions(user.role),
            isEditing: true,
            editingUserId: user.id
        });

        console.log('Form state updated, scrolling to top');
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };


    // Handle update user
    const handleUpdateUser = async () => {
        console.log('=== UPDATE USER CLICKED ===');
        console.log('Current newUser state:', newUser);
        console.log('Editing user ID:', newUser.editingUserId);

        try {
            if (!newUser.username.trim()) {
                console.log('Validation failed: Username required');
                setError('Username is required');
                return;
            }
            if (!newUser.email.trim()) {
                console.log('Validation failed: Email required');
                setError('Email is required');
                return;
            }
            if (newUser.role !== 'business_head' && newUser.role !== 'mis' && !newUser.team) {
                console.log('Validation failed: Team required for role:', newUser.role);
                setError('Team selection is required for users and team leaders');
                return;
            }

            const token = localStorage.getItem('token');
            const apiUrl = process.env.REACT_APP_API_URL;

            const userData = {
                username: newUser.username.trim(),
                email: newUser.email.trim(),
                team_id: (newUser.role === 'business_head' || newUser.role === 'mis') ? null : newUser.team,
                role_type: newUser.role,
                permissions: newUser.permissions
            };

            console.log('Validation passed, preparing API call');
            console.log('User data to send:', userData);

            const response = await axios.put(
                `${apiUrl}/players/users/${newUser.editingUserId}`,
                userData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('Update response:', response.data);
            setSuccess('User updated successfully');
            setNewUser({
                username: '',
                email: '',
                team: '',
                role: 'user',
                permissions: getDefaultPermissions('user'),
                isEditing: false,
                editingUserId: null
            });
            fetchUsers();
        } catch (err) {
            console.error('Error updating user:', err);
            console.error('Error response:', err.response?.data);
            setError(err.response?.data?.error || err.response?.data?.details || 'Failed to update user');
        }
    };

    // Handle delete user
    const handleDeleteUser = async (userId, username) => {
        if (!window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.REACT_APP_API_URL;

            await axios.delete(
                `${apiUrl}/players/users/${userId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            setSuccess('User deleted successfully');
            fetchUsers();
        } catch (err) {
            console.error('Error deleting user:', err);
            setError(err.response?.data?.error || 'Failed to delete user');
        }
    };

    // Cancel editing
    const handleCancelEdit = () => {
        setNewUser({
            username: '',
            email: '',
            team: '',
            role: 'user',
            permissions: getDefaultPermissions('user'),
            isEditing: false,
            editingUserId: null
        });
    };


    return (
        <div className="admin-portal-container">
            <div className="admin-portal">
                <div className="portal-header">
                    <h2 className='admin-portal-heading'>Business Head Portal</h2>
                    <button onClick={() => navigate('/form-creation')} className="add-form-btn">Add Form</button>
                </div>

                <div className="sectionnn">
                    <h3 className='create-team-heading'>Create Team</h3>
                    <div className='team-inputsss'>
                        {newTeams.map((team, index) => (
                            <div key={index} className="team-inputt">
                                <input
                                    type="text"
                                    value={team}
                                    onChange={(e) => handleTeamInputChange(index, e.target.value)}
                                    placeholder="Enter team name"
                                />
                                {/* {index === newTeams.length - 1 && (
                                <button onClick={addTeamInput} className="add-button">+</button>
                            )} */}
                            </div>
                        ))}
                        <button onClick={handleCreateTeams} className="create-button">Create Team</button>
                    </div>
                </div>

                <div className="sectionn">
                    <h3 className='create-user-heading'>Create User</h3>
                    <div className="user-formm">
                        <div className="user-inputs">
                            <input
                                type="text"
                                value={newUser.username}
                                onChange={(e) => handleUserInputChange('username', e.target.value)}
                                placeholder="Username"
                            />
                            <input
                                type="email"
                                value={newUser.email}
                                onChange={(e) => handleUserInputChange('email', e.target.value)}
                                placeholder="Email"
                            />

                            <select
                                value={newUser.role}
                                onChange={(e) => handleUserInputChange('role', e.target.value)}
                            >
                                <option value="">Select Role</option>
                                <option value="user">User</option>
                                <option value="team_leader">Team Leader</option>
                                {/* Only Super Admin can create Business Head */}
                                {localStorage.getItem('user') && JSON.parse(localStorage.getItem('user')).role === 'super_admin' && (
                                    <option value="business_head">Business Head</option>
                                )}
                                <option value="mis">MIS</option>
                            </select>
                            {newUser.role !== 'business_head' && newUser.role !== 'mis' && (
                                <select
                                    value={newUser.team}
                                    onChange={(e) => handleUserInputChange('team', e.target.value)}
                                >
                                    <option value="">Select Team</option>
                                    {teams.map(team => (
                                        <option key={team.id} value={team.id}>{team.team_name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="permissions-section">
                            <h4 className='permissions-heading'>Permissions</h4>
                            <div className="permissions-grid">
                                {Object.entries(newUser.permissions).map(([key, value]) => (
                                    <div key={key} className="permission-item">
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={value}
                                                onChange={(e) => handleUserInputChange(`permission_${key}`, e.target.checked)}
                                                className="mr-2"
                                            />
                                            {permissionDisplayNames[key]}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="form-buttons">
                            {newUser.isEditing ? (
                                <>
                                    <button onClick={handleUpdateUser} className="create-button">Update User</button>
                                    <button onClick={handleCancelEdit} className="cancel-button">Cancel</button>
                                </>
                            ) : (
                                <button onClick={handleCreateUser} className="create-button">Create User</button>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            <div className="section">
                <h3 className='existing-user-heading'>Existing Users</h3>
                <div className="users-list">
                    {/* Group users by team */}
                    {teams.map(team => {
                        // Filter users for this team, excluding super_admin
                        const teamUsers = users.filter(user =>
                            user.team_id === team.id &&
                            user.role !== 'super_admin' // Exclude super_admin users
                        );
                        // Sort users by role (team_leader first, then users)
                        const sortedTeamUsers = teamUsers.sort((a, b) => {
                            if (a.role === 'team_leader') return -1;
                            if (b.role === 'team_leader') return 1;
                            return 0;
                        });

                        // Only show team section if there are users
                        if (teamUsers.length === 0) return null;

                        return (
                            <div key={team.id} className="team-section">
                                <h4 className="team-name">{team.team_name}</h4>
                                <div className="user-row header">
                                    <div className="user-col">Name</div>
                                    <div className="user-col">Email</div>
                                    <div className="user-col">Role</div>
                                    <div className="user-col">Actions</div>
                                </div>
                                {sortedTeamUsers.map(user => (
                                    <div key={user.id} className={`user-row ${user.role === 'team_leader' ? 'team-leader-section' : 'user-section'}`}>
                                        <div className="user-col">{user.username}</div>
                                        <div className="user-col">{user.email}</div>
                                        <div className={`user-col role-${user.role}`}>{user.role}</div>
                                        <div className="user-col user-actions">
                                            <button onClick={() => handleEditUser(user)} className="edit-btn" title="Edit User">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                            </button>
                                            <button onClick={() => handleDeleteUser(user.id, user.username)} className="delete-btn" title="Delete User">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                    <line x1="10" y1="11" x2="10" y2="17" />
                                                    <line x1="14" y1="11" x2="14" y2="17" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}

                    {/* Show users without team (like business_head) separately, excluding super_admin */}
                    {users.filter(user => !user.team_id && user.role !== 'super_admin').length > 0 && (
                        <div className="team-section business-head-section">
                            <h4 className="team-name">BUSINESS HEAD</h4>
                            <div className="user-row header">
                                <div className="user-col">Name</div>
                                <div className="user-col">Email</div>
                                <div className="user-col">Role</div>
                                <div className="user-col">Actions</div>
                            </div>
                            {users.filter(user => !user.team_id && user.role !== 'super_admin').map(user => (
                                <div key={user.id} className="user-row">
                                    <div className="user-col">{user.username}</div>
                                    <div className="user-col">{user.email}</div>
                                    <div className={`user-col role-${user.role}`}>{user.role}</div>
                                    <div className="user-col user-actions">
                                        <button onClick={() => handleEditUser(user)} className="edit-btn" title="Edit User">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                        </button>
                                        <button onClick={() => handleDeleteUser(user.id, user.username)} className="delete-btn" title="Delete User">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                <line x1="10" y1="11" x2="10" y2="17" />
                                                <line x1="14" y1="11" x2="14" y2="17" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminPortal;
