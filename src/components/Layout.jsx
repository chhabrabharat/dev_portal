import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { clearSession, getSession } from '../api.js';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const session = getSession();

  const signOut = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <header className="topbar">
        <Link to="/accounts" className="brand" style={{ textDecoration: 'none' }}>
          <span className="brand-mark" aria-hidden="true">⚙</span>
          Operator Console
        </Link>
        <div className="topbar-right">
          {session?.username && <span>{session.username}</span>}
          <button type="button" className="ghost" onClick={signOut}>Sign out</button>
        </div>
      </header>
      <main className="page">{children}</main>
    </>
  );
}
