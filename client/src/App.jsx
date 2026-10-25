import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/guards/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import AcceptInvitePage from './features/auth/AcceptInvitePage';
import DashboardPage from './features/dashboard/DashboardPage';
import IncidentDetailPage from './features/incidents/IncidentDetailPage';
import PostmortemsPage from './features/postmortems/PostmortemsPage';
import AnalyticsPage from './features/analytics/AnalyticsPage';
import TeamPage from './features/team/TeamPage';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/invite/:token" element={<AcceptInvitePage />} />

          {/* Protected Tactical War-Room Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/incidents/:id" element={<IncidentDetailPage />} />
              <Route path="/postmortems" element={<PostmortemsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/team" element={<TeamPage />} />
            </Route>
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
