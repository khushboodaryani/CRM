-- Check current state
USE knowledgeBase_multitenant;

-- Check companies
SELECT 'COMPANIES:' as info;
SELECT id, company_name, company_email FROM companies;

-- Check users
SELECT 'USERS:' as info;
SELECT u.id, u.username, u.email, u.company_id, r.role_name 
FROM users u 
LEFT JOIN roles r ON u.role_id = r.id
ORDER BY u.id;

-- If you have a company created, update the Business Head's company_id
-- Replace COMPANY_ID_HERE with the actual company ID from the first query
-- UPDATE users SET company_id = COMPANY_ID_HERE WHERE email = 'khushboodaryani1@gmail.com';
