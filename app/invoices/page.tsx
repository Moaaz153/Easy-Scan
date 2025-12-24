"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Filter, Download, Eye, FileText, AlertCircle, Clock, CheckCircle, ChevronLeft, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import ProtectedRoute from '@/component/ProtectedRoute';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import { fetchInvoices, deleteInvoiceAsync } from '@/lib/features/invoiceSlice';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { formatDate, formatCurrency, getVendorInitials } from '@/utiles/helpers';

const InvoicesListPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All Statuses');
  const [limit] = useState(25);
  const router = useRouter();

  const dispatch = useDispatch<AppDispatch>();
  const { invoices, loading, error } = useSelector((state: RootState) => state.invoices);

  const loadInvoices = useCallback(async () => {
    try {
      const params: Record<string, string | number> = {
        skip: (currentPage - 1) * limit,
        limit: limit,
      };

      if (statusFilter !== 'All Statuses') {
        params.status = statusFilter;
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      await dispatch(fetchInvoices(params)).unwrap();
    } catch (error: unknown) {
      toast.error('Failed to load invoices');
    }
  }, [currentPage, limit, statusFilter, searchQuery, dispatch]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await dispatch(deleteInvoiceAsync(id)).unwrap();
        toast.success('Invoice deleted successfully');
        loadInvoices();
      } catch (error: unknown) {
        toast.error('Failed to delete invoice');
      }
    }
  };

  // Status colors must match invoice-detailes page
  // Allowed statuses: Paid, Rejected, Pending Review, Draft
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-700';
      case 'Pending Review':
        return 'bg-yellow-100 text-yellow-700';
      case 'Rejected':
        return 'bg-red-100 text-red-700';
      case 'Draft':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getLogoColor = (vendor: string | null) => {
    if (!vendor) return 'bg-gray-100 text-gray-700';
    const colors = [
      'bg-teal-100 text-teal-700',
      'bg-blue-100 text-blue-700',
      'bg-purple-100 text-purple-700',
      'bg-pink-100 text-pink-700',
      'bg-orange-100 text-orange-700'
    ];
    // Use vendor name to consistently get same color
    const index = vendor.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const toggleSelectAll = () => {
    if (selectedInvoices.length === invoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(invoices.map(inv => inv.id));
    }
  };

  const toggleSelectInvoice = (id: string) => {
    if (selectedInvoices.includes(id)) {
      setSelectedInvoices(selectedInvoices.filter(invId => invId !== id));
    } else {
      setSelectedInvoices([...selectedInvoices, id]);
    }
  };

  // Calculate stats
  // Top 4 cards should match statuses in invoice-detailes (Paid, Rejected, Pending Review), excluding Draft
  const stats = {
    total: invoices.length,
    paid: invoices.filter(inv => inv.status === 'Paid').length,
    pending: invoices.filter(inv => inv.status === 'Pending Review').length,
    rejected: invoices.filter(inv => inv.status === 'Rejected').length,
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="text-sm text-gray-600 mt-1">Manage and track all your processed invoices</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/upload-invoice"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Invoice
            </a>
            {/* <button className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200">
              <img 
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" 
                alt="User"
                className="w-full h-full object-cover"
              />
            </button> */}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Invoices</p>
              <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-teal-600" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Paid</p>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.paid}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Pending Review</p>
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.pending}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Rejected</p>
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.rejected}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Invoices</label>
              <input
                type="text"
                placeholder="Search by invoice number, vendor..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option>All Statuses</option>
                <option>Paid</option>
                <option>Pending Review</option>
                <option>Rejected</option>
                <option>Draft</option>
              </select>
            </div>
          </div>
        </div>

        {/* Recent Invoices Table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Invoices</h2>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filter
              </button>
              <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-600">{error}</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No invoices found</p>
              <a href="/upload-invoice" className="text-teal-600 hover:text-teal-700 mt-2 inline-block">
                Upload your first invoice
              </a>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="py-3 px-4 text-left">
                        <input
                          type="checkbox"
                          checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase">Invoice #</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase">Vendor</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase">Amount</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr
                        key={invoice.id}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/invoice-detailes?id=${invoice.id}`)}
                      >
                        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedInvoices.includes(invoice.id)}
                            onChange={() => toggleSelectInvoice(invoice.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-4 px-4 text-sm font-medium text-gray-900">
                          {invoice.invoice_number || 'N/A'}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold ${getLogoColor(invoice.vendor)}`}>
                              {getVendorInitials(invoice.vendor)}
                            </div>
                            <span className="text-sm text-gray-900">{invoice.vendor || 'Unknown Vendor'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {formatDate(invoice.invoice_date)}
                        </td>
                        <td className="py-4 px-4 text-sm font-medium text-gray-900">
                          {formatCurrency(invoice.total, invoice.currency)}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/invoice-detailes?id=${invoice.id}`)}
                              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                            >
                              <Eye className="w-4 h-4 text-blue-600" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(invoice.id, e)}
                              className="p-1.5 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden divide-y divide-gray-100">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/invoice-detailes?id=${invoice.id}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedInvoices.includes(invoice.id)}
                          onChange={() => toggleSelectInvoice(invoice.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-1"
                        />
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold ${getLogoColor(invoice.vendor)}`}>
                          {getVendorInitials(invoice.vendor)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {invoice.vendor || 'Unknown Vendor'}
                          </p>
                          <p className="text-xs text-gray-600">{invoice.invoice_number || 'N/A'}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(invoice.id, e);
                        }}
                        className="p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-600">{formatDate(invoice.invoice_date)}</span>
                      <span className="text-sm font-bold text-gray-900">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/invoice-detailes?id=${invoice.id}`);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      >
                        <Eye className="w-4 h-4 text-blue-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {invoices.length > 0 && (
            <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Show</span>
                <select className="px-2 py-1 border border-gray-300 rounded text-sm" value={limit} disabled>
                  <option>25</option>
                  <option>50</option>
                  <option>100</option>
                </select>
                <span>per page</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 mr-2">
                  {((currentPage - 1) * limit) + 1}-{Math.min(currentPage * limit, invoices.length)} of {invoices.length} results
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={invoices.length < limit}
                  className="p-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </ProtectedRoute>
  );
};

export default InvoicesListPage;
