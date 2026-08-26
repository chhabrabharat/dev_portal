import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Accounts from './pages/Accounts.jsx';
import AccountDetail from './pages/AccountDetail.jsx';
import { getToken } from './api.js';

/** Keeps unauthenticated visitors out of the console shell. The API is the real gate. */
function RequireOperator({ children }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/accounts"
        element={<RequireOperator><Layout><Accounts /></Layout></RequireOperator>}
      />
      <Route
        path="/accounts/:id"
        element={<RequireOperator><Layout><AccountDetail /></Layout></RequireOperator>}
      />
      <Route path="*" element={<Navigate to="/accounts" replace />} />
    </Routes>
  );
}
