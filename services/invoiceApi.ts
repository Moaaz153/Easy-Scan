/**
 * Invoice API Service
 * All API calls related to invoices
 */
import apiClient from './api';
import { AxiosResponse } from 'axios';

// Types matching backend response
export interface ExtractedFields {
  vendor?: string | null;
  vendor_address?: string | null;
  vendor_email?: string | null;
  vendor_phone?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  date?: string | null; // Legacy field, maps to invoice_date
  due_date?: string | null;
  bill_to_name?: string | null;
  bill_to_address?: string | null;
  total?: number | null;
  subtotal?: number | null;
  tax?: number | null;
  taxAmount?: number | null;
  discount?: number | null;
  currency?: string;
  items?: Array<{
    description: string;
    quantity?: number;
    qty?: number; // Legacy field
    unitPrice?: number;
    rate?: number; // Legacy field
    totalPrice?: number;
    amount?: number; // Legacy field
  }>;
  purchase_order?: string | null;
}

export interface OCRResponse {
  success: boolean;
  filename: string;
  image_path?: string;  // Path to saved image file
  raw_text: string;
  extracted_fields: ExtractedFields;
}

export interface Invoice {
  id: string;
  invoice_number: string | null;
  vendor: string | null;
  vendor_address: string | null;
  vendor_email: string | null;
  vendor_phone: string | null;
  bill_to_name?: string | null;
  bill_to_address?: string | null;
  invoice_date: string | null;
  due_date: string | null;
  purchase_order: string | null;
  subtotal: number;
  tax: number;
  tax_amount?: number | null;
  discount: number;
  total: number;
  currency: string;
  status: string;
  raw_text: string | null;
  extracted_fields: ExtractedFields | null;
  line_items: Array<{
    description: string;
    qty: number;
    rate: number;
    amount: number;
  }> | null;
  image_path: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface InvoiceCreate {
  invoice_number?: string | null;
  vendor?: string | null;
  vendor_address?: string | null;
  vendor_email?: string | null;
  vendor_phone?: string | null;
  bill_to_name?: string | null;
  bill_to_address?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  purchase_order?: string | null;
  subtotal?: number;
  tax?: number;
  tax_amount?: number | null;
  discount?: number;
  total: number;
  currency?: string;
  status?: string;
  raw_text?: string | null;
  extracted_fields?: ExtractedFields | null;
  line_items?: Array<{
    description: string;
    qty: number;
    rate: number;
    amount: number;
  }> | null;
  image_path?: string | null;
}

export interface InvoiceUpdate {
  invoice_number?: string | null;
  vendor?: string | null;
  vendor_address?: string | null;
  vendor_email?: string | null;
  vendor_phone?: string | null;
  bill_to_name?: string | null;
  bill_to_address?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  purchase_order?: string | null;
  subtotal?: number;
  tax?: number;
  tax_amount?: number | null;
  discount?: number;
  total?: number;
  currency?: string;
  status?: string;
  line_items?: Array<{
    description: string;
    qty: number;
    rate: number;
    amount: number;
  }> | null;
}

export interface InvoiceListParams {
  skip?: number;
  limit?: number;
  status?: string;
  search?: string;
}

// OCR API
export const uploadInvoiceImage = async (file: File): Promise<OCRResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response: AxiosResponse<OCRResponse> = await apiClient.post(
    '/api/ocr/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};

// Invoice CRUD APIs
export const createInvoice = async (invoice: InvoiceCreate): Promise<Invoice> => {
  const response: AxiosResponse<Invoice> = await apiClient.post('/api/invoices', invoice);
  return response.data;
};

export const getInvoices = async (params?: InvoiceListParams): Promise<Invoice[]> => {
  const response: AxiosResponse<Invoice[]> = await apiClient.get('/api/invoices', {
    params,
  });
  return response.data;
};

export const getInvoiceById = async (id: string): Promise<Invoice> => {
  const response: AxiosResponse<Invoice> = await apiClient.get(`/api/invoices/${id}`);
  return response.data;
};

export const updateInvoice = async (id: string, invoice: InvoiceUpdate): Promise<Invoice> => {
  const response: AxiosResponse<Invoice> = await apiClient.put(`/api/invoices/${id}`, invoice);
  return response.data;
};

export const deleteInvoice = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/invoices/${id}`);
};

