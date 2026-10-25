import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pulse_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    toast.error(error.message || 'Request failed to dispatch');
    return Promise.reject(error);
  }
);

// Response interceptor — handle errors globally
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Response Error:', error);

    const details = error.response?.data?.error?.details;
    let detailMessage = null;
    if (details && typeof details === 'object') {
      const firstField = Object.keys(details)[0];
      const errList = details[firstField];
      if (Array.isArray(errList) && errList.length > 0) {
        detailMessage = `${firstField}: ${errList[0]}`;
      }
    }

    const errorMessage =
      detailMessage ||
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      'Network error — check server connection';

    // Global visible notification so errors are never silently swallowed
    toast.error(errorMessage);

    if (!error.response) {
      // Pure network / connection refused error
      return Promise.reject({
        code: 'NETWORK_ERROR',
        message: errorMessage,
      });
    }

    const { status, data } = error.response;
    const apiError = data?.error || {
      code: 'UNKNOWN_ERROR',
      message: errorMessage,
    };

    // Handle session expiry
    if (status === 401 && apiError.code === 'AUTH_TOKEN_EXPIRED') {
      localStorage.removeItem('pulse_access_token');
      localStorage.removeItem('pulse_user');
      localStorage.removeItem('pulse_org');
      window.location.href = '/login';
    }

    return Promise.reject(apiError);
  }
);

export default apiClient;
