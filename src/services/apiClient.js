// frontend/src/services/apiClient.js
import axios from 'axios';
import {
  getAuthToken,
  isTokenValid,
  isSessionIdleExpired,
  silentRefreshToken,
  logoutUser
} from './apiService';

// Get the base URL from your environment variables or hardcode it
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

// Create an Axios instance with the base URL
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Add a request interceptor to include the JWT token in every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to keep 401 handling consistent with apiService
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalConfig = error?.config;

    if (status === 401 && originalConfig) {
      const url = (originalConfig.url || '').toLowerCase();
      const isPublicOrSpecialAuth =
        url.includes('/public') ||
        url.includes('/bank-dealer') ||
        url.includes('/dealer') ||
        url.includes('/mobile-pair') ||
        url.includes('/login') ||
        url.includes('/change-password') ||
        url.includes('/verify-mfa') ||
        url.includes('/resend-mfa') ||
        url.includes('/refresh-token') ||
        url.includes('/webauthn');

      if (!isPublicOrSpecialAuth && getAuthToken()) {
        if (!originalConfig._isRetry && !isSessionIdleExpired()) {
          originalConfig._isRetry = true;
          const currentHeader = originalConfig.headers?.['Authorization'] || '';
          const latestToken = getAuthToken();

          if (latestToken && `Bearer ${latestToken}` !== currentHeader && isTokenValid(latestToken)) {
            originalConfig.headers['Authorization'] = `Bearer ${latestToken}`;
            return apiClient(originalConfig);
          }

          const refreshed = await silentRefreshToken();
          const newToken = getAuthToken();
          if (refreshed && newToken) {
            originalConfig.headers['Authorization'] = `Bearer ${newToken}`;
            return apiClient(originalConfig);
          }
        }

        logoutUser({ preserveNext: true });
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
