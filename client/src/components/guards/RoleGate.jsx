import React from 'react';
import { useAuth } from '../../context/AuthContext';

/**
 * Conditionally renders children if the authenticated user has one of allowedRoles.
 * Otherwise renders fallback or null.
 */
export const RoleGate = ({ allowedRoles = [], fallback = null, children }) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return fallback;
  }

  return <>{children}</>;
};

export default RoleGate;
