// frontend/src/utils/authUtils.js

/**
 * Safe Auth & User Helper Utility
 * Provides defensive, crash-proof access to user authentication and role data.
 */

import { safeLocalStorage } from './safeStorage';
import { jwtDecode } from 'jwt-decode';

export const getCurrentUser = () => {
  try {
    const userStr = safeLocalStorage.getItem('user');
    if (userStr) {
      const parsed = JSON.parse(userStr);
      if (parsed && typeof parsed === 'object' && (parsed.id || parsed.user_id)) {
        return parsed;
      }
    }
  } catch {}

  // Fallback to reading and decoding active JWT token
  try {
    const token = safeLocalStorage.getItem('jwt_token') || 
                  (typeof localStorage !== 'undefined' ? localStorage.getItem('jwt_token') : null) || 
                  safeLocalStorage.getItem('token') || 
                  (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
    if (token) {
      const decoded = jwtDecode(token);
      if (decoded) {
        const u = {
          id: decoded.user_id || decoded.id,
          user_id: decoded.user_id || decoded.id,
          email: decoded.email || decoded.sub,
          role: decoded.role,
          customer_id: decoded.customer_id,
          customer_name: decoded.customer_name
        };
        try {
          safeLocalStorage.setItem('user', JSON.stringify(u));
        } catch {}
        return u;
      }
    }
  } catch (e) {
    console.warn('authUtils: Could not decode token fallback:', e);
  }

  return {};
};

export const getCurrentUserId = () => {
  const user = getCurrentUser();
  const rawId = user?.id ?? user?.user_id ?? null;
  return rawId !== null && rawId !== undefined ? Number(rawId) : null;
};

export const getUserRole = () => {
  const user = getCurrentUser();
  const role = user?.role || (typeof localStorage !== 'undefined' ? localStorage.getItem('user_role') : null);
  return role || 'end_user';
};

export const getRolePrefix = () => {
  const role = getUserRole();
  return (role === 'corporate_admin' || role === 'viewer') ? 'corporate-admin' : 'end-user';
};

export const isCorporateAdmin = () => {
  const role = getUserRole();
  return role === 'corporate_admin';
};

export const isEndUser = () => {
  const role = getUserRole();
  return role === 'end_user';
};

export const isSystemOwner = () => {
  const role = getUserRole();
  return role === 'system_owner';
};

export const isChecker = () => {
  const role = getUserRole();
  return role === 'checker';
};

export const isViewer = () => {
  const role = getUserRole();
  return role === 'viewer';
};

export const isAuthenticated = () => {
  try {
    const token = safeLocalStorage.getItem('token');
    return !!token;
  } catch {
    return false;
  }
};
