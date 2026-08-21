// frontend/src/utils/authUtils.js

/**
 * Safe Auth & User Helper Utility
 * Provides defensive, crash-proof access to user authentication and role data.
 */

import { safeLocalStorage } from './safeStorage';

export const getCurrentUser = () => {
  try {
    const userStr = safeLocalStorage.getItem('user');
    if (!userStr) return {};
    const parsed = JSON.parse(userStr);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const getCurrentUserId = () => {
  const user = getCurrentUser();
  return user?.id ?? null;
};

export const getUserRole = () => {
  const user = getCurrentUser();
  return user?.role || 'end_user';
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
