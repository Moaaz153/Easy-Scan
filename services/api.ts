/**
 * API Client Configuration
 * Centralized axios instance with error handling
 */
import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';

// Get API URL from environment variable or use default
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url} - Token added`);
    } else {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url} - No token`);
    }
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  (error: AxiosError) => {
    // Handle common errors
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as Record<string, unknown>;
      
      switch (status) {
        case 400:
          console.error('Bad Request:', data?.detail || data?.message);
          break;
        case 401:
          console.error('Unauthorized');
          // Clear tokens and redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          break;
        case 404:
          console.error('Not Found:', data?.detail || data?.message);
          break;
        case 422:
          console.error('Validation Error:', data?.detail || data?.message);
          break;
        case 500:
          console.error('Server Error:', data?.detail || data?.message);
          break;
        default:
          console.error('API Error:', data?.detail || data?.message || error.message);
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('Network Error: No response from server');
      
      // Log detailed request information
      const requestDetails = {
        url: error.config?.url || 'N/A',
        method: error.config?.method?.toUpperCase() || 'N/A',
        baseURL: error.config?.baseURL || 'N/A',
        timeout: error.config?.timeout ? `${error.config.timeout}ms` : 'N/A',
        code: error.code || 'N/A',
        message: error.message || 'No message',
        hasAuthToken: !!error.config?.headers?.Authorization
      };
      
      console.error('Request details:', requestDetails);
      console.error('Full error:', error);
      
      // Check if this is a /me endpoint issue (common after login)
      if (error.config?.url?.includes('/api/auth/me')) {
        console.error('⚠️ Failed to fetch current user. Possible causes:');
        console.error('  1. Token is expired or invalid');
        console.error('  2. Backend database query is slow');
        console.error('  3. CORS preflight (OPTIONS) request failed');
        console.error('  4. Bearer token format is incorrect');
        if (error.config?.headers?.Authorization) {
          const authHeader = String(error.config.headers.Authorization);
          console.error('  Token present:', authHeader.substring(0, 20) + '...');
        } else {
          console.error('  ❌ NO TOKEN FOUND IN REQUEST HEADERS');
        }
      }
      
      // Provide helpful diagnostic message
      if (typeof window !== 'undefined') {
        const errorMsg = error.code === 'ECONNREFUSED' 
          ? 'Connection refused - backend may not be running'
          : error.code === 'ERR_NETWORK'
          ? 'Network error - check if backend server is accessible'
          : 'Backend server not responding';
        
        console.warn(`⚠️ Backend server at "${API_BASE_URL}" - ${errorMsg}`);
        
        // Try to fetch the backend health check
        try {
          fetch(`${API_BASE_URL}/docs`, { method: 'HEAD' })
            .then(res => {
              if (res.ok) {
                console.log('✅ Backend server is running but CORS or connection may be blocked');
              }
            })
            .catch(corsError => {
              console.error('❌ Backend server is not accessible at', API_BASE_URL);
              console.error('Make sure backend is running: cd backend && python run.py');
            });
        } catch (e) {
          // Fetch attempt failed
        }
      }
    } else {
      // Error in request setup
      console.error('Request Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;

