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

export const getUserInitials = (nameOrEmail, fallback = 'U') => {
  if (!nameOrEmail || typeof nameOrEmail !== 'string') return fallback;
  const trimmed = nameOrEmail.trim();
  if (!trimmed) return fallback;

  const base = trimmed.includes('@') ? trimmed.split('@')[0] : trimmed;
  const parts = base
    .replace(/[0-9]+$/g, '')
    .split(/[\s._+-]+/)
    .map((p) => p.replace(/[^a-zA-Z\u0600-\u06FF]/g, ''))
    .filter(Boolean);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length === 1) {
    return parts[0][0].toUpperCase();
  }
  return fallback;
};

export const getSidebarUserDisplay = ({
  userEmail,
  userName,
  roleLabel = 'User',
  fallbackInitials = 'U',
} = {}) => {
  const stored = getCurrentUser();
  const rawName = (userName || stored?.full_name || stored?.name || '').trim();
  const rawEmail = (userEmail || stored?.email || '').trim();
  const isSyntheticSandboxEmail = rawEmail.toLowerCase().endsWith('@sandbox.growbusinessdevelopment.com');

  const primaryLabel = rawName || (!isSyntheticSandboxEmail && rawEmail) || roleLabel;
  const initials = rawName
    ? getUserInitials(rawName, fallbackInitials)
    : (!isSyntheticSandboxEmail && rawEmail)
      ? getUserInitials(rawEmail, fallbackInitials)
      : fallbackInitials;

  const tooltipParts = [];
  if (rawName) tooltipParts.push(rawName);
  if (rawEmail && !isSyntheticSandboxEmail) tooltipParts.push(rawEmail);
  if (roleLabel) tooltipParts.push(roleLabel);

  return {
    primaryLabel,
    email: isSyntheticSandboxEmail ? '' : rawEmail,
    initials,
    roleLabel,
    tooltip: tooltipParts.join(' • ') || roleLabel,
  };
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
