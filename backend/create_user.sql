
-- Create Admin User
INSERT INTO users (username, email, password, role_id) 
VALUES ('admin', 'admin@example.com', '$2b$10$TOhHNSmHiehuTWvartgYaOitrzUTRL7kPIO39pQN0mMGO.q1Wgkvm', (SELECT id FROM roles WHERE role_name = 'super_admin'));

-- Get the ID of the newly created user
SET @user_id = LAST_INSERT_ID();

-- Assign all permissions to the user
INSERT INTO user_permissions (user_id, permission_id, value)
SELECT @user_id, id, 1 FROM permissions;
