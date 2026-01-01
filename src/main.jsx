import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// --- REDUX IMPORTS ---
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store/store'; // Ensure this path matches where you created store.js

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 1. Wrap App in Provider to give access to the Store */}
    <Provider store={store}>
      {/* 2. Wrap App in PersistGate to delay rendering until state is rehydrated */}
      <PersistGate loading={null} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>
  </React.StrictMode>,
);