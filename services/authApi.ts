/**
 * Authentication API Service
 */
import apiClient from './api';
import { AxiosResponse } from 'axios';

export interface UserSignup {
  full_name: string;
  email: string;
  password: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  created_at: string | null;
}

export interface TokenRefresh {
  refresh_token: string;
}

// Auth API functions
export const signup = async (userData: UserSignup): Promise<User> => {
  const response: AxiosResponse<User> = await apiClient.post('/api/auth/signup', userData);
  return response.data;
};

export const login = async (credentials: UserLogin): Promise<TokenResponse> => {
  const response: AxiosResponse<TokenResponse> = await apiClient.post('/api/auth/login', credentials);
  
  // Store tokens
  localStorage.setItem('access_token', response.data.access_token);
  localStorage.setItem('refresh_token', response.data.refresh_token);
  
  return response.data;
};

export const logout = async (): Promise<void> => {
  try {
    await apiClient.post('/api/auth/logout');
  } catch (error) {
    // Even if API call fails, clear local tokens
    console.error('Logout error:', error);
  } finally {
    // Always clear tokens from localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
};

export const refreshToken = async (refreshToken: string): Promise<TokenResponse> => {
  const response: AxiosResponse<TokenResponse> = await apiClient.post('/api/auth/refresh-token', {
    refresh_token: refreshToken,
  });
  
  // Update stored tokens
  localStorage.setItem('access_token', response.data.access_token);
  localStorage.setItem('refresh_token', response.data.refresh_token);
  
  return response.data;
};

export const getCurrentUser = async (): Promise<User> => {
  const response: AxiosResponse<User> = await apiClient.get('/api/auth/me');
  return response.data;
};

// Helper functions
export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
};

export const getStoredRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token');
};

export const isAuthenticated = (): boolean => {
  return !!getStoredToken();
};

