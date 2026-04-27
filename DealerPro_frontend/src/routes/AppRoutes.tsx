import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';
import SignUpPage from '../pages/auth/SignUpPage';
import VerifyEmailPage from '../pages/auth/VerifyEmailPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import Layout from '../components/layout/Layout';
import ProtectedRoute from './ProtectedRoute';
import Leads from '../pages/leads/Leads';
import TestDrive from '../pages/leads/TestDrive';
import Service from '../pages/service/Service';
import Finance from '../pages/finance/Finance';
import Sales from '../pages/sales/Sales';
import Inventory from '../pages/inventory/Inventory';
import Parts from '../pages/parts/Parts';
import PurchaseOrders from '../pages/parts/PurchaseOrders';
import AuditLogs from '../pages/audit/AuditLogs';
import RoleRoute from './RoleRoute';

import Analytics from '../pages/analytics/Analytics';
import Dashboard from '../pages/dashboard/Dashboard';
import AdminPanel from '../pages/admin/AdminPanel';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/test-drives" element={<TestDrive />} />
          <Route path="/service" element={<Service />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/parts" element={<Parts />} />
          <Route path="/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'ROLE_ADMIN', 'ROLE_MANAGER']} />}>
            <Route path="/analytics" element={<Analytics />} />
          </Route>
          
          <Route element={<RoleRoute allowedRoles={['MANAGER', 'ADMIN', 'ROLE_MANAGER', 'ROLE_ADMIN']} />}>
            <Route path="/finance" element={<Finance />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['ADMIN', 'ROLE_ADMIN']} />}>
            <Route path="/admin" element={<AdminPanel />} />
          </Route>
        </Route>
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
