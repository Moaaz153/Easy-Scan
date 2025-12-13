"use client"
import Navbar from "@/component/navbar";
import ProtectedRoute from "@/component/ProtectedRoute";
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import { fetchCurrentUser } from '@/lib/features/authSlice';
import { Upload, Search, Bell, FileText, AlertTriangle, Calendar, TrendingUp } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
export default function Home() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Fetch user data if not already loaded
    if (!user) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, user]);

  interface StatCard {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  subtitleColor: string;
}

interface Activity {
  invoiceNumber: string;
  vendor: string;
  date: string;
  amount: string;
  status: 'Received' | 'Pending' | 'Error';
  actions: string[];
}


  const monthlyData = [
    { month: 'Jan', volume: 85 },
    { month: 'Feb', volume: 95 },
    { month: 'Mar', volume: 120 },
    { month: 'Apr', volume: 145 },
    { month: 'May', volume: 165 },
    { month: 'Jun', volume: 190 },
    { month: 'Jul', volume: 185 },
    { month: 'Aug', volume: 210 },
    { month: 'Sep', volume: 225 },
    { month: 'Oct', volume: 240 },
    { month: 'Nov', volume: 220 },
    { month: 'Dec', volume: 200 }
  ];

  const spendData = [
    { month: 'Jan', amount: 35 },
    { month: 'Feb', amount: 42 },
    { month: 'Mar', amount: 48 },
    { month: 'Apr', amount: 55 },
    { month: 'May', amount: 65 },
    { month: 'Jun', amount: 72 },
    { month: 'Jul', amount: 80 },
    { month: 'Aug', amount: 88 },
    { month: 'Sep', amount: 95 },
    { month: 'Oct', amount: 105 },
    { month: 'Nov', amount: 98 },
    { month: 'Dec', amount: 85 }
  ];

  const stats: StatCard[] = [
    {
      title: 'Total Invoices',
      value: '1,247',
      subtitle: '+2% from last month',
      icon: <FileText className="w-5 h-5 text-teal-600" />,
      iconBg: 'bg-teal-100',
      subtitleColor: 'text-green-600'
    },
    {
      title: 'Pending Review',
      value: '23',
      subtitle: 'Requires attention',
      icon: <AlertTriangle className="w-5 h-5 text-orange-600" />,
      iconBg: 'bg-orange-100',
      subtitleColor: 'text-orange-600'
    },
    {
      title: 'This Month',
      value: '189',
      subtitle: '8% increase',
      icon: <Calendar className="w-5 h-5 text-teal-600" />,
      iconBg: 'bg-teal-100',
      subtitleColor: 'text-green-600'
    },
    {
      title: 'Total Amount',
      value: '$47,892',
      subtitle: 'Current month',
      icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
      iconBg: 'bg-blue-100',
      subtitleColor: 'text-blue-600'
    }
  ];

  const recentActivity: Activity[] = [
    {
      invoiceNumber: 'INV-2024-001',
      vendor: 'TechCorp Solutions',
      date: 'Nov 3, 2024',
      amount: '$2,450.00',
      status: 'Received',
      actions: ['View', 'Download']
    },
    {
      invoiceNumber: 'INV-2024-002',
      vendor: 'Office Supplies Co.',
      date: 'Nov 2, 2024',
      amount: '$189.50',
      status: 'Pending',
      actions: ['Review', 'Edit']
    },
    {
      invoiceNumber: 'INV-2024-003',
      vendor: 'Digital Marketing Ltd.',
      date: 'Nov 1, 2024',
      amount: '$5,200.00',
      status: 'Received',
      actions: ['View', 'Download']
    },
    {
      invoiceNumber: 'INV-2024-004',
      vendor: 'Cloud Services Inc.',
      date: 'Oct 31, 2024',
      amount: '$899.99',
      status: 'Error',
      actions: ['Fix', 'Retry']
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Received':
        return 'bg-green-100 text-green-700';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'Error':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };
  return (
    <>
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">
              Welcome back{user ? `, ${user.full_name}` : ""}! Here&apos;s your invoice processing overview
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/upload-invoice" className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm">
              <Upload className="w-4 h-4" />
              Upload Invoice
            </a>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Search className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.iconBg} p-2 sm:p-3 rounded-lg`}>
                  {stat.icon}
                </div>
              </div>
              <p className={`text-xs sm:text-sm ${stat.subtitleColor}`}>{stat.subtitle}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly Invoice Volume */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Monthly Invoice Volume</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="volume" fill="#14b8a6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Total Spend Trend */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Total Spend Trend</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={spendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                  tickFormatter={(value) => `$${value}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => [`$${value}k`, 'Amount']}
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Recent Activity</h2>
            <p className="text-sm text-gray-600 mt-1">Your 4 most recently processed invoices</p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-xs font-medium text-gray-600 uppercase">Invoice Number</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-gray-600 uppercase">Vendor</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-gray-600 uppercase">Date</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-gray-600 uppercase">Amount</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-gray-600 uppercase">Status</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((activity, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-2 text-sm font-medium text-gray-900">{activity.invoiceNumber}</td>
                    <td className="py-4 px-2 text-sm text-gray-700">{activity.vendor}</td>
                    <td className="py-4 px-2 text-sm text-gray-600">{activity.date}</td>
                    <td className="py-4 px-2 text-sm font-medium text-gray-900">{activity.amount}</td>
                    <td className="py-4 px-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                        {activity.status}
                      </span>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex gap-2">
                        {activity.actions.map((action, idx) => (
                          <button
                            key={idx}
                            className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                          >
                            {action}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
        </div>
      </ProtectedRoute>
    </>
  );
}
