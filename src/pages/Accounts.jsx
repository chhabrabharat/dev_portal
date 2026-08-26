import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import StatePill from '../components/StatePill.jsx';
import { listAccounts } from '../api.js';

const formatDate = (value) => (value
  ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  : 'No end date');

/**
 * Every clinic on the platform, with the two things an operator scans for: what state each account
 * is in, and when it runs out.
 */
export default function Accounts() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = (term) => {
    setLoading(true);
    setError('');
    listAccounts(term)
      .then(setAccounts)
      .catch((e) => setError(e.message || 'Could not load accounts'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(''); }, []);

  const submitSearch = (event) => {
    event.preventDefault();
    load(search);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Accounts</h1>
          <p className="subtle">
            {loading ? 'Loading…' : `${accounts.length} account${accounts.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <form className="row" onSubmit={submitSearch}>
          <input
            type="text"
            placeholder="Search name, owner, email or city"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 260 }}
            aria-label="Search accounts"
          />
          <button type="submit" className="ghost">Search</button>
        </form>
      </div>

      {error && <div className="banner error">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Clinic</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Plan</th>
              <th>Access</th>
              <th>Access until</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr
                key={account.id}
                className="clickable"
                onClick={() => navigate(`/accounts/${account.id}`)}
              >
                <td><strong>{account.name || `Account ${account.id}`}</strong></td>
                <td>{account.owner || '—'}</td>
                <td>{account.status || '—'}</td>
                <td>{account.subscription?.planCode || '—'}</td>
                <td><StatePill state={account.subscription?.state} /></td>
                <td className="num">{formatDate(account.subscription?.expiresAt)}</td>
              </tr>
            ))}
            {!loading && accounts.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>No accounts found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
