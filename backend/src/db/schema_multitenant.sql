-- Multi-Tenant CRM Schema with Star Schema Architecture
-- This schema supports multiple companies with complete data isolation

CREATE DATABASE IF NOT EXISTS knowledgeBase_multitenant; 
USE knowledgeBase_multitenant;

-- ============================================================================
-- DIMENSION TABLES (Star Schema Core)
-- ============================================================================

-- 1. Companies/Tenants (Central Dimension)
CREATE TABLE IF NOT EXISTS companies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(200) NOT NULL UNIQUE,
    company_email VARCHAR(100) NOT NULL UNIQUE,
    license_limit INT NOT NULL DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    subscription_start DATE,
    subscription_end DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT, -- Super admin who created this company
    INDEX idx_company_active (is_active),
    INDEX idx_company_name (company_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Company Licenses (Track Usage)
CREATE TABLE IF NOT EXISTS company_licenses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    total_licenses INT NOT NULL,
    used_licenses INT DEFAULT 0,
    available_licenses INT GENERATED ALWAYS AS (total_licenses - used_licenses) STORED,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    INDEX idx_company_license (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Permissions
CREATE TABLE IF NOT EXISTS permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    permission_name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Roles
CREATE TABLE IF NOT EXISTS roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_name ENUM('super_admin', 'business_head', 'team_leader', 'user', 'mis') NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Teams (Company-specific)
CREATE TABLE IF NOT EXISTS teams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    team_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    UNIQUE KEY unique_team_per_company (company_id, team_name),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    INDEX idx_company_teams (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Users (Multi-tenant with company isolation)
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NULL, -- NULL for super_admin, NOT NULL for others
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    team_id INT NULL,
    role_id INT NOT NULL,
    is_company_admin BOOLEAN DEFAULT false, -- true for Business Head
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_username_per_company (company_id, username),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    INDEX idx_company_users (company_id),
    INDEX idx_user_role (role_id),
    INDEX idx_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key to teams after users table exists
ALTER TABLE teams
ADD CONSTRAINT fk_team_created_by FOREIGN KEY (created_by) REFERENCES users(id);

-- 7. User Permissions
CREATE TABLE IF NOT EXISTS user_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    permission_id INT NOT NULL,
    value BOOLEAN DEFAULT false,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_permission (user_id, permission_id),
    INDEX idx_user_perms (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- FACT TABLES (Star Schema - Business Data)
-- ============================================================================

-- 8. Customers (Lead Management - Company Isolated)
CREATE TABLE IF NOT EXISTS customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL, -- CRITICAL: Data isolation
    first_name VARCHAR(100) DEFAULT NULL,
    last_name VARCHAR(100) DEFAULT NULL,
    company_name VARCHAR(200) DEFAULT NULL,
    phone_no VARCHAR(50) DEFAULT NULL,
    email_id VARCHAR(50) DEFAULT NULL,
    address VARCHAR(300) DEFAULT NULL,
    lead_source ENUM('website','data','referral','ads') DEFAULT NULL,
    
    -- Call Information
    call_date_time DATETIME DEFAULT NULL,
    call_status ENUM('connected','not connected','follow_up') DEFAULT NULL,
    call_outcome ENUM('interested','not interested','call_later','wrong_number') DEFAULT NULL,
    call_recording VARCHAR(300) DEFAULT NULL,
    
    -- Lead Details
    product VARCHAR(200) DEFAULT NULL,
    budget VARCHAR(100) DEFAULT NULL,
    decision_making ENUM('yes','no') DEFAULT NULL,
    decision_time ENUM('immediate','1_week','1_month','future_investment') DEFAULT NULL,
    lead_stage ENUM('new','in_progress','qualified','converted','lost') DEFAULT NULL,
    
    -- Follow-up
    next_follow_up DATETIME DEFAULT NULL,
    assigned_agent VARCHAR(100) DEFAULT NULL,
    reminder_notes TEXT DEFAULT NULL,
    priority_level ENUM('low','medium','high') DEFAULT NULL,
    
    -- Classification
    customer_category ENUM('hot','warm','cold') DEFAULT NULL,
    tags_labels ENUM('premium_customer','repeat_customer','demo_required') DEFAULT NULL,
    communication_channel ENUM('call','whatsapp','email','sms') DEFAULT NULL,
    deal_value VARCHAR(30) DEFAULT NULL,
    conversion_status ENUM('lead','opportunity','customer') DEFAULT NULL,
    customer_history ENUM('previous calls','purchases','interactions') DEFAULT NULL,
    comment TEXT DEFAULT NULL,
    
    -- Metadata
    C_unique_id VARCHAR(20) DEFAULT NULL,
    scheduled_at DATETIME DEFAULT NULL,
    date_created TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    agent_name VARCHAR(100) DEFAULT NULL,
    
    UNIQUE KEY unique_customer_id_per_company (company_id, C_unique_id),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    INDEX idx_company_customers (company_id),
    INDEX idx_customer_agent (company_id, agent_name),
    INDEX idx_customer_phone (company_id, phone_no),
    INDEX idx_customer_stage (company_id, lead_stage),
    INDEX idx_customer_followup (company_id, next_follow_up)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Customer Updates History (Audit Trail)
CREATE TABLE IF NOT EXISTS updates_customer (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    customer_id INT NOT NULL,
    C_unique_id VARCHAR(20) NOT NULL,
    field VARCHAR(255) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    phone_no_primary VARCHAR(15) DEFAULT NULL,
    changed_by VARCHAR(100) NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_company_updates (company_id),
    INDEX idx_customer_updates (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Scheduler (Company-specific)
CREATE TABLE IF NOT EXISTS scheduler (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    customer_id INT NOT NULL,
    scheduled_at DATETIME NOT NULL,
    created_by INT NOT NULL,
    assigned_to VARCHAR(100) NOT NULL,
    description TEXT,
    status ENUM('pending','completed','cancelled') DEFAULT 'pending',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_company_schedule (company_id),
    INDEX idx_customer_schedule (customer_id),
    INDEX idx_schedule_status (company_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Login History (User Activity Tracking)
CREATE TABLE IF NOT EXISTS login_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    company_id INT NULL, -- NULL for super_admin
    device_id VARCHAR(255) NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    login_time TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    logout_time TIMESTAMP NULL DEFAULT NULL,
    last_activity TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    INDEX idx_user_login (user_id),
    INDEX idx_company_login (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default roles
INSERT INTO roles (role_name) VALUES 
('super_admin'),
('business_head'),
('team_leader'),
('user'),
('mis');

-- Insert default permissions
INSERT INTO permissions (permission_name, description) VALUES 
('upload_document', 'Upload customer data files'),
('download_data', 'Download customer data'),
('create_customer', 'Create new customer records'),
('edit_customer', 'Edit existing customer records'),
('delete_customer', 'Delete customer records'),
('view_customer', 'View all customers in company'),
('view_team_customers', 'View team customers only'),
('view_assigned_customers', 'View assigned customers only'),
('manage_users', 'Create and manage users'),
('manage_teams', 'Create and manage teams'),
('view_reports', 'View analytics and reports');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

DELIMITER //

-- Trigger: Auto-create scheduler entry when customer scheduled_at is updated
DROP TRIGGER IF EXISTS after_customers_scheduled_at_update//

CREATE TRIGGER after_customers_scheduled_at_update 
AFTER UPDATE ON customers 
FOR EACH ROW 
BEGIN
    DECLARE agent_id INT;
    DECLARE existing_id INT;
    
    IF NEW.scheduled_at IS NOT NULL AND 
       (OLD.scheduled_at IS NULL OR NEW.scheduled_at <> OLD.scheduled_at) THEN 
        
        -- Find the user ID for the agent_name
        SELECT id INTO agent_id 
        FROM users 
        WHERE username = NEW.agent_name 
          AND company_id = NEW.company_id 
        LIMIT 1;
        
        -- Fallback to company admin if agent not found
        IF agent_id IS NULL THEN
            SELECT id INTO agent_id 
            FROM users 
            WHERE company_id = NEW.company_id 
              AND is_company_admin = true 
            LIMIT 1;
        END IF;
        
        -- Check for existing pending scheduler entry
        SELECT id INTO existing_id 
        FROM scheduler 
        WHERE customer_id = NEW.id 
          AND company_id = NEW.company_id 
          AND status = 'pending' 
        LIMIT 1;
        
        IF existing_id IS NOT NULL THEN
            -- Update existing entry
            UPDATE scheduler SET
                scheduled_at = NEW.scheduled_at,
                updated_at = NOW()
            WHERE id = existing_id;
        ELSE
            -- Create new entry
            INSERT INTO scheduler (
                company_id,
                customer_id,
                scheduled_at,
                created_by,
                assigned_to,
                description,
                status
            ) VALUES (
                NEW.company_id,
                NEW.id,
                NEW.scheduled_at,
                agent_id,
                NEW.agent_name,
                CONCAT('Scheduled call with ', NEW.first_name, ' ', IFNULL(NEW.last_name, '')),
                'pending'
            );
        END IF;
    END IF;
END//

-- Trigger: Update license count when user is created
DROP TRIGGER IF EXISTS after_user_insert//

CREATE TRIGGER after_user_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    -- Only update license for non-super-admin users
    IF NEW.company_id IS NOT NULL THEN
        UPDATE company_licenses 
        SET used_licenses = used_licenses + 1 
        WHERE company_id = NEW.company_id;
    END IF;
END//

-- Trigger: Update license count when user is deleted
DROP TRIGGER IF EXISTS after_user_delete//

CREATE TRIGGER after_user_delete
AFTER DELETE ON users
FOR EACH ROW
BEGIN
    -- Only update license for non-super-admin users
    IF OLD.company_id IS NOT NULL THEN
        UPDATE company_licenses 
        SET used_licenses = used_licenses - 1 
        WHERE company_id = OLD.company_id;
    END IF;
END//

DELIMITER ;

-- ============================================================================
-- VIEWS (Optional - for easier querying)
-- ============================================================================

-- View: Company overview with license usage
CREATE OR REPLACE VIEW v_company_overview AS
SELECT 
    c.id,
    c.company_name,
    c.company_email,
    c.is_active,
    cl.total_licenses,
    cl.used_licenses,
    cl.available_licenses,
    (SELECT COUNT(*) FROM users WHERE company_id = c.id) as total_users,
    (SELECT COUNT(*) FROM customers WHERE company_id = c.id) as total_customers,
    c.created_at,
    c.subscription_start,
    c.subscription_end
FROM companies c
LEFT JOIN company_licenses cl ON c.id = cl.company_id;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. All customer data is isolated by company_id
-- 2. Super admin has company_id = NULL
-- 3. Business Head has is_company_admin = true
-- 4. License limits are enforced via triggers and application logic
-- 5. Star schema: companies (dimension) -> customers (fact)
-- 6. All queries MUST filter by company_id for data isolation
