
import bcrypt from 'bcrypt';
import fs from 'fs';

const hash = bcrypt.hashSync('12345678', 10);
const sql = `
-- Create Admin User
INSERT INTO users (username, email, password, role_id) 
VALUES ('admin', 'admin@example.com', '${hash}', (SELECT id FROM roles WHERE role_name = 'super_admin'));

-- Get the ID of the newly created user
SET @user_id = LAST_INSERT_ID();

-- Assign all permissions to the user
INSERT INTO user_permissions (user_id, permission_id, value)
SELECT @user_id, id, 1 FROM permissions;
`;

fs.writeFileSync('create_user.sql', sql);
console.log("SQL file created");
