"use client"
import React from 'react';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/lib/store';
import { logoutAsync } from '@/lib/features/authSlice';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

const Navbar: React.FC = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const handleLogout = async () => {
    try {
      await dispatch(logoutAsync()).unwrap();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch {
      toast.error('Failed to logout');
      // Still redirect even if API call fails
      router.push('/login');
    }
  };

  // Don't show navbar on login/signup pages
  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Logo Section */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <span className="text-gray-900 font-semibold text-lg">EasyScan</span>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-8">
          <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
            Dashboard
          </Link>
          <Link href="/upload-invoice" className="text-gray-600 hover:text-teal-600 transition-colors font-medium">
            Upload
          </Link>
          <Link href="/invoices" className="text-gray-600 hover:text-gray-900 transition-colors">
            Invoices
          </Link>
        </div>

        {/* Right Section - User Info and Logout */}
        <div className="flex items-center gap-4">
          {/* User Name */}
          {user && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                <span className="text-teal-600 font-semibold text-sm">
                  {user.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                {user.full_name}
              </span>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 text-gray-600 hover:text-gray-900"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline text-sm">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
