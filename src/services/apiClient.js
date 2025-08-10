// frontend/src/services/apiClient.js
import axios from 'axios';

// Corrected: Use the Vercel environment variable directly.
const API_BASE_URL = process.env.REACT_APP_API_URL;

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

export default apiClient;