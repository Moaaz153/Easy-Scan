"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { ArrowLeft, Save, Plus, Trash2, Loader2 } from 'lucide-react';
import ProtectedRoute from '@/component/ProtectedRoute';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import { fetchInvoiceById, updateInvoiceAsync } from '@/lib/features/invoiceSlice';
import { toast } from 'react-toastify';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDate, formatCurrency } from '@/utiles/helpers';
import { InvoiceUpdate } from '@/services/invoiceApi';
import Link from 'next/link';

interface LineItem {
  id: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
}

const InvoiceDetailPageContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get('id');

  const dispatch = useDispatch<AppDispatch>();
  const { currentInvoice, loading, error } = useSelector((state: RootState) => state.invoices);

  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [invoiceData, setInvoiceData] = useState({
    invoice_number: '',
    invoice_date: '',
    due_date: '',
    purchase_order: '',
    vendor: '',
    vendor_address: '',
    vendor_email: '',
    vendor_phone: '',
    bill_to_name: '',
    bill_to_address: '',
    subtotal: 0,
    tax: 0,
    discount: 0,
    total: 0,
    status: 'Pending Review',
  });
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Track if component is mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);
    setIsClient(true);
  }, []);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  useEffect(() => {
    if (invoiceId) {
      dispatch(fetchInvoiceById(invoiceId));
    } else {
      toast.error('Invoice ID is required');
      router.push('/invoices');
    }
  }, [invoiceId, dispatch, router]);

  useEffect(() => {
    if (currentInvoice) {
      // Debug: Log invoice data to verify correct field mapping
      console.log('Loading invoice data:', {
        invoice_number: currentInvoice.invoice_number,
        vendor: currentInvoice.vendor,
        vendor_address: currentInvoice.vendor_address,
        vendor_email: currentInvoice.vendor_email,
        vendor_phone: currentInvoice.vendor_phone,
      });

      setInvoiceData({
        invoice_number: currentInvoice.invoice_number || '',
        invoice_date: currentInvoice.invoice_date ? currentInvoice.invoice_date.split('T')[0] : '',
        due_date: currentInvoice.due_date ? currentInvoice.due_date.split('T')[0] : '',
        purchase_order: currentInvoice.purchase_order || '',
        vendor: currentInvoice.vendor || '',
        vendor_address: currentInvoice.vendor_address || '',
        vendor_email: currentInvoice.vendor_email || '',
        vendor_phone: currentInvoice.vendor_phone || '',
        bill_to_name: currentInvoice.bill_to_name || '',
        bill_to_address: currentInvoice.bill_to_address || '',
        subtotal: currentInvoice.subtotal,
        tax: currentInvoice.tax_amount || currentInvoice.tax || 0,
        discount: currentInvoice.discount,
        total: currentInvoice.total,
        status: currentInvoice.status || 'Pending Review',
      });

      // Load line items (support both old format qty/rate/amount and new format quantity/unitPrice/totalPrice)
      if (currentInvoice.line_items && currentInvoice.line_items.length > 0) {
        setLineItems(
          currentInvoice.line_items.map((item: any, index) => ({
            id: `item-${index}`,
            description: item.description || '',
            qty: item.quantity || item.qty || 1,
            rate: item.unitPrice || item.rate || 0,
            amount: item.totalPrice || item.amount || 0,
          }))
        );
      } else {
        setLineItems([]);
      }

      // Load image if available (only on client-side)
      if (currentInvoice.image_path && isMounted && typeof window !== 'undefined') {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const token = localStorage.getItem('access_token');
        // Fetch image with auth token and convert to blob URL
        fetch(`${API_BASE_URL}/api/invoices/${invoiceId}/image`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
          .then(response => {
            if (response.ok) {
              return response.blob();
            }
            throw new Error('Failed to load image');
          })
          .then(blob => {
            const url = URL.createObjectURL(blob);
            setImageUrl(url);
          })
          .catch(error => {
            console.error('Error loading image:', error);
            setImageUrl(null);
          });
      } else if (!currentInvoice.image_path) {
        setImageUrl(null);
      }
    }
  }, [currentInvoice, invoiceId, isMounted]);

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateTotal = () => {
    const subtotal = invoiceData.subtotal || calculateSubtotal();
    const tax = invoiceData.tax || 0;
    const discount = invoiceData.discount || 0;
    return subtotal + tax - discount;
  };

  const addLineItem = () => {
    // Use a more stable ID generation that works on both server and client
    const newItem: LineItem = {
      id: `item-${lineItems.length}-${Math.random().toString(36).substr(2, 9)}`,
      description: '',
      qty: 1,
      rate: 0,
      amount: 0
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'qty' || field === 'rate') {
          updated.amount = updated.qty * updated.rate;
        }
        return updated;
      }
      return item;
    }));
  };

  const handleSave = async () => {
    if (!invoiceId) return;

    setSaving(true);
    try {
      // Use manual values if set, otherwise calculate
      const subtotal = invoiceData.subtotal || calculateSubtotal();
      const total = invoiceData.total || calculateTotal();

      // Convert empty strings to null for date fields and other optional fields
      // Create properly typed update data object
      const updateData: InvoiceUpdate = {
        invoice_number: invoiceData.invoice_number === '' ? null : invoiceData.invoice_number,
        invoice_date: invoiceData.invoice_date === '' ? null : invoiceData.invoice_date,
        due_date: invoiceData.due_date === '' ? null : invoiceData.due_date,
        purchase_order: invoiceData.purchase_order === '' ? null : invoiceData.purchase_order,
        vendor: invoiceData.vendor === '' ? null : invoiceData.vendor,
        vendor_address: invoiceData.vendor_address === '' ? null : invoiceData.vendor_address,
        vendor_email: invoiceData.vendor_email === '' ? null : invoiceData.vendor_email,
        vendor_phone: invoiceData.vendor_phone === '' ? null : invoiceData.vendor_phone,
        bill_to_name: invoiceData.bill_to_name === '' ? null : invoiceData.bill_to_name,
        bill_to_address: invoiceData.bill_to_address === '' ? null : invoiceData.bill_to_address,
        subtotal: subtotal,
        tax: invoiceData.tax,
        tax_amount: invoiceData.tax,
        discount: invoiceData.discount,
        total: total,
        status: invoiceData.status,
        line_items: lineItems.map(item => ({
          description: item.description,
          qty: item.qty,
          rate: item.rate,
          amount: item.amount,
        })),
      };

      await dispatch(updateInvoiceAsync({ id: invoiceId, invoice: updateData })).unwrap();
      toast.success('Invoice updated successfully!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update invoice';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setInvoiceData(prev => ({ ...prev, [field]: value }));
  };

  if (loading && !currentInvoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error && !currentInvoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/invoices')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  if (!currentInvoice) {
    return null;
  }

  // Define status options - ONLY these four states are allowed
  const statusOptions = [
    'Paid',
    'Rejected',
    'Pending Review',
    'Draft'
  ] as const;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/invoices')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Invoice {invoiceData.invoice_number || 'N/A'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              invoiceData.status === 'Paid'
                ? 'bg-green-100 text-green-700'
                : invoiceData.status === 'Rejected'
                ? 'bg-red-100 text-red-700'
                : invoiceData.status === 'Pending Review'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {invoiceData.status}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Invoice Image */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 sticky top-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Invoice Document</h3>
              
              {imageUrl ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  <img
                    src={imageUrl}
                    alt="Invoice"
                    className="w-full h-auto object-contain max-h-[600px]"
                    style={{
                      display: 'block'
                    }}
                    onError={(e) => {
                      console.error('Failed to load invoice image:', imageUrl);
                      setImageUrl(null);
                      toast.error('Failed to load invoice image');
                    }}
                  />
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-8 bg-gray-50 flex items-center justify-center min-h-[300px]">
                  <p className="text-gray-500 text-sm">No image available</p>
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Editable Invoice Data */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              {/* Invoice Information */}
              <div className="mb-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Invoice Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                    <input
                      type="text"
                      value={invoiceData.invoice_number}
                      onChange={(e) => handleInputChange('invoice_number', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={invoiceData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-800"
                    >
                      {statusOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                    <input
                      type="date"
                      value={invoiceData.invoice_date}
                      onChange={(e) => handleInputChange('invoice_date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={invoiceData.due_date}
                      onChange={(e) => handleInputChange('due_date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-800"
                    />
                  </div>
                  <div>
                    {/* <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Order</label>
                    <input
                      type="text"
                      value={invoiceData.purchase_order}
                      onChange={(e) => handleInputChange('purchase_order', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    /> */}
                  </div>
                </div>
              </div>

              {/* Vendor Information */}
              <div className="mb-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Vendor Information</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                    <input
                      type="text"
                      value={invoiceData.vendor}
                      onChange={(e) => handleInputChange('vendor', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                      value={invoiceData.vendor_address}
                      onChange={(e) => handleInputChange('vendor_address', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-800 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={invoiceData.vendor_email}
                        onChange={(e) => handleInputChange('vendor_email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-800"
                      />
                    </div> */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={invoiceData.vendor_phone}
                        onChange={(e) => handleInputChange('vendor_phone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-800"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bill To Information */}
              {/* <div className="mb-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Bill To</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bill To Name</label>
                    <input
                      type="text"
                      value={invoiceData.bill_to_name}
                      onChange={(e) => handleInputChange('bill_to_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bill To Address</label>
                    <textarea
                      value={invoiceData.bill_to_address}
                      onChange={(e) => handleInputChange('bill_to_address', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-800 resize-none"
                    />
                  </div>
                </div>
              </div> */}

              {/* Line Items */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900">Line Items</h3>
                  <button
                    onClick={addLineItem}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 text-xs font-medium text-gray-600 uppercase">Description</th>
                        <th className="text-left py-3 px-2 text-xs font-medium text-gray-600 uppercase w-20">Qty</th>
                        <th className="text-left py-3 px-2 text-xs font-medium text-gray-600 uppercase w-28">unitPrice</th>
                        <th className="text-left py-3 px-2 text-xs font-medium text-gray-600 uppercase w-28">Amount</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100">
                          <td className="py-3 px-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <input
                              type="number"
                              value={item.qty}
                              onChange={(e) => updateLineItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <input
                              type="number"
                              step="0.01"
                              value={item.rate}
                              onChange={(e) => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <input
                              type="text"
                              value={isClient ? formatCurrency(item.amount, currentInvoice.currency) : `$${item.amount.toFixed(2)}`}
                              readOnly
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-800 bg-gray-50"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <button
                              onClick={() => removeLineItem(item.id)}
                              className="p-1 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Section - At the bottom */}
              <div className="mb-6 pt-6 border-t border-gray-200">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Summary</h3>
                <div className="space-y-3 max-w-md ml-auto">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Subtotal</span>
                    <input
                      type="number"
                      step="0.01"
                      value={invoiceData.subtotal}
                      onChange={(e) => handleInputChange('subtotal', parseFloat(e.target.value) || 0)}
                      className="w-32 px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-800 text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Tax / VAT</span>
                    <input
                      type="number"
                      step="0.01"
                      value={invoiceData.tax}
                      onChange={(e) => handleInputChange('tax', parseFloat(e.target.value) || 0)}
                      className="w-32 px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-800 text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Discount</span>
                    <input
                      type="number"
                      step="0.01"
                      value={invoiceData.discount}
                      onChange={(e) => handleInputChange('discount', parseFloat(e.target.value) || 0)}
                      className="w-32 px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-800 text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <input
                      type="number"
                      step="0.01"
                      value={invoiceData.total}
                      onChange={(e) => handleInputChange('total', parseFloat(e.target.value) || 0)}
                      className="w-32 px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-800 text-right font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                <Link
                  href="/invoices"
                  onClick={handleSave}
                  // disabled={saving}
                  className="flex-1 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Invoice
                    </>
                  )}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </ProtectedRoute>
  );
};

const InvoiceDetailPage: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    }>
      <InvoiceDetailPageContent />
    </Suspense>
  );
};

export default InvoiceDetailPage;
