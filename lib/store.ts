import { configureStore } from "@reduxjs/toolkit";
import invoiceReducer from "./features/invoiceSlice";
import ocrReducer from "./features/ocrSlice";
import authReducer from "./features/authSlice";

export const myStore = configureStore({
    reducer: {
        auth: authReducer,
        invoices: invoiceReducer,
        ocr: ocrReducer,
    }
});

export type RootState = ReturnType<typeof myStore.getState>;
export type AppDispatch = typeof myStore.dispatch;