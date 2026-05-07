# Authentication System Testing Guide

## Overview
The school management system now has a complete authentication system that works with the multi-tenant SaaS architecture. Users created in the User Management system can log in with their assigned roles.

## How to Test the Authentication System

### Step 1: Access the Application
1. Open your browser and go to `http://localhost:3000`
2. You should be redirected to the school selection page (`/school-auth`)

### Step 2: Select or Create a School
1. If you have existing schools, select one from the list
2. If no schools exist, create a new school by filling out the form:
   - School Name: e.g., "Greenwood High School"
   - Address: e.g., "123 Education Street, Accra"
   - Phone: e.g., "+233 24 123 4567"
   - Email: e.g., "info@greenwood.edu"
3. Click "Create School" or "Select School"

### Step 3: Access User Management (Admin Required)
1. After selecting a school, you'll be redirected to `/login`
2. Use the default admin credentials:
   - **Email**: `principal@school.edu`
   - **Password**: `admin123`
3. You'll be redirected to `/admin` (admin dashboard)
4. Navigate to "User Management" from the sidebar

### Step 4: Create Test Users
Create users with different roles to test the system:

#### Sample Admin User
- **Name**: Dr. Sarah Johnson
- **Email**: admin@school.edu
- **Phone**: +233 24 111 1111
- **Role**: Admin
- **Class/Department**: Administration
- **Status**: Active
- **Password**: admin123

#### Sample Teacher User
- **Name**: Mr. John Mensah
- **Email**: teacher@school.edu
- **Phone**: +233 24 222 2222
- **Role**: Teacher
- **Class/Department**: Mathematics
- **Status**: Active
- **Password**: teacher123

#### Sample Student User
- **Name**: Ama Osei
- **Email**: student@school.edu
- **Phone**: +233 24 333 3333
- **Role**: Student
- **Class/Department**: Grade 10A
- **Status**: Active
- **Password**: student123

#### Sample Parent User
- **Name**: Mrs. Grace Osei
- **Email**: parent@school.edu
- **Phone**: +233 24 444 4444
- **Role**: Parent
- **Class/Department**: Parent of Ama Osei
- **Status**: Active
- **Password**: parent123

### Step 5: Test Login with Different Roles

#### Test Admin Login
1. Logout from current session (click user avatar → Sign Out)
2. Login with: `admin@school.edu` / `admin123`
3. **Expected**: Redirected to `/admin` with full admin navigation
4. **Verify**: Can access all admin features (User Management, Settings, etc.)

#### Test Teacher Login
1. Logout and login with: `teacher@school.edu` / `teacher123`
2. **Expected**: Redirected to `/dashboard` with teacher navigation
3. **Verify**: Can access teacher features (Attendance, Students, etc.) but NOT admin features

#### Test Student Login
1. Logout and login with: `student@school.edu` / `student123`
2. **Expected**: Redirected to `/dashboard` with student navigation
3. **Verify**: Can access student features (Academics, Dashboard) but NOT admin/teacher features

#### Test Parent Login
1. Logout and login with: `parent@school.edu` / `parent123`
2. **Expected**: Redirected to `/dashboard` with parent navigation
3. **Verify**: Can access parent features but NOT admin/teacher/student features

### Step 6: Test Account Status Restrictions

#### Test Inactive Account
1. As admin, go to User Management
2. Edit a user and change status to "Inactive"
3. Try to login with that user
4. **Expected**: Login should fail with "Account is inactive" message

#### Test Suspended Account
1. Change a user's status to "Suspended"
2. Try to login with that user
3. **Expected**: Login should fail with "Account is suspended" message

### Step 7: Test Multi-Tenant Isolation

#### Create Second School
1. Logout completely
2. Go to `/school-auth`
3. Create a second school (e.g., "Riverside Academy")
4. Create users in this new school

#### Test Data Isolation
1. Login to School A and create some users
2. Switch to School B (using school switcher in sidebar)
3. **Expected**: School B should have its own separate user list
4. **Verify**: Users from School A should NOT appear in School B

### Step 8: Test Session Management

#### Test Session Persistence
1. Login with any user
2. Refresh the page
3. **Expected**: Should remain logged in
4. **Verify**: User session info appears in sidebar

#### Test Route Protection
1. While logged in, try to access `/login`
2. **Expected**: Should redirect to appropriate dashboard
3. While logged out, try to access `/dashboard`
4. **Expected**: Should redirect to `/login`

#### Test Logout
1. Click user avatar in sidebar
2. Click "Sign Out"
3. **Expected**: Redirected to `/login`
4. **Verify**: Session cleared, cannot access protected routes

## Default Demo Credentials

The system comes with pre-populated demo users for testing:

### Admin Access
- **Email**: `principal@school.edu`
- **Password**: `admin123`
- **Access**: Full system control

### Teacher Access
- **Email**: `a.mensah@school.edu`
- **Password**: `password123`
- **Access**: Teacher features only

### Student Access
- **Email**: `ama@school.edu`
- **Password**: `password123`
- **Access**: Student features only

## Role-Based Navigation

Each role sees different navigation items:

### Admin Navigation
- Dashboard
- Students
- Staff
- Attendance
- Academics
- Finance
- Communication
- Analytics
- **Admin Section**:
  - Admin Dashboard
  - User Management
  - Settings
  - Reports
  - Resources
  - Alerts
  - Exams

### Teacher Navigation
- Dashboard
- Students
- Attendance
- Academics
- Communication
- Teacher Attendance

### Student Navigation
- Dashboard
- Academics
- Attendance

### Parent Navigation
- Dashboard
- Communication
- Analytics (Student Performance)

## Troubleshooting

### Login Issues
1. **"User not found"**: Check email spelling and ensure user exists in current school
2. **"Invalid password"**: Verify password is correct (case-sensitive)
3. **"Account is inactive"**: Contact admin to activate account
4. **Redirected to school selection**: No school selected, choose a school first

### Navigation Issues
1. **Missing menu items**: Check user role - some features are role-restricted
2. **Access denied**: User doesn't have permission for that feature
3. **Wrong dashboard**: Check if user role matches expected access level

### Data Issues
1. **No users showing**: Ensure you're in the correct school context
2. **Data not saving**: Check browser console for errors
3. **School switching not working**: Try refreshing the page after switching

## Security Features

### Password Requirements
- Passwords are stored in localStorage (demo only - use proper hashing in production)
- Minimum password requirements can be enforced in the form validation

### Session Security
- Sessions are stored in localStorage with school context
- Automatic logout on session expiry (can be implemented)
- Route protection prevents unauthorized access

### Multi-Tenant Security
- Complete data isolation between schools
- School-scoped localStorage keys prevent data leakage
- User authentication is school-specific

## Next Steps for Production

1. **Replace localStorage with proper database**
2. **Implement password hashing (bcrypt)**
3. **Add JWT tokens for session management**
4. **Implement proper session expiry**
5. **Add password reset functionality**
6. **Add email verification**
7. **Implement audit logging**
8. **Add rate limiting for login attempts**
9. **Add two-factor authentication**
10. **Implement proper error handling and logging**

## Testing Checklist

- [ ] Can create new schools
- [ ] Can select existing schools
- [ ] Can create users with all roles
- [ ] Admin can access all features
- [ ] Teacher can access teacher features only
- [ ] Student can access student features only
- [ ] Parent can access parent features only
- [ ] Inactive/suspended accounts cannot login
- [ ] School data is properly isolated
- [ ] Session persists across page refreshes
- [ ] Logout works properly
- [ ] Route protection works
- [ ] School switching works
- [ ] User session displays correctly in sidebar
- [ ] Navigation is role-appropriate
- [ ] Password validation works
- [ ] Email validation prevents duplicates

The authentication system is now fully functional and ready for testing!