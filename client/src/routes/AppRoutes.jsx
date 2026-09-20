import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { Login } from '../pages/Login';
import { Overview } from '../pages/Overview';
import { Payments } from '../pages/Payments';
import { Categories } from '../pages/Categories';
import { LossDetails } from '../pages/LossDetails';
import { Expenses } from '../pages/Expenses';
import { SettingsHub } from '../pages/SettingsHub';
import { PaymentPayout } from '../pages/PaymentPayout';
import { Advanced } from '../pages/Advanced';
import { Profile } from '../pages/Profile';
import { Companies } from '../pages/Companies';
import { CompanyDetails } from '../pages/CompanyDetails';

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Public route wrapper for login
const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Login Route */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />

      {/* Protected Portal Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Overview />} />
        <Route path="transactions" element={<Payments />} />
        <Route path="payout-details" element={<Categories />} />
        <Route path="loss-details" element={<LossDetails />} />
        <Route path="hub-expenses" element={<Expenses />} />
        <Route path="expenses" element={<Navigate to="/hub-expenses" replace />} />
        <Route path="settings" element={<SettingsHub />} />
        <Route path="my-payment" element={<PaymentPayout />} />
        <Route path="payment-payout" element={<Navigate to="/my-payment" replace />} />
        <Route path="advanced" element={<Advanced />} />
        <Route path="profile" element={<Profile />} />
        <Route path="companies" element={<Companies />} />
        <Route path="companies/:companyId" element={<CompanyDetails />} />
        <Route path="hub" element={<Navigate to="/hub-expenses" replace />} />
        <Route path="dashboard" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
