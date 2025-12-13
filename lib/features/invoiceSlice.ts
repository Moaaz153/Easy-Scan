/**
 * Redux slice for invoice management
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  Invoice,
  InvoiceCreate,
  InvoiceUpdate,
  InvoiceListParams,
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
} from '@/services/invoiceApi';

interface InvoiceState {
  invoices: Invoice[];
  currentInvoice: Invoice | null;
  loading: boolean;
  error: string | null;
  totalCount: number;
}

const initialState: InvoiceState = {
  invoices: [],
  currentInvoice: null,
  loading: false,
  error: null,
  totalCount: 0,
};

// Async thunks
export const fetchInvoices = createAsyncThunk(
  'invoices/fetchInvoices',
  async (params?: InvoiceListParams) => {
    const response = await getInvoices(params);
    return response;
  }
);

export const fetchInvoiceById = createAsyncThunk(
  'invoices/fetchInvoiceById',
  async (id: string) => {
    const response = await getInvoiceById(id);
    return response;
  }
);

export const createInvoiceAsync = createAsyncThunk(
  'invoices/createInvoice',
  async (invoice: InvoiceCreate) => {
    const response = await createInvoice(invoice);
    return response;
  }
);

export const updateInvoiceAsync = createAsyncThunk(
  'invoices/updateInvoice',
  async ({ id, invoice }: { id: string; invoice: InvoiceUpdate }) => {
    const response = await updateInvoice(id, invoice);
    return response;
  }
);

export const deleteInvoiceAsync = createAsyncThunk(
  'invoices/deleteInvoice',
  async (id: string) => {
    await deleteInvoice(id);
    return id;
  }
);

const invoiceSlice = createSlice({
  name: 'invoices',
  initialState,
  reducers: {
    clearCurrentInvoice: (state) => {
      state.currentInvoice = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch invoices
    builder
      .addCase(fetchInvoices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvoices.fulfilled, (state, action: PayloadAction<Invoice[]>) => {
        state.loading = false;
        state.invoices = action.payload;
        state.totalCount = action.payload.length;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch invoices';
      });

    // Fetch invoice by ID
    builder
      .addCase(fetchInvoiceById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvoiceById.fulfilled, (state, action: PayloadAction<Invoice>) => {
        state.loading = false;
        state.currentInvoice = action.payload;
      })
      .addCase(fetchInvoiceById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch invoice';
      });

    // Create invoice
    builder
      .addCase(createInvoiceAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createInvoiceAsync.fulfilled, (state, action: PayloadAction<Invoice>) => {
        state.loading = false;
        state.invoices.unshift(action.payload);
        state.currentInvoice = action.payload;
      })
      .addCase(createInvoiceAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create invoice';
      });

    // Update invoice
    builder
      .addCase(updateInvoiceAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateInvoiceAsync.fulfilled, (state, action: PayloadAction<Invoice>) => {
        state.loading = false;
        const index = state.invoices.findIndex((inv) => inv.id === action.payload.id);
        if (index !== -1) {
          state.invoices[index] = action.payload;
        }
        if (state.currentInvoice?.id === action.payload.id) {
          state.currentInvoice = action.payload;
        }
      })
      .addCase(updateInvoiceAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update invoice';
      });

    // Delete invoice
    builder
      .addCase(deleteInvoiceAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteInvoiceAsync.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.invoices = state.invoices.filter((inv) => inv.id !== action.payload);
        if (state.currentInvoice?.id === action.payload) {
          state.currentInvoice = null;
        }
      })
      .addCase(deleteInvoiceAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete invoice';
      });
  },
});

export const { clearCurrentInvoice, clearError } = invoiceSlice.actions;
export default invoiceSlice.reducer;

