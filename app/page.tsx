"use client"
import ProtectedRoute from "@/component/ProtectedRoute";
import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import { fetchCurrentUser } from '@/lib/features/authSlice';
import { fetchInvoices } from '@/lib/features/invoiceSlice';
import { Upload, Search, Bell, FileText, AlertTriangle, Calendar, TrendingUp, Loader2 } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useRouter } from 'next/navigation';
import { formatDate, formatCurrency } from '@/utiles/helpers';

export default function Home() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const { 
    invoices,
    loading,
    error,
  } = useSelector((state: RootState) => state.invoices);

  useEffect(() => {
    // Fetch user data if not already loaded
    if (!user) {
      dispatch(fetchCurrentUser());
    }
    // Fetch invoices for dashboard (we'll derive stats & charts on the frontend)
    dispatch(fetchInvoices());
  }, [dispatch, user]);

  interface StatCard {
    title: string;
    value: string;
    subtitle: string;
    icon: React.ReactNode;
    iconBg: string;
    subtitleColor: string;
  }

  // Format stats from invoices (computed on frontend)
  const stats: StatCard[] = useMemo(() => {
    const totalInvoices = invoices.length;
    const pendingReview = invoices.filter(inv => inv.status === 'Pending Review').length;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthInvoices = invoices.filter(inv => {
      if (!inv.created_at) return false;
      const d = new Date(inv.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const thisMonthCount = thisMonthInvoices.length;
    const thisMonthTotal = thisMonthInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Simple month change: compare this month count to previous month
    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();

    const prevMonthCount = invoices.filter(inv => {
      if (!inv.created_at) return false;
      const d = new Date(inv.created_at);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    }).length;

    let monthChangePercent = 0;
    if (prevMonthCount > 0) {
      monthChangePercent = Math.round(((thisMonthCount - prevMonthCount) / prevMonthCount) * 100);
    }

    const monthChangeText = monthChangePercent >= 0 
      ? `+${monthChangePercent}% from last month`
      : `${monthChangePercent}% from last month`;

    return [
      {
        title: 'Total Invoices',
        value: totalInvoices.toLocaleString(),
        subtitle: 'All time',
        icon: <FileText className="w-5 h-5 text-teal-600" />,
        iconBg: 'bg-teal-100',
        subtitleColor: 'text-gray-600'
      },
      {
        title: 'Pending Review',
        value: pendingReview.toString(),
        subtitle: 'Requires attention',
        icon: <AlertTriangle className="w-5 h-5 text-orange-600" />,
        iconBg: 'bg-orange-100',
        subtitleColor: 'text-orange-600'
      },
      {
        title: 'This Month',
        value: thisMonthCount.toString(),
        subtitle: monthChangeText,
        icon: <Calendar className="w-5 h-5 text-teal-600" />,
        iconBg: 'bg-teal-100',
        subtitleColor: monthChangePercent >= 0 ? 'text-green-600' : 'text-red-600'
      },
      {
        title: 'Total Amount',
        value: formatCurrency(thisMonthTotal),
        subtitle: 'Current month',
        icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
        iconBg: 'bg-blue-100',
        subtitleColor: 'text-blue-600'
      }
    ];
  }, [invoices]);

  // Format chart data from invoices (last 12 months)
  const monthlyData = useMemo(() => {
    const map = new Map<string, number>();
    const now = new Date();

    // Initialize last 12 months with 0
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      map.set(key, 0);
    }

    invoices.forEach(inv => {
      if (!inv.created_at) return;
      const d = new Date(inv.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (map.has(key)) {
        map.set(key, (map.get(key) || 0) + 1);
      }
    });

    return Array.from(map.entries()).map(([key, volume]) => {
      const [yearStr, monthStr] = key.split('-');
      const year = parseInt(yearStr, 10);
      const monthIndex = parseInt(monthStr, 10);
      const label = new Date(year, monthIndex, 1).toLocaleString('en-US', { month: 'short' });
      return { month: label, volume };
    });
  }, [invoices]);

  const spendData = useMemo(() => {
    const map = new Map<string, number>();
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      map.set(key, 0);
    }

    invoices.forEach(inv => {
      if (!inv.created_at) return;
      const d = new Date(inv.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (map.has(key)) {
        map.set(key, (map.get(key) || 0) + (inv.total || 0));
      }
    });

    return Array.from(map.entries()).map(([key, amount]) => {
      const [yearStr, monthStr] = key.split('-');
      const year = parseInt(yearStr, 10);
      const monthIndex = parseInt(monthStr, 10);
      const label = new Date(year, monthIndex, 1).toLocaleString('en-US', { month: 'short' });
      // Convert to thousands for display to match chart format
      return { month: label, amount: amount / 1000 };
    });
  }, [invoices]);

  // Format recent activity from invoices
  const recentActivity = useMemo(() => {
    if (!invoices || invoices.length === 0) {
      return [];
    }
    return invoices.slice(0, 4).map(invoice => ({
      id: invoice.id,
      invoiceNumber: invoice.invoice_number || 'N/A',
      vendor: invoice.vendor || 'Unknown Vendor',
      date: formatDate(invoice.created_at),
      amount: formatCurrency(invoice.total, invoice.currency),
      status: invoice.status === 'Paid' ? 'Received' as const : 
              invoice.status === 'Pending Review' ? 'Pending' as const :
              invoice.status === 'Rejected' ? 'Error' as const : 'Pending' as const,
      actions: invoice.status === 'Paid' ? ['View', 'Download'] : 
               invoice.status === 'Pending Review' ? ['Review', 'Edit'] :
               ['View', 'Edit']
    }));
  }, [invoices]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Received':
      case 'Paid':
        return 'bg-green-100 text-green-700';
      case 'Pending':
      case 'Pending Review':
        return 'bg-yellow-100 text-yellow-700';
      case 'Error':
      case 'Rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleViewInvoice = (invoiceId: string) => {
    router.push(`/invoice-detailes?id=${invoiceId}`);
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
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            <span className="ml-3 text-gray-600">Loading dashboard data...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        {!loading && (
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
        )}

        {/* Charts */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Monthly Invoice Volume */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Monthly Invoice Volume</h2>
              {monthlyData.length > 0 ? (
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
              ) : (
                <div className="flex items-center justify-center h-[250px] text-gray-500">
                  No data available
                </div>
              )}
            </div>

            {/* Total Spend Trend */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Total Spend Trend</h2>
              {spendData.length > 0 ? (
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
              ) : (
                <div className="flex items-center justify-center h-[250px] text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Recent Activity</h2>
            <p className="text-sm text-gray-600 mt-1">Your 4 most recently processed invoices</p>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
              <span className="ml-3 text-gray-600">Loading recent invoices...</span>
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No invoices yet</p>
              <a href="/upload-invoice" className="text-teal-600 hover:text-teal-700 mt-2 inline-block">
                Upload your first invoice
              </a>
            </div>
          ) : (
            /* Table */
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
                  {recentActivity.map((activity) => (
                    <tr key={activity.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => handleViewInvoice(activity.id)}>
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
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewInvoice(activity.id);
                            }}
                            className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
        </div>
      </ProtectedRoute>
    </>
  );
}
