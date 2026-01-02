import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage
import authReducer from './authSlice';
import masterDataReducer from './masterDataSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  masterData: masterDataReducer,
});

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'masterData'], // Persist user and cached data
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);