// src/services/apiService.js
import apiClient from './apiClient';
import { v4 as uuidv4 } from 'uuid';
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

/**
 * Auth Token Management
 */

export const getOrCreateDeviceId = () => {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
};

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('jwt_token', token);
  } else {
    localStorage.removeItem('jwt_token');
  }
};

export const getAuthToken = () => {
  return localStorage.getItem('jwt_token');
};

/**
 * Inactivity & Session Timer Logic
 */
let sessionWarningTimer;
let sessionExpiryTimer;

// TOTAL_SESSION_MS: Total time before logout
// WARNING_BUFFER_MS: How long the "warning modal" stays up before the end
const TOTAL_SESSION_MS = 20 * 60 * 1000;    // 30 Seconds Total (Testing)
export const WARNING_BUFFER_MS = 1 * 60 * 1000;  // 10 Seconds (Exported for UI)

export const logoutUser = () => {
    console.log('User logged out due to inactivity or session expiry.');
    setAuthToken(null);
    stopInactivityTracker();
    clearSessionTimers();
    window.location.href = '/login';
};

export const clearSessionTimers = () => {
    clearTimeout(sessionWarningTimer);
    clearTimeout(sessionExpiryTimer);
};

export const startSessionTimers = (onWarning) => {
    clearSessionTimers();

    // Trigger the UI warning modal
    sessionWarningTimer = setTimeout(() => {
        if (onWarning) onWarning(); 
    }, TOTAL_SESSION_MS - WARNING_BUFFER_MS);

    // Final logout timer
    sessionExpiryTimer = setTimeout(() => {
        logoutUser();
    }, TOTAL_SESSION_MS);
};

export const handleUserActivity = async (onWarning) => {
    startSessionTimers(onWarning); 
};

// Compatibility stubs for App.js logic
export const resetInactivityTimer = () => {}; 
export const startInactivityTracker = () => {};
export const stopInactivityTracker = () => clearSessionTimers();

/**
 * Session Extension (Token Refresh)
 */
export const extendSession = async () => {
    try {
        const data = await apiRequest('/refresh-token', 'POST');
        if (data && data.access_token) {
            setAuthToken(data.access_token);
            return true;
        }
    } catch (err) {
        console.error("Extension failed", err);
    }
    return false;
};

/**
 * Centralized API Request Handlers
 */
export const apiRequest = async (url, method = 'GET', data = null, contentType = 'application/json', responseType = 'json') => {
  const token = getAuthToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let body = data;
  if (!(data instanceof FormData)) {
      headers['Content-Type'] = contentType;
      if (contentType === 'application/json' && data !== null) body = JSON.stringify(data);
  }

  try {
    const fetchOptions = { method, headers, body: (method === 'GET' || method === 'HEAD') ? null : body };
    const response = await fetch(`${API_BASE_URL}${url}`, fetchOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 403) {
        const forbiddenError = new Error(errorData.detail || 'Access to this resource is forbidden.');
        forbiddenError.statusCode = 403;
        throw forbiddenError;
      }
      if (response.status === 401) {
        logoutUser(); 
        const authError = new Error('Authentication required or session expired.');
        authError.statusCode = 401;
        throw authError;
      }
      const error = new Error(errorData.detail || errorData.message || response.statusText);
      error.statusCode = response.status;
      throw error;
    }

    const contentTypeHeader = response.headers.get('content-type');
    if (response.status === 204 || !contentTypeHeader) return null;
    return responseType === 'text' ? await response.text() : await response.json();
  } catch (error) {
    console.error('API Request Failed:', error);
    throw error;
  }
};

export const publicApiRequest = async (url, method = 'GET', data = null, customHeaders = {}) => {
  let body = data;
  const headers = { ...customHeaders };
  if (!(data instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    if (headers['Content-Type'] === 'application/json' && data !== null) body = JSON.stringify(data);
  }

  try {
    const fetchOptions = { method, headers, body: (method === 'GET' || method === 'HEAD') ? null : body };
    const response = await fetch(`${API_BASE_URL}${url}`, fetchOptions);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.detail || errorData.message || response.statusText);
      error.statusCode = response.status;
      throw error;
    }
    const contentTypeHeader = response.headers.get('content-type');
    return (response.status === 204 || !contentTypeHeader) ? null : await response.json();
  } catch (error) {
    console.error('Public API Request Failed:', error);
    throw error;
  }
};

/**
 * Endpoint Specific Functions
 */

// System Notifications
export const getSystemNotifications = async () => apiRequest('/system-owner/system-notifications/');
export const getSystemNotificationById = async (id) => apiRequest(`/system-owner/system-notifications/${id}`, 'GET');
export const createSystemNotification = async (notificationData) => apiRequest('/system-owner/system-notifications/', 'POST', notificationData);
export const updateSystemNotification = async (id, notificationData) => apiRequest(`/system-owner/system-notifications/${id}`, 'PUT', notificationData);
export const deleteSystemNotification = async (id) => apiRequest(`/system-owner/system-notifications/${id}`, 'DELETE');
export const restoreSystemNotification = async (id) => apiRequest(`/system-owner/system-notifications/${id}/restore`, 'POST');
export const getSystemNotificationAnalytics = async (id) => apiRequest(`/system-owner/system-notifications/${id}/analytics`, 'GET');
export const fetchActiveSystemNotifications = async () => apiClient.get('/end-user/system-notifications/');

// User & Role Management
export const getAllUsersForSystemOwner = async () => apiRequest('/system-owner/users/');
export const getAllRolesForSystemOwner = async () => ['System Owner', 'Corporate Admin', 'End User'];
export const createCustomerUserBySystemOwner = async (customerId, userData) => apiRequest(`/system-owner/customers/${customerId}/users/`, 'POST', userData);
export const updateCustomerUserBySystemOwner = async (userId, userData) => apiRequest(`/system-owner/users/${userId}`, 'PUT', userData);
export const deleteUserBySystemOwner = async (userId) => apiRequest(`/system-owner/users/${userId}`, 'DELETE');
export const restoreUserBySystemOwner = async (userId) => apiRequest(`/system-owner/users/${userId}/restore`, 'POST');

// LG Specific
export const cancelLGInstruction = async (instructionId, reason, declarationConfirmed) => {
  const payload = { reason, declaration_confirmed: declarationConfirmed };
  return apiRequest(`/end-user/lg-records/instructions/${instructionId}/cancel`, 'POST', payload);
};