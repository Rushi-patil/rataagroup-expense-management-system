import { createSlice } from '@reduxjs/toolkit';

const masterDataSlice = createSlice({
  name: 'masterData',
  initialState: {
    expenseTypes: [],
    expenseTypesMap: {}, 
    paymentModes: [], // --- NEW: Store Payment Modes ---
    lastFetched: null,   
  },
  reducers: {
    setExpenseTypes: (state, action) => {
      state.expenseTypes = action.payload;
      const map = {};
      action.payload.forEach(type => {
        map[type._id] = type.ExpenseTypeName;
      });
      state.expenseTypesMap = map;
      // We update timestamp only when both might be fetched, 
      // but usually we can share the timestamp or manage separately.
      // For simplicity, we'll assume they are fetched together or close enough.
      state.lastFetched = Date.now();
    },
    // --- NEW: Setter for Payment Modes ---
    setPaymentModes: (state, action) => {
        state.paymentModes = action.payload;
    },
    clearMasterData: (state) => {
      state.expenseTypes = [];
      state.expenseTypesMap = {};
      state.paymentModes = []; // Clear Payment Modes
      state.lastFetched = null;
    }
  },
});

export const { setExpenseTypes, setPaymentModes, clearMasterData } = masterDataSlice.actions;
export default masterDataSlice.reducer;