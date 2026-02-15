# Quick Start Guide - Multi-Tenant CRM Testing

## Your Configuration

**Backend:** `http://localhost:8450`
**Frontend:** `http://localhost:4455`
**Database:** `knowledgeBase_multitenant`

---

## Step 1: Create Database & Schema

```bash
# Open MySQL
mysql -u root -p
# Password: Ayan@1012
```

```sql
-- Create database
CREATE DATABASE IF NOT EXISTS knowledgeBase_multitenant;
USE knowledgeBase_multitenant;

-- Run schema
source C:/Users/DELL/Desktop/crm/backend/src/db/schema_multitenant.sql;
```

---

## Step 2: Create Super Admin

### Option A: Use the generated SQL (Easiest)

I've generated the SQL for you. Run this in MySQL:

```bash
cd C:\Users\DELL\Desktop\crm\backend
node generate_super_admin_hash.js
```

Copy the INSERT statement from the output and run it in MySQL.

### Option B: Manual SQL

```sql
USE knowledgeBase_multitenant;

-- Ensure role exists
INSERT IGNORE INTO roles (role_name, description) 
VALUES ('super_admin', 'Super Administrator');

-- Create super admin (you'll get this from the hash generator)
-- INSERT INTO users (...) VALUES (...);
```

---

## Step 3: Restart Backend

The backend .env has been updated to use `knowledgeBase_multitenant`.

**Restart your backend:**
- Press `Ctrl+C` in the backend terminal
- Run: `npm run dev`

---

## Step 4: Test on Frontend

### 4.1 Login as Super Admin

1. Open: `http://localhost:4455/login`
2. Email: `superadmin@crm.com`
3. Password: `12345678`
4. Click Login

**Expected:** Redirect to `http://localhost:4455/super-admin/dashboard`

### 4.2 Create a Company

On the dashboard:

1. Click **"+ Create Company"**
2. Fill the form:
   - **Company Name:** `Test Corp`
   - **License Limit:** `5`
   - **BH Username:** `testbh`
   - **BH Email:** `testbh@testcorp.com`
   - **Subscription Start:** (optional) `2026-02-12`
   - **Subscription End:** (optional) `2027-02-12`
3. Click **"Create Company"**

**Expected:**
- ✅ Success message appears
- ✅ Company card shows in the list
- ✅ License bar shows: 0 / 5 used (5 available)

### 4.3 Login as Business Head

1. Logout from super admin
2. Go to: `http://localhost:4455/login`
3. Email: `testbh@testcorp.com`
4. Password: `12345678`
5. Click Login

**Expected:** Redirect to `http://localhost:4455/admin`

### 4.4 Create Users (Test License Limit)

In Admin Portal:
1. Create 5 users (user1@testcorp.com, user2@testcorp.com, etc.)
2. Try to create a 6th user

**Expected:**
- ✅ First 5 users created successfully
- ❌ 6th user fails with: "License limit reached"

### 4.5 Check License Usage

1. Logout, login as super admin again
2. Go to dashboard
3. Find "Test Corp" card

**Expected:**
- License bar is 100% full
- Shows: "5 / 5 used (0 available)"

---

## Troubleshooting

### Issue: "Cannot connect to database"
**Fix:** Make sure you created `knowledgeBase_multitenant` and ran the schema

### Issue: "Super admin login fails"
**Fix:** Check the user was created:
```sql
SELECT * FROM users WHERE email = 'superadmin@crm.com';
```

### Issue: "Dashboard not found (404)"
**Fix:** Make sure frontend is running on port 4455:
```bash
cd C:\Users\DELL\Desktop\crm\frontend
npm start
```

### Issue: "API calls failing"
**Fix:** Check backend is running on port 8450 and restart it after .env change

---

## Quick Verification Commands

```sql
-- Check super admin exists
SELECT username, email, company_id FROM users WHERE email = 'superadmin@crm.com';

-- Check companies
SELECT * FROM companies;

-- Check license usage
SELECT c.company_name, cl.total_licenses, cl.used_licenses, cl.available_licenses
FROM companies c
JOIN company_licenses cl ON c.id = cl.company_id;

-- Check all users in a company
SELECT u.username, u.email, r.role_name
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.company_id = 1;
```

---

## Success Checklist

- [ ] Database `knowledgeBase_multitenant` created
- [ ] Schema loaded successfully
- [ ] Super admin user created
- [ ] Backend restarted with new .env
- [ ] Super admin can login at `http://localhost:4455/login`
- [ ] Super admin redirected to `/super-admin/dashboard`
- [ ] Dashboard shows "Create Company" button
- [ ] Can create company successfully
- [ ] Company card appears with license info
- [ ] BH can login with generated credentials
- [ ] BH redirected to `/admin`
- [ ] Can create users up to license limit
- [ ] Creating beyond limit shows error
- [ ] License bar updates in real-time

**You're ready to test!** 🚀
