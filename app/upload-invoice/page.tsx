"use client"
import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, ExternalLink, Loader2, CheckCircle, XCircle } from 'lucide-react';
import ProtectedRoute from '@/component/ProtectedRoute';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import { processInvoiceImage, clearOCRResult } from '@/lib/features/ocrSlice';
import { createInvoiceAsync, fetchInvoices } from '@/lib/features/invoiceSlice';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

const UploadInvoicePage: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const dispatch = useDispatch<AppDispatch>();
  const { result: ocrResult, loading: ocrLoading, error: ocrError } = useSelector((state: RootState) => state.ocr);
  const { loading: invoiceLoading } = useSelector((state: RootState) => state.invoices);

  // Fetch recent invoices on mount
  useEffect(() => {
    dispatch(fetchInvoices({ limit: 5 }));
  }, [dispatch]);

  const recentInvoices = useSelector((state: RootState) => state.invoices.invoices.slice(0, 5));

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleFileSelect(files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, etc.)');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setShowPreview(false);
    dispatch(clearOCRResult());

    try {
      await dispatch(processInvoiceImage(file)).unwrap();
      setShowPreview(true);
      toast.success('Invoice processed successfully!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process invoice image';
      toast.error(errorMessage);
    }
  };

  const handleSaveInvoice = async () => {
    if (!ocrResult) {
      toast.error('No OCR result to save');
      return;
    }

    const extracted = ocrResult.extracted_fields;

    try {
      // Map OCR items to database format (convert unitPrice/totalPrice to rate/amount for backward compatibility)
      const mappedItems = extracted.items ? extracted.items.map((item: any) => ({
        description: item.description || '',
        qty: item.quantity || item.qty || 1,
        rate: item.unitPrice || item.rate || 0,
        amount: item.totalPrice || item.amount || 0,
      })) : null;

      // Debug: Log extracted fields to verify correct extraction
      console.log('Extracted fields from OCR:', {
        invoice_number: extracted.invoice_number,
        vendor: extracted.vendor,
        vendor_address: extracted.vendor_address,
        vendor_email: extracted.vendor_email,
        vendor_phone: extracted.vendor_phone,
      });

      // Ensure correct field mapping - validate and clean fields
      const invoiceData = {
        // Invoice number - must come from invoice_number field only
        invoice_number: extracted.invoice_number ? String(extracted.invoice_number).trim() : null,
        // Vendor name - must come from vendor field only (first line at top)
        vendor: extracted.vendor ? String(extracted.vendor).trim() : null,
        // Vendor address - must come from vendor_address field only (second line)
        vendor_address: extracted.vendor_address ? String(extracted.vendor_address).trim() : null,
        // Vendor email - must come from vendor_email field only (third line)
        vendor_email: extracted.vendor_email ? String(extracted.vendor_email).trim() : null,
        // Vendor phone - must come from vendor_phone field only (fourth line)
        vendor_phone: extracted.vendor_phone ? String(extracted.vendor_phone).trim() : null,
        bill_to_name: extracted.bill_to_name ? String(extracted.bill_to_name).trim() : null,
        bill_to_address: extracted.bill_to_address ? String(extracted.bill_to_address).trim() : null,
        invoice_date: extracted.invoice_date || extracted.date || null,
        due_date: extracted.due_date || null,
        purchase_order: extracted.purchase_order ? String(extracted.purchase_order).trim() : null,
        subtotal: extracted.subtotal || 0,
        tax: extracted.taxAmount || extracted.tax || 0,
        tax_amount: extracted.taxAmount || extracted.tax || 0,
        discount: extracted.discount || 0,
        total: extracted.total || 0,
        currency: extracted.currency || 'USD',
        status: 'Pending Review',
        raw_text: ocrResult.raw_text,
        extracted_fields: extracted,
        line_items: mappedItems,
        image_path: (ocrResult as any).image_path || null, // Include image path from OCR result
      };

      // Debug: Log final invoice data to verify mapping
      console.log('Final invoice data being saved:', {
        invoice_number: invoiceData.invoice_number,
        vendor: invoiceData.vendor,
        vendor_address: invoiceData.vendor_address,
        vendor_email: invoiceData.vendor_email,
        vendor_phone: invoiceData.vendor_phone,
      });

      const result = await dispatch(createInvoiceAsync(invoiceData)).unwrap();
      toast.success('Invoice saved successfully!');
      router.push(`/invoice-detailes?id=${result.id}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save invoice';
      toast.error(errorMessage);
    }
  };

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Upload Invoice</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Upload your invoice files for automatic data extraction using OCR technology
          </p>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 sm:p-8 lg:p-12 mb-6 sm:mb-8">
          <div
            className={`flex flex-col items-center justify-center ${dragActive ? 'opacity-60' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-teal-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
              {ocrLoading ? (
                <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-teal-600 animate-spin" />
              ) : (
                <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-teal-600" />
              )}
            </div>
            <p className="text-base sm:text-lg text-gray-900 font-medium mb-2 text-center">
              {ocrLoading ? 'Processing invoice...' : 'Drop files here or click to upload'}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 text-center">
              Upload your invoice files for processing
            </p>
            <button
              onClick={handleChooseFile}
              disabled={ocrLoading}
              className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white px-6 py-2 sm:px-8 sm:py-2.5 rounded-lg font-medium transition-colors text-sm sm:text-base disabled:cursor-not-allowed"
            >
              Choose Files
            </button>
          </div>
        </div>

        {/* OCR Results Preview */}
        {showPreview && ocrResult && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Extracted Data</h2>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-600 font-medium">Processed</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Vendor</p>
                <p className="text-base font-medium text-gray-900">
                  {ocrResult.extracted_fields.vendor || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Invoice Number</p>
                <p className="text-base font-medium text-gray-900">
                  {ocrResult.extracted_fields.invoice_number || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Date</p>
                <p className="text-base text-gray-900">
                  {ocrResult.extracted_fields.date || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                <p className="text-base font-medium text-gray-900">
                  {ocrResult.extracted_fields.total
                    ? `$${(ocrResult.extracted_fields.total || 0).toFixed(2)}`
                    : 'N/A'}
                </p>
              </div>
            </div>

            {ocrResult.extracted_fields.items && ocrResult.extracted_fields.items.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Line Items</p>
                <div className="space-y-2">
                  {ocrResult.extracted_fields.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-700">{item.description}</span>
                      <span className="font-medium text-gray-900">
                        ${(item.amount || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSaveInvoice}
                disabled={invoiceLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2.5 rounded-lg font-medium transition-colors text-sm disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {invoiceLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Invoice'
                )}
              </button>
              <button
                onClick={() => {
                  setShowPreview(false);
                  dispatch(clearOCRResult());
                  setSelectedFile(null);
                }}
                className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {ocrError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-600">{ocrError}</p>
            </div>
          </div>
        )}

        {/* File Requirements and Specifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* File Requirements */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">File Requirements</h2>
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">Supported Formats</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs sm:text-sm">PDF</span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs sm:text-sm">JPG</span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs sm:text-sm">JPEG</span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs sm:text-sm">PNG</span>
              </div>
            </div>
          </div>

          {/* File Specifications */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">File Specifications</h2>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600">
              <li>• Maximum file size: 10MB</li>
              <li>• Resolution: 300 DPI (recommended)</li>
              <li>• Color: readable text required</li>
            </ul>
          </div>
        </div>

        {/* Recent Uploads */}
        {recentInvoices.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Recent Invoices</h2>
            <div className="space-y-3 sm:space-y-4">
              {recentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-3 sm:gap-0 cursor-pointer"
                  onClick={() => router.push(`/invoice-detailes?id=${invoice.id}`)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-lg flex items-center justify-center bg-teal-100">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base font-medium text-gray-900 truncate">
                        {invoice.invoice_number || 'Unnamed Invoice'}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {invoice.vendor || 'No vendor'} • {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 sm:ml-4">
                    <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${
                      invoice.status === 'Processed'
                        ? 'bg-green-100 text-green-700'
                        : invoice.status === 'Pending Review'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {invoice.status}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/invoice-detailes?id=${invoice.id}`);
                      }}
                      className="text-teal-600 hover:text-teal-700 transition-colors shrink-0"
                    >
                      <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </ProtectedRoute>
  );
};

export default UploadInvoicePage;
