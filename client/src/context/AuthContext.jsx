import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('pulse_access_token');
    const saved = localStorage.getItem('pulse_user');
    return token && saved ? JSON.parse(saved) : null;
  });
  const [organization, setOrganization] = useState(() => {
    const token = localStorage.getItem('pulse_access_token');
    const saved = localStorage.getItem('pulse_org');
    return token && saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  // Validate session on boot
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('pulse_access_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.get('/auth/me');
        if (response.success) {
          setUser({
            id: response.data.id,
            name: response.data.name,
            email: response.data.email,
            role: response.data.role,
            orgId: response.data.organization.id,
          });
          setOrganization(response.data.organization);
        }
      } catch (err) {
        console.error('Session validation failed:', err);
        localStorage.removeItem('pulse_access_token');
        localStorage.removeItem('pulse_user');
        localStorage.removeItem('pulse_org');
        setUser(null);
        setOrganization(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const storeSession = (data) => {
    localStorage.setItem('pulse_access_token', data.tokens.accessToken);
    localStorage.setItem('pulse_refresh_token', data.tokens.refreshToken);
    localStorage.setItem('pulse_user', JSON.stringify(data.user));
    localStorage.setItem('pulse_org', JSON.stringify(data.organization));
    setUser(data.user);
    setOrganization(data.organization);
  };

  const login = async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    if (response.success) {
      storeSession(response.data);
      toast.success(`Welcome back, ${response.data.user.name}`);
      return response.data;
    }
  };

  const register = async (payload) => {
    const response = await apiClient.post('/auth/register', payload);
    if (response.success) {
      storeSession(response.data);
      toast.success('Organization initialized. Commander privileges granted.');
      return response.data;
    }
  };

  const logout = () => {
    localStorage.removeItem('pulse_access_token');
    localStorage.removeItem('pulse_refresh_token');
    localStorage.removeItem('pulse_user');
    localStorage.removeItem('pulse_org');
    setUser(null);
    setOrganization(null);
    toast('Session terminated.');
  };

  // 1-Click Evaluator Role Switcher
  const switchDemoRole = async (targetRole) => {
    const response = await apiClient.post('/auth/demo-switch', { role: targetRole });
    if (response?.success) {
      storeSession(response.data);
      toast.success(`Role switched to [${targetRole}]: ${response.data.user.name}`, {
        icon: '⚡',
      });
      return response.data;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        loading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        switchDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
