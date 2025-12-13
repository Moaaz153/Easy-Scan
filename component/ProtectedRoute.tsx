"use client"
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/lib/store';
import { fetchCurrentUser } from '@/lib/features/authSlice';
import { isAuthenticated } from '@/services/authApi';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean; // If true, requires auth. If false, redirects if authenticated
}

export default function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated: authState, loading, user } = useSelector((state: RootState) => state.auth);
  const [isMounted, setIsMounted] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  // Only check authentication after component mounts (client-side only)
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      setHasToken(isAuthenticated());
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const checkAuth = async () => {
      // If we have a token but no user data, fetch it
      if (hasToken && !user && !loading) {
        try {
          await dispatch(fetchCurrentUser()).unwrap();
        } catch {
          // Token is invalid, will be handled by redirect logic
        }
      }

      // Handle redirects based on auth state
      if (requireAuth) {
        // Protected route - redirect to login if not authenticated
        if (!hasToken || (!authState && !loading)) {
          router.push('/login');
        }
      } else {
        // Public route (login/signup) - redirect to dashboard if authenticated
        if (hasToken && authState) {
          router.push('/');
        }
      }
    };

    checkAuth();
  }, [isMounted, hasToken, authState, user, loading, requireAuth, router, dispatch]);

  // Don't render anything until mounted to prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  // Show loading while checking auth
  if (loading || (hasToken && !user && requireAuth)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  // If requireAuth is true and not authenticated, don't render children (will redirect)
  if (requireAuth && !hasToken && !authState) {
    return null;
  }

  // If requireAuth is false and authenticated, don't render children (will redirect)
  if (!requireAuth && hasToken && authState) {
    return null;
  }

  return <>{children}</>;
}

