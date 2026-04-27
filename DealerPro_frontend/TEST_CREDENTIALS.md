# DealerPro Test Credentials

## Test User Accounts

Use these credentials to test the DealerPro system with different role permissions.

### 🔴 ADMIN Account
**Full system access - Can manage users, dealers, and all system settings**

- **User ID**: `admin`
- **Email**: `admin@dealerpro.com`
- **Password**: `Admin@123`
- **Role**: ADMIN
- **Permissions**:
  - ✅ Full access to all modules
  - ✅ User management
  - ✅ Dealer management
  - ✅ System settings
  - ✅ Finance module access
  - ✅ Delete operations
  - ✅ Analytics and reports

---

### 🟡 MANAGER Account
**Management access - Can view finance but cannot delete records**

- **User ID**: `manager`
- **Email**: `manager@dealerpro.com`
- **Password**: `Manager@123`
- **Role**: MANAGER
- **Permissions**:
  - ✅ Access to all operational modules
  - ✅ Finance module access
  - ✅ Analytics and reports
  - ❌ Cannot delete records
  - ❌ Cannot access admin panel
  - ❌ Cannot manage users/dealers

---

### 🟢 DEALER Account
**Basic access - Limited to own dealership data**

- **User ID**: `dealer`
- **Email**: `dealer@dealerpro.com`
- **Password**: `Dealer@123`
- **Role**: DEALER
- **Permissions**:
  - ✅ Inventory management
  - ✅ Sales and orders
  - ✅ Leads and test drives
  - ✅ Service appointments
  - ✅ Parts management
  - ❌ Cannot delete records
  - ❌ Cannot access finance module
  - ❌ Cannot access admin panel
  - ❌ Limited to own dealership data only

---

## Quick Login Guide

1. **Navigate to**: `http://localhost:5173/` (or your deployment URL)
2. **Landing Page**: Dashboard (requires login if not authenticated)
3. **Login Page**: `http://localhost:5173/login`
4. **Select Role Tab**: Choose Dealer, Manager, or Admin
5. **Enter Credentials**: Use the User ID and Password from above
6. **Click Continue**: You'll be redirected to the Dashboard

---

## Testing Different Roles

### Test as ADMIN:
1. Login with admin credentials
2. Navigate to Settings → Admin Panel
3. Try creating/editing/deleting users
4. Access Finance module
5. View all analytics

### Test as MANAGER:
1. Login with manager credentials
2. Access Finance module (should work)
3. Try to delete a record (should be disabled)
4. Try to access Admin Panel (should show access denied)

### Test as DEALER:
1. Login with dealer credentials
2. Access Inventory, Sales, Leads, Service, Parts
3. Try to access Finance module (should show access denied)
4. Try to delete a record (should be disabled)
5. Try to access Admin Panel (should show access denied)

---

## Password Requirements

All passwords must meet these requirements:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (@, #, $, etc.)

---

## Notes

- These are **test credentials** for development/demo purposes only
- In production, use proper authentication with secure password hashing
- The system uses JWT tokens stored in localStorage
- Session expires after 30 minutes of inactivity
- Role-based access control is enforced at both route and component levels

---

## Troubleshooting

**Can't login?**
- Make sure the backend API is running
- Check that the API URL is correctly configured in `.env.development`
- Verify the credentials are typed correctly (case-sensitive)

**Redirected to login immediately?**
- Token may have expired
- Clear localStorage and try again
- Check browser console for errors

**Access denied errors?**
- You're trying to access a feature not available for your role
- Login with a higher privilege account (Manager or Admin)

---

## Development Server

To start the development server:

```bash
npm run dev
```

The application will be available at: `http://localhost:5173/`

---

**Last Updated**: 2024
**Version**: 1.0.0
