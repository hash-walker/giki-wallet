// Axios instance with security configurations
import axios from 'axios';

// Get API URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/';

// Create axios instance with default config
export const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 10000, // 10 seconds timeout
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: false,
});

// Request interceptor - Add auth token if available
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Handle common errors
        if (error.response?.status === 401) {
            // Unauthorized - clear token (expired/invalid)
            localStorage.removeItem('auth_token');
        }
        
        if (error.response?.status === 403) {
            // Forbidden
            console.error('Access forbidden');
        }
        
        if (error.response?.status >= 500) {
            // Server error
            console.error('Server error:', error.response.data);
        }
        
        return Promise.reject(error);
    }
);

export default apiClient;

