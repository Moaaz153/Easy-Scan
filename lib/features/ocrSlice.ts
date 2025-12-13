/**
 * Redux slice for OCR processing
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { uploadInvoiceImage, OCRResponse } from '@/services/invoiceApi';

interface OCRState {
  result: OCRResponse | null;
  loading: boolean;
  error: string | null;
  uploadedFileName: string | null; // Store filename instead of File object
}

const initialState: OCRState = {
  result: null,
  loading: false,
  error: null,
  uploadedFileName: null,
};

// Async thunk for OCR upload
export const processInvoiceImage = createAsyncThunk(
  'ocr/processInvoiceImage',
  async (file: File) => {
    const response = await uploadInvoiceImage(file);
    // Return only serializable data
    return { 
      response, 
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    };
  }
);

const ocrSlice = createSlice({
  name: 'ocr',
  initialState,
  reducers: {
    clearOCRResult: (state) => {
      state.result = null;
      state.uploadedFileName = null;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(processInvoiceImage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        processInvoiceImage.fulfilled,
        (state, action: PayloadAction<{ response: OCRResponse; fileName: string; fileSize: number; fileType: string }>) => {
          state.loading = false;
          state.result = action.payload.response;
          state.uploadedFileName = action.payload.fileName;
        }
      )
      .addCase(processInvoiceImage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to process invoice image';
      });
  },
});

export const { clearOCRResult, clearError } = ocrSlice.actions;
export default ocrSlice.reducer;

