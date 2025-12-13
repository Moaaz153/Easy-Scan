"use client"
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import ProtectedRoute from '@/component/ProtectedRoute';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import { loginAsync, fetchCurrentUser } from '@/lib/features/authSlice';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, isAuthenticated } = useSelector((state: RootState) => state.auth);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      // First, attempt login
      await dispatch(loginAsync({ email, password })).unwrap();
      
      // If login succeeds, fetch user data
      try {
        await dispatch(fetchCurrentUser()).unwrap();
        toast.success('Login successful!');
        router.push('/');
      } catch (userFetchError: unknown) {
        console.error('Failed to fetch user data:', userFetchError);
        const errorMessage = userFetchError instanceof Error ? userFetchError.message : String(userFetchError);
        
        // If user fetch fails after successful login
        if (errorMessage.includes('Network') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('No response')) {
          toast.error('⚠️ Login successful but failed to load profile. Backend may be slow. Try refreshing the page.');
          console.log('💡 If this persists, try:');
          console.log('1. Check backend logs: cd backend && python run.py');
          console.log('2. Ensure port 8000 is not blocked');
          console.log('3. Restart both backend and frontend');
          // Still navigate to dashboard as login succeeded
          setTimeout(() => router.push('/'), 2000);
        } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          toast.error('Session expired. Please login again.');
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        } else {
          toast.error('Failed to load user profile. Please try again.');
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Login error:', error);
      
      // Provide specific error messages
      if (errorMessage.includes('Network') || errorMessage.includes('ECONNREFUSED')) {
        toast.error('⚠️ Cannot connect to backend. Ensure the server is running on http://localhost:8000');
      } else if (errorMessage.includes('401') || errorMessage.includes('Incorrect')) {
        toast.error('Invalid email or password');
      } else {
        toast.error(errorMessage || 'Login failed. Please check your credentials.');
      }
    }
  };

  return (
    <ProtectedRoute requireAuth={false}>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-5 sm:p-6 md:p-8">
        {/* Logo and Title */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 border-2 border-blue-400 rounded-full flex items-center justify-center">
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-blue-400 rounded-full"></div>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">EasyScan</h1>
          </div>
          <p className="text-gray-500 text-xs sm:text-sm">Smart Invoice Scanner</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className="flex-1 pb-3 text-sm font-medium text-blue-500 border-b-2 border-blue-500"
          >
            Login
          </button>
          <Link 
            href='/signup'
            className="flex-1 pb-3 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            Sign up
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSignIn} className="space-y-4">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me and Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500 disabled:cursor-not-allowed"
              />
              <span className="ml-2 text-sm text-gray-600">Remember me</span>
            </label>
            <button 
              type="button"
              onClick={() => console.log('Forgot password clicked')}
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              Forgot Password?
            </button>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2.5 rounded-md font-medium hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
      </div>
    </ProtectedRoute>
  );
}
