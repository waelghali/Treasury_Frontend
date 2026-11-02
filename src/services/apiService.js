// src/services/apiService.js
import apiClient from './apiClient';
import { v4 as uuidv4 } from 'uuid';
import { jwtDecode } from 'jwt-decode';
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

/**
 * Auth Token & Cross-Tab Session Management
 */
const LAST_ACTIVITY_KEY = 'last_activity_at';
const LAST_REFRESH_KEY = 'last_token_refresh_at';
const SESSION_CHANNEL_NAME = 'grow_session_sync_channel';

let sessionChannel = null;
const sessionSyncListeners = new Set();

const getSessionChannel = () => {
  if (sessionChannel) return sessionChannel;
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      sessionChannel = new BroadcastChannel(SESSION_CHANNEL_NAME);
      sessionChannel.onmessage = (event) => {
        const data = event?.data;
        if (!data || !data.type) return;
        if (data.type === 'USER_ACTIVITY' && data.timestamp) {
          if (data.timestamp > lastActivityTime) {
            lastActivityTime = data.timestamp;
            if (activeWarningCallback) {
              startSessionTimers(activeWarningCallback, lastActivityTime);
            }
          }
        } else if (data.type === 'TOKEN_REFRESHED' && data.timestamp) {
          if (data.timestamp > lastTokenRefreshTime) {
            lastTokenRefreshTime = data.timestamp;
          }
          if (trailingRefreshTimer) {
            clearTimeout(trailingRefreshTimer);
            trailingRefreshTimer = null;
          }
        } else if (data.type === 'SESSION_EXTENDED' && data.timestamp) {
          lastActivityTime = data.timestamp;
          lastTokenRefreshTime = data.timestamp;
          if (activeWarningCallback) {
            startSessionTimers(activeWarningCallback, lastActivityTime);
          }
        } else if (data.type === 'SESSION_LOGOUT') {
          clearSessionTimers();
        }
        sessionSyncListeners.forEach((listener) => {
          try {
            listener(data);
          } catch {}
        });
      };
    } catch {}
  }
  return sessionChannel;
};

const broadcastSessionEvent = (payload) => {
  const ch = getSessionChannel();
  if (ch) {
    try {
      ch.postMessage(payload);
    } catch {}
  }
};

export const subscribeSessionSync = (listener) => {
  getSessionChannel();
  sessionSyncListeners.add(listener);
  return () => sessionSyncListeners.delete(listener);
};

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
    const now = Date.now();
    localStorage.setItem('jwt_token', token);
    localStorage.setItem(LAST_REFRESH_KEY, String(now));
    lastTokenRefreshTime = now;
    if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      lastActivityTime = now;
    }
  } else {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    localStorage.removeItem(LAST_REFRESH_KEY);
    localStorage.removeItem('user');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_id');
  }
};

export const getAuthToken = () => {
  return localStorage.getItem('jwt_token');
};

/**
 * Inactivity & Session Timer Logic
 */
let sessionWarningTimer = null;
let sessionExpiryTimer = null;
let sessionWatchdogInterval = null;
let trailingRefreshTimer = null;
let activeWarningCallback = null;
let warningAlreadyTriggered = false;

const getStoredTimestamp = (key, fallback) => {
  try {
    const val = Number(localStorage.getItem(key));
    return Number.isFinite(val) && val > 0 ? val : fallback;
  } catch {
    return fallback;
  }
};

let lastActivityTime = getStoredTimestamp(LAST_ACTIVITY_KEY, Date.now());
let lastTokenRefreshTime = getStoredTimestamp(LAST_REFRESH_KEY, Date.now());
let lastActivityHandledAt = 0;
let refreshInFlight = false;

// TOTAL_SESSION_MS: Total inactivity time before auto-logout (20 minutes)
// WARNING_BUFFER_MS: How long the "warning modal" stays up before the final logout (1 minute)
export const TOTAL_SESSION_MS = 20 * 60 * 1000;    // 20 minutes
export const WARNING_BUFFER_MS = 1 * 60 * 1000;    // 1 minute warning buffer
const REFRESH_THRESHOLD_MS = 2 * 60 * 1000;        // Refresh JWT every 2 minutes of activity (and catch-up after final activity)
const ACTIVITY_THROTTLE_MS = 1000;                 // Throttle high-frequency DOM events to once per second

export const isTokenValid = (token = getAuthToken()) => {
  if (!token) return false;
  try {
    const decoded = jwtDecode(token);
    if (!decoded || typeof decoded.exp !== 'number') return false;
    return decoded.exp * 1000 > Date.now() + 3000;
  } catch {
    return false;
  }
};

export const isSessionIdleExpired = () => {
  const storedLastActivity = getStoredTimestamp(LAST_ACTIVITY_KEY, 0);
  if (!storedLastActivity) return false;
  if (storedLastActivity > lastActivityTime) {
    lastActivityTime = storedLastActivity;
  }
  return Date.now() - lastActivityTime >= TOTAL_SESSION_MS;
};

export const getRemainingWarningSeconds = () => {
  const storedLastActivity = getStoredTimestamp(LAST_ACTIVITY_KEY, lastActivityTime);
  if (storedLastActivity > lastActivityTime) {
    lastActivityTime = storedLastActivity;
  }
  const deadline = lastActivityTime + TOTAL_SESSION_MS;
  const remainingMs = deadline - Date.now();
  return Math.max(0, Math.min(Math.ceil(WARNING_BUFFER_MS / 1000), Math.ceil(remainingMs / 1000)));
};

const isCurrentRoutePublic = () => {
  if (typeof window === 'undefined') return false;
  const publicPaths = [
    '/',
    '/know-more',
    '/free-trial-register',
    '/login',
    '/forgot-password',
    '/reset-password',
    '/portal',
    '/public',
    '/public-issuance',
    '/public-quotation',
    '/public/quotation',
    '/public-bank-handshake',
    '/public/bank-handshake',
    '/public-dealer-handshake',
    '/public/dealer-handshake',
    '/dealer',
    '/dealer-alerts',
    '/mobile-pair'
  ];
  const currentPath = (window.location.pathname || '').toLowerCase();
  return publicPaths.some(p => currentPath === p || currentPath.startsWith(p + '/'));
};

export const logoutUser = (options = {}) => {
  const { preserveNext = false, broadcast = true } = options;
  console.log('User logged out due to inactivity or session expiry.');
  setAuthToken(null);
  stopInactivityTracker();
  clearSessionTimers();

  if (broadcast) {
    broadcastSessionEvent({ type: 'SESSION_LOGOUT', timestamp: Date.now() });
  }

  if (typeof window !== 'undefined') {
    if (!preserveNext) {
      if (window.location.pathname === '/login' && window.location.search) {
        window.history.replaceState({}, '', '/login');
      } else if (!isCurrentRoutePublic()) {
        window.location.href = '/login';
      }
    } else if (!isCurrentRoutePublic()) {
      const current = window.location.pathname + window.location.search + window.location.hash;
      if (current && current !== '/' && current !== '/app' && !current.startsWith('/login')) {
        window.location.href = `/login?next=${encodeURIComponent(current)}`;
      } else {
        window.location.href = '/login';
      }
    }
  }
};

export const clearSessionTimers = () => {
  if (sessionWarningTimer) {
    clearTimeout(sessionWarningTimer);
    sessionWarningTimer = null;
  }
  if (sessionExpiryTimer) {
    clearTimeout(sessionExpiryTimer);
    sessionExpiryTimer = null;
  }
  if (sessionWatchdogInterval) {
    clearInterval(sessionWatchdogInterval);
    sessionWatchdogInterval = null;
  }
  if (trailingRefreshTimer) {
    clearTimeout(trailingRefreshTimer);
    trailingRefreshTimer = null;
  }
  warningAlreadyTriggered = false;
};

export const silentRefreshToken = async () => {
  if (refreshInFlight) return false;
  const token = getAuthToken();
  if (!token) return false;

  refreshInFlight = true;
  try {
    const response = await fetch(`${API_BASE_URL}/refresh-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.access_token) {
        const now = Date.now();
        localStorage.setItem('jwt_token', data.access_token);
        localStorage.setItem(LAST_REFRESH_KEY, String(now));
        lastTokenRefreshTime = now;
        broadcastSessionEvent({ type: 'TOKEN_REFRESHED', timestamp: now });
        return true;
      }
    } else {
      lastTokenRefreshTime = Date.now();
    }
  } catch (err) {
    console.warn('Silent token refresh failed:', err.message);
  } finally {
    refreshInFlight = false;
  }
  return false;
};

const triggerWarningWithFreshToken = (onWarning) => {
  if (warningAlreadyTriggered) return;
  warningAlreadyTriggered = true;
  // Ensure the backend token is refreshed right as the 60-second warning modal opens
  // so that clicking "Stay Logged In" during the countdown never fails with a 401.
  if (getAuthToken() && isTokenValid()) {
    silentRefreshToken();
  }
  if (onWarning) onWarning();
};

export const startSessionTimers = (onWarning, baseTimestamp = null) => {
  if (onWarning) {
    activeWarningCallback = onWarning;
  }
  const callback = onWarning || activeWarningCallback;

  if (sessionWarningTimer) clearTimeout(sessionWarningTimer);
  if (sessionExpiryTimer) clearTimeout(sessionExpiryTimer);
  if (sessionWatchdogInterval) clearInterval(sessionWatchdogInterval);
  warningAlreadyTriggered = false;

  const now = Date.now();
  const effectiveBase = baseTimestamp || lastActivityTime || now;
  lastActivityTime = effectiveBase;

  const warningTime = effectiveBase + TOTAL_SESSION_MS - WARNING_BUFFER_MS;
  const expiryTime = effectiveBase + TOTAL_SESSION_MS;

  const warningDelay = Math.max(0, warningTime - now);
  const expiryDelay = Math.max(0, expiryTime - now);

  // 1. Trigger UI warning modal at 19 minutes of inactivity
  sessionWarningTimer = setTimeout(() => {
    const latestStoredActivity = getStoredTimestamp(LAST_ACTIVITY_KEY, lastActivityTime);
    if (latestStoredActivity > lastActivityTime && Date.now() - latestStoredActivity < TOTAL_SESSION_MS - WARNING_BUFFER_MS) {
      lastActivityTime = latestStoredActivity;
      startSessionTimers(callback, lastActivityTime);
      return;
    }
    triggerWarningWithFreshToken(callback);
  }, warningDelay);

  // 2. Final auto-logout timer at 20 minutes of inactivity
  sessionExpiryTimer = setTimeout(() => {
    const latestStoredActivity = getStoredTimestamp(LAST_ACTIVITY_KEY, lastActivityTime);
    if (latestStoredActivity > lastActivityTime && Date.now() - latestStoredActivity < TOTAL_SESSION_MS) {
      lastActivityTime = latestStoredActivity;
      startSessionTimers(callback, lastActivityTime);
      return;
    }
    logoutUser({ preserveNext: true });
  }, expiryDelay);

  // 3. Wall-clock watchdog (handles computer sleep / throttled background tabs)
  sessionWatchdogInterval = setInterval(() => {
    if (!getAuthToken() || isCurrentRoutePublic()) return;
    const latestStoredActivity = getStoredTimestamp(LAST_ACTIVITY_KEY, lastActivityTime);
    if (latestStoredActivity > lastActivityTime) {
      lastActivityTime = latestStoredActivity;
    }
    const idleMs = Date.now() - lastActivityTime;
    if (idleMs >= TOTAL_SESSION_MS) {
      logoutUser({ preserveNext: true });
    } else if (idleMs >= TOTAL_SESSION_MS - WARNING_BUFFER_MS && !warningAlreadyTriggered) {
      triggerWarningWithFreshToken(callback);
    }
  }, 5000);
};

export const handleUserActivity = async (onWarning) => {
  const now = Date.now();
  if (now - lastActivityHandledAt < ACTIVITY_THROTTLE_MS) {
    return;
  }
  lastActivityHandledAt = now;
  lastActivityTime = now;

  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
  } catch {}
  broadcastSessionEvent({ type: 'USER_ACTIVITY', timestamp: now });

  startSessionTimers(onWarning, now);

  // Keep backend JWT synchronized with frontend activity:
  // 1. Immediately refresh if REFRESH_THRESHOLD_MS (2 min) has elapsed since last refresh.
  // 2. Otherwise schedule a trailing catch-up refresh so if the user stops moving the mouse
  //    right now, the backend token still gets refreshed after the 2-minute window.
  const latestStoredRefresh = getStoredTimestamp(LAST_REFRESH_KEY, lastTokenRefreshTime);
  if (latestStoredRefresh > lastTokenRefreshTime) {
    lastTokenRefreshTime = latestStoredRefresh;
  }

  const elapsed = now - lastTokenRefreshTime;
  if (elapsed >= REFRESH_THRESHOLD_MS) {
    if (trailingRefreshTimer) {
      clearTimeout(trailingRefreshTimer);
      trailingRefreshTimer = null;
    }
    await silentRefreshToken();
  } else if (!trailingRefreshTimer) {
    const remainingMs = Math.max(1000, REFRESH_THRESHOLD_MS - elapsed);
    trailingRefreshTimer = setTimeout(async () => {
      trailingRefreshTimer = null;
      if (getAuthToken() && lastActivityTime > lastTokenRefreshTime && !isSessionIdleExpired()) {
        await silentRefreshToken();
      }
    }, remainingMs);
  }
};

// Called after login or token refresh to mark the session as freshly active
export const resetTokenRefreshTime = () => {
  const now = Date.now();
  lastActivityTime = now;
  lastTokenRefreshTime = now;
  lastActivityHandledAt = 0;
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    localStorage.setItem(LAST_REFRESH_KEY, String(now));
  } catch {}
  getSessionChannel();
};

export const stopInactivityTracker = () => clearSessionTimers();

/**
 * Session Extension (Token Refresh when clicking "Stay Logged In")
 */
export const extendSession = async () => {
  try {
    const refreshed = await silentRefreshToken();
    if (refreshed || isTokenValid()) {
      const now = Date.now();
      lastActivityTime = now;
      lastActivityHandledAt = 0;
      try {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      } catch {}
      broadcastSessionEvent({ type: 'SESSION_EXTENDED', timestamp: now });
      return true;
    }
  } catch (err) {
    console.error('Session extension failed — token may have already expired:', err.message);
  }
  return false;
};

/**
 * Centralized API Request Handlers
 */
export const apiRequest = async (url, method = 'GET', data = null, contentType = 'application/json', responseType = 'json', _isRetry = false) => {
  if (contentType && typeof contentType === 'object') {
    if (contentType.responseType) {
      responseType = contentType.responseType;
    }
    contentType = contentType.contentType || 'application/json';
  }

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
        forbiddenError.status = 403;
        throw forbiddenError;
      }
      if (response.status === 401) {
        const isAuthFlowEndpoint =
          url.includes('/change-password') ||
          url.includes('/login') ||
          url.includes('/verify-mfa') ||
          url.includes('/resend-mfa') ||
          url.includes('/refresh-token') ||
          url.includes('/mobile-pair') ||
          url.includes('/webauthn');

        // If the user has NOT exceeded the 20-minute inactivity limit, attempt one silent refresh/retry
        // before logging out so a transient token race never drops an active session.
        if (!isAuthFlowEndpoint && !_isRetry && !isSessionIdleExpired()) {
          const latestToken = getAuthToken();
          if (latestToken && latestToken !== token && isTokenValid(latestToken)) {
            return await apiRequest(url, method, data, contentType, responseType, true);
          }
          const refreshed = await silentRefreshToken();
          if (refreshed) {
            return await apiRequest(url, method, data, contentType, responseType, true);
          }
        }

        if (!isAuthFlowEndpoint) {
          logoutUser({ preserveNext: true });
        }
        const authError = new Error(errorData.detail || 'Authentication required or session expired.');
        authError.statusCode = 401;
        authError.status = 401;
        throw authError;
      }
      let formattedDetail = errorData.detail || errorData.message || response.statusText;
      if (Array.isArray(errorData.detail)) {
        formattedDetail = errorData.detail.map(err => {
          const field = Array.isArray(err.loc) ? err.loc[err.loc.length - 1] : '';
          return field ? `${field}: ${err.msg}` : (err.msg || JSON.stringify(err));
        }).join('; ');
      } else if (typeof formattedDetail === 'object' && formattedDetail !== null) {
        formattedDetail = JSON.stringify(formattedDetail);
      }
      const error = new Error(formattedDetail);
      error.statusCode = response.status;
      error.status = response.status;
      error.detail = errorData.detail;
      throw error;
    }

    const contentTypeHeader = (response.headers.get('content-type') || '').toLowerCase();
    if (response.status === 204 || !contentTypeHeader) return null;
    if (
      responseType === 'blob' ||
      contentTypeHeader.includes('spreadsheet') ||
      contentTypeHeader.includes('excel') ||
      contentTypeHeader.includes('openxmlformats') ||
      contentTypeHeader.includes('pdf') ||
      contentTypeHeader.includes('octet-stream')
    ) {
      return await response.blob();
    }
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
      let formattedDetail = errorData.detail || errorData.message || response.statusText;
      if (Array.isArray(errorData.detail)) {
        formattedDetail = errorData.detail.map(err => {
          const field = Array.isArray(err.loc) ? err.loc[err.loc.length - 1] : '';
          return field ? `${field}: ${err.msg}` : (err.msg || JSON.stringify(err));
        }).join('; ');
      } else if (typeof formattedDetail === 'object' && formattedDetail !== null) {
        formattedDetail = JSON.stringify(formattedDetail);
      }
      const error = new Error(formattedDetail);
      error.statusCode = response.status;
      error.detail = errorData.detail;
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
export const getSystemNotifications = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  });
  const qs = params.toString();
  return apiRequest(`/system-owner/system-notifications/${qs ? `?${qs}` : ''}`);
};
export const getSystemNotificationTypes = async () => apiRequest('/system-owner/system-notifications-types');
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
