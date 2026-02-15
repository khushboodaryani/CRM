-- MULTI-TENANT DATA ISOLATION VERIFICATION SCRIPT
-- This script verifies that company-based data isolation is working correctly

USE knowledgeBase_multitenant;

-- ============================================
-- 1. VERIFY SCHEMA: Check company_id columns exist
-- ============================================
SELECT 
    'Schema Verification' as test_category,
    'companies table' as test_name,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM information_schema.TABLES 
WHERE table_schema = 'knowledgeBase_multitenant' 
AND table_name = 'companies';

SELECT 
    'Schema Verification' as test_category,
    'customers.company_id column' as test_name,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM information_schema.COLUMNS 
WHERE table_schema = 'knowledgeBase_multitenant' 
AND table_name = 'customers' 
AND column_name = 'company_id';

SELECT 
    'Schema Verification' as test_category,
    'users.company_id column' as test_name,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM information_schema.COLUMNS 
WHERE table_schema = 'knowledgeBase_multitenant' 
AND table_name = 'users' 
AND column_name = 'company_id';

SELECT 
    'Schema Verification' as test_category,
    'teams.company_id column' as test_name,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM information_schema.COLUMNS 
WHERE table_schema = 'knowledgeBase_multitenant' 
AND table_name = 'teams' 
AND column_name = 'company_id';

-- ============================================
-- 2. DATA DISTRIBUTION: Check data across companies
-- ============================================
SELECT 
    'Data Distribution' as test_category,
    'Companies count' as metric,
    COUNT(*) as value
FROM companies;

SELECT 
    'Data Distribution' as test_category,
    CONCAT('Company: ', c.company_name) as metric,
    COUNT(u.id) as user_count,
    COUNT(DISTINCT t.id) as team_count,
    COUNT(DISTINCT cu.id) as customer_count
FROM companies c
LEFT JOIN users u ON c.id = u.company_id
LEFT JOIN teams t ON c.id = t.company_id
LEFT JOIN customers cu ON c.id = cu.company_id
GROUP BY c.id, c.company_name
ORDER BY c.id;

-- ============================================
-- 3. DATA INTEGRITY: Check for orphaned records
-- ============================================
SELECT 
    'Data Integrity' as test_category,
    'Customers without company_id' as test_name,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM customers 
WHERE company_id IS NULL;

SELECT 
    'Data Integrity' as test_category,
    'Users without company_id (excluding super_admin)' as test_name,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM users 
WHERE company_id IS NULL 
AND role != 'super_admin';

SELECT 
    'Data Integrity' as test_category,
    'Teams without company_id' as test_name,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM teams 
WHERE company_id IS NULL;

-- ============================================
-- 4. FOREIGN KEY CONSTRAINTS: Verify relationships
-- ============================================
SELECT 
    'Foreign Keys' as test_category,
    CONSTRAINT_NAME as constraint_name,
    TABLE_NAME as table_name,
    REFERENCED_TABLE_NAME as references
FROM information_schema.KEY_COLUMN_USAGE
WHERE table_schema = 'knowledgeBase_multitenant'
AND REFERENCED_TABLE_NAME = 'companies'
ORDER BY TABLE_NAME;

-- ============================================
-- 5. INDEXES: Verify company_id indexes exist
-- ============================================
SELECT 
    'Indexes' as test_category,
    TABLE_NAME as table_name,
    INDEX_NAME as index_name,
    COLUMN_NAME as column_name
FROM information_schema.STATISTICS
WHERE table_schema = 'knowledgeBase_multitenant'
AND COLUMN_NAME = 'company_id'
ORDER BY TABLE_NAME;

-- ============================================
-- 6. BUSINESS HEAD ACCESS: Verify isolation
-- ============================================
-- This shows what each business head should see
SELECT 
    'Business Head Access' as test_category,
    u.username as business_head,
    c.company_name as company,
    COUNT(DISTINCT cu.id) as accessible_customers,
    COUNT(DISTINCT t.id) as accessible_teams,
    COUNT(DISTINCT u2.id) as accessible_users
FROM users u
JOIN companies c ON u.company_id = c.id
LEFT JOIN customers cu ON cu.company_id = u.company_id
LEFT JOIN teams t ON t.company_id = u.company_id
LEFT JOIN users u2 ON u2.company_id = u.company_id
WHERE u.role = 'business_head'
GROUP BY u.id, u.username, c.company_name;

-- ============================================
-- 7. CROSS-COMPANY LEAK TEST
-- ============================================
-- This checks if any customers from Company A are visible to Company B
SELECT 
    'Security Test' as test_category,
    'Cross-company customer leak' as test_name,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS - No leaks detected'
        ELSE CONCAT('FAIL - ', COUNT(*), ' potential leaks found')
    END as status
FROM (
    SELECT cu.id, cu.company_id as customer_company, u.company_id as user_company
    FROM customers cu
    CROSS JOIN users u
    WHERE u.role = 'business_head'
    AND cu.company_id != u.company_id
    LIMIT 1
) as leak_check;

-- ============================================
-- 8. SUMMARY REPORT
-- ============================================
SELECT 
    '=== MULTI-TENANT ISOLATION SUMMARY ===' as report;

SELECT 
    c.company_name as Company,
    COUNT(DISTINCT u.id) as Users,
    COUNT(DISTINCT t.id) as Teams,
    COUNT(DISTINCT cu.id) as Customers,
    COUNT(DISTINCT CASE WHEN u.role = 'business_head' THEN u.id END) as Business_Heads,
    COUNT(DISTINCT CASE WHEN u.role = 'team_leader' THEN u.id END) as Team_Leaders
FROM companies c
LEFT JOIN users u ON c.id = u.company_id
LEFT JOIN teams t ON c.id = t.company_id
LEFT JOIN customers cu ON c.id = cu.company_id
GROUP BY c.id, c.company_name
ORDER BY c.id;
