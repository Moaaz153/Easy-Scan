# Testing Guide - Smart Invoice Scanner

## 🚀 Application Status

### Frontend
- ✅ **Running on**: http://localhost:3000
- Status: Active and ready

### Backend
- ⚠️ **Should be on**: http://localhost:8000
- If not running, start it manually (see below)

## 🧪 Testing Checklist

### 1. Test User Registration
**URL**: http://localhost:3000/signup

**Steps**:
1. Open http://localhost:3000/signup
2. Fill in:
   - Full Name: `Test User`
   - Email: `test@example.com`
   - Password: `test123` (min 6 characters)
   - Confirm Password: `test123`
   - Check "I agree to terms"
3. Click "Create Account"
4. **Expected**: Redirects to login page with success message

**Test Cases**:
- ✅ Valid registration
- ✅ Email already exists (should show error)
- ✅ Password mismatch (should show error)
- ✅ Weak password < 6 chars (should show error)
- ✅ Missing fields (should show error)

### 2. Test User Login
**URL**: http://localhost:3000/login

**Steps**:
1. Open http://localhost:3000/login
2. Enter credentials from step 1:
   - Email: `test@example.com`
   - Password: `test123`
3. Click "Sign In"
4. **Expected**: 
   - Redirects to dashboard (/)
   - Navbar shows user's name
   - Success toast notification

**Test Cases**:
- ✅ Valid login
- ✅ Wrong password (should show error)
- ✅ Wrong email (should show error)
- ✅ Empty fields (should show error)

### 3. Test Route Protection
**Test Protected Routes** (should redirect to login if not authenticated):
- http://localhost:3000/ (Dashboard)
- http://localhost:3000/upload-invoice
- http://localhost:3000/invoices
- http://localhost:3000/invoice-detailes?id=any-id

**Steps**:
1. Logout (click logout button)
2. Try to access any protected route directly
3. **Expected**: Automatically redirects to /login

**Test Public Routes** (should redirect to dashboard if authenticated):
- http://localhost:3000/login
- http://localhost:3000/signup

**Steps**:
1. While logged in, try to access /login or /signup
2. **Expected**: Automatically redirects to / (dashboard)

### 4. Test Invoice Upload & OCR
**URL**: http://localhost:3000/upload-invoice

**Steps**:
1. Login first
2. Go to Upload Invoice page
3. Upload an invoice image (JPG, PNG)
4. **Expected**:
   - Loading spinner appears
   - OCR processing happens
   - Extracted data displayed:
     - Vendor name
     - Invoice number
     - Date
     - Total amount
     - Line items (if detected)
5. Click "Save Invoice"
6. **Expected**: 
   - Success message
   - Redirects to invoice details page

**Test Cases**:
- ✅ Valid image upload
- ✅ File too large > 10MB (should show error)
- ✅ Invalid file type (should show error)
- ✅ Save invoice with extracted data

### 5. Test Invoice List
**URL**: http://localhost:3000/invoices

**Steps**:
1. Go to Invoices page
2. **Expected**:
   - See list of your invoices
   - Stats cards show:
     - Total Invoices
     - Processed count
     - Pending Review count
     - Errors count
3. Test search functionality
4. Test status filter
5. Click on an invoice
6. **Expected**: Opens invoice details page

**Test Cases**:
- ✅ View invoice list
- ✅ Search invoices
- ✅ Filter by status
- ✅ Delete invoice (click trash icon)
- ✅ Navigate to invoice details

### 6. Test Invoice Details
**URL**: http://localhost:3000/invoice-detailes?id={invoice-id}

**Steps**:
1. Click on an invoice from the list
2. **Expected**:
   - Invoice information displayed
   - Vendor information
   - Line items table
   - Totals section
3. Edit any field
4. Click "Save"
5. **Expected**: Success message, data updated

**Test Cases**:
- ✅ View invoice details
- ✅ Edit invoice fields
- ✅ Add line item
- ✅ Remove line item
- ✅ Update totals
- ✅ Save changes

### 7. Test User Data Isolation
**Steps**:
1. Create Account A: `userA@test.com`
2. Login as User A
3. Upload/create 2-3 invoices
4. Logout
5. Create Account B: `userB@test.com`
6. Login as User B
7. Go to Invoices page
8. **Expected**: 
   - Should see 0 invoices (or only User B's invoices)
   - Should NOT see User A's invoices

**Test Cases**:
- ✅ Users can only see their own invoices
- ✅ Users cannot access other users' invoice details
- ✅ Users cannot delete other users' invoices

### 8. Test Navbar
**Steps**:
1. Login
2. Check navbar:
   - **Expected**: Shows user's full name
   - **Expected**: Shows logout button
3. Click logout
4. **Expected**: 
   - Redirects to login
   - Tokens cleared
   - Cannot access protected routes

**Test Cases**:
- ✅ User name displayed
- ✅ Logout functionality
- ✅ Navbar hidden on login/signup pages

### 9. Test Dashboard
**URL**: http://localhost:3000/

**Steps**:
1. Login
2. Go to dashboard
3. **Expected**:
   - Welcome message with user's name
   - Stats cards
   - Charts (if data available)
   - Recent activity

**Test Cases**:
- ✅ Dashboard loads
- ✅ User-specific data displayed
- ✅ Navigation links work

### 10. Test API Endpoints (Optional)
**Backend API**: http://localhost:8000/docs

**Test with curl or Postman**:

```bash
# Signup
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"full_name":"API Test","email":"api@test.com","password":"test123"}'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"api@test.com","password":"test123"}'

# Get current user (requires token from login)
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get invoices (requires token)
curl -X GET http://localhost:8000/api/invoices \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🐛 Common Issues & Solutions

### Backend Not Starting
**Problem**: Backend not accessible on port 8000

**Solutions**:
1. Check if Python virtual environment is activated
2. Verify dependencies installed: `pip install -r requirements.txt`
3. Check database connection in `.env` file
4. Run: `python backend/init_db.py` to create tables
5. Check for port conflicts: `netstat -ano | findstr :8000`

### Frontend Not Connecting to Backend
**Problem**: Frontend shows connection errors

**Solutions**:
1. Verify backend is running on port 8000
2. Check `.env.local` has: `NEXT_PUBLIC_API_URL=http://localhost:8000`
3. Check browser console for CORS errors
4. Restart both servers

### Authentication Errors
**Problem**: Login fails or tokens invalid

**Solutions**:
1. Check SECRET_KEY in backend `.env` file
2. Clear browser localStorage
3. Try creating a new account
4. Check backend logs for errors

### Database Errors
**Problem**: Database connection or table errors

**Solutions**:
1. Verify PostgreSQL is running
2. Check DATABASE_URL in `.env`
3. Run: `python backend/init_db.py`
4. Verify database `invoice_scanner` exists

## ✅ Success Criteria

All tests pass if:
- ✅ Can create account
- ✅ Can login
- ✅ Can upload invoice
- ✅ Can view invoices
- ✅ Can edit invoice
- ✅ Can delete invoice
- ✅ Users see only their data
- ✅ Protected routes work
- ✅ Logout works
- ✅ Navbar shows user info

## 📝 Test Results Template

```
Date: ___________
Tester: ___________

Registration: [ ] Pass [ ] Fail
Login: [ ] Pass [ ] Fail
Route Protection: [ ] Pass [ ] Fail
Invoice Upload: [ ] Pass [ ] Fail
Invoice List: [ ] Pass [ ] Fail
Invoice Details: [ ] Pass [ ] Fail
User Isolation: [ ] Pass [ ] Fail
Navbar: [ ] Pass [ ] Fail
Dashboard: [ ] Pass [ ] Fail

Notes:
_______________________________________
_______________________________________
```

Happy Testing! 🎉

