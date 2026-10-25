import axios from 'axios';
import toast from 'react-hot-toast';

const apiClient = axios.create({
  baseURL: '/api',
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
  (error) => Promise.reject(error)
);

// Response interceptor — handle errors globally
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (!error.response) {
      // Network error
      toast.error('Network error — check your connection');
      return Promise.reject({
        code: 'NETWORK_ERROR',
        message: 'Network error',
      });
    }

    const { status, data } = error.response;
    const apiError = data?.error || { code: 'UNKNOWN_ERROR', message: 'An unexpected error occurred' };

    // Handle auth errors globally
    if (status === 401 && apiError.code === 'AUTH_TOKEN_EXPIRED') {
      localStorage.removeItem('pulse_access_token');
      localStorage.removeItem('pulse_user');
      window.location.href = '/login';
      toast.error('Session expired. Please log in again.');
    }

    return Promise.reject(apiError);
  }
);

export default apiClient;
