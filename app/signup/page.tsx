"use client"
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import ProtectedRoute from '@/component/ProtectedRoute';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import { signupAsync } from '@/lib/features/authSlice';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

export default function RegisterForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, isAuthenticated } = useSelector((state: RootState) => state.auth);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !email || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (!agreeToTerms) {
      toast.error('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    try {
      await dispatch(signupAsync({ full_name: fullName, email, password })).unwrap();
      toast.success('Account created successfully! Please login.');
      router.push('/login');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Signup error:', error);
      
      // Provide specific error messages
      if (errorMessage.includes('Network') || errorMessage.includes('ECONNREFUSED')) {
        toast.error('⚠️ Cannot connect to backend. Ensure the server is running on http://localhost:8000');
      } else if (errorMessage.includes('already exists') || errorMessage.includes('409')) {
        toast.error('Email already registered. Please login or use a different email.');
      } else {
        toast.error(errorMessage || 'Failed to create account. Please try again.');
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
        <div className="flex border-b border-gray-200 mb-5 sm:mb-6">
          <Link 
            href='/login'
            className="flex-1 pb-2.5 sm:pb-3 text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            Login
          </Link>
          <button
            className="flex-1 pb-2.5 sm:pb-3 text-xs sm:text-sm font-medium text-blue-500 border-b-2 border-blue-500"
          >
            Sign up
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleCreateAccount} className="space-y-3.5 sm:space-y-4">
          {/* Full Name Field */}
          <div>
            <label htmlFor="fullName" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
              disabled={loading}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
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
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
                disabled={loading}
                minLength={6}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                disabled={loading}
                minLength={6}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-start">
            <input
              type="checkbox"
              id="terms"
              checked={agreeToTerms}
              onChange={(e) => setAgreeToTerms(e.target.checked)}
              disabled={loading}
              required
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500 mt-0.5 disabled:cursor-not-allowed"
            />
            <label htmlFor="terms" className="ml-2 text-xs sm:text-sm text-gray-600 cursor-pointer">
              I agree to the{' '}
              <button 
                type="button"
                onClick={() => console.log('Terms clicked')}
                className="text-blue-500 hover:text-blue-600"
              >
                Terms of Service
              </button>
              {' '}and{' '}
              <button 
                type="button"
                onClick={() => console.log('Privacy clicked')}
                className="text-blue-500 hover:text-blue-600"
              >
                Privacy Policy
              </button>
            </label>
          </div>

          {/* Create Account Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 sm:py-2.5 rounded-md text-sm sm:text-base font-medium hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>
      </div>
      </div>
    </ProtectedRoute>
  );
}
