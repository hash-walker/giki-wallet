// Axios instance with security configurations
import axios from 'axios';
import { extractAPIError, logError, type APIResponse } from './errors';

// Get API URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/';

// Create axios instance with default config
export const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 60000, // 60 seconds timeout
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
        // For successful responses, unwrap the APIResponse structure
        // and return just the data if available
        const data = response.data as APIResponse<unknown>;

        if (data && typeof data === 'object' && 'success' in data) {
            if (data.success && 'data' in data) {
                // Return just the data payload for successful responses
                response.data = data.data;
            }
        }

        return response;
    },
    (error) => {
        // Extract structured error from response
        const appError = extractAPIError(error);

        // Log the error for debugging
        logError(appError, {
            url: error.config?.url,
            method: error.config?.method,
        });

        // Handle specific status codes
        if (error.response?.status === 401) {
            // Unauthorized - clear token (expired/invalid)
            localStorage.removeItem('auth_token');

            // Optional: Redirect to login if not already there
            if (window.location.pathname !== '/login') {
                // You can dispatch a custom event here if needed
                console.warn('Session expired. Please log in again.');
            }
        }

        if (error.response?.status === 403) {
            // Forbidden
            console.error('Access forbidden:', appError.message);
        }

        if (error.code === 'ECONNABORTED') {
            console.warn('Request timed out. The server might be busy or restarting.');
        } else if (error.response?.status >= 500) {
            // Server error
            const data = error.response.data;
            if (typeof data === 'string' && data.includes('<html')) {
                console.warn(`Server error (${error.response.status}): Service is currently unavailable (Proxy/Edge error).`);
            }
        }

        // Reject with the structured AppError instead of raw axios error
        return Promise.reject(appError);
    }
);

export default apiClient;

