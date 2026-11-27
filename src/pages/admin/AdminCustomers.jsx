import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import { formatDate, formatMoney } from '../../lib/format.js';
import { Alert, PageLoader } from '../../components/ui.jsx';
import AdminLayout from './AdminLayout.jsx';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .get('/admin/customers')
      .then((data) => {
        if (!cancelled) setCustomers(data.customers);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term),
    );
  }, [customers, search]);

  return (
    <AdminLayout
      title="Customers"
      subtitle={`${customers.length} registered account(s)`}
    >
      <Alert>{error}</Alert>

      <div className="card">
        <div className="toolbar">
          <input
            className="input"
            placeholder="Search customers…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search customers"
          />
        </div>

        {loading ? (
          <PageLoader label="Loading customers…" />
        ) : filtered.length === 0 ? (
          <p className="muted" style={{ padding: 16 }}>
            No customers found.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Location</th>
                  <th>Role</th>
                  <th className="num">Orders</th>
                  <th className="num">Spent</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <strong>{customer.name}</strong>
                    </td>
                    <td className="muted small">{customer.email}</td>
                    <td className="muted small">
                      {[customer.city, customer.country].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td>
                      <span className={`badge ${customer.role === 'admin' ? 'badge-brand' : 'badge-neutral'}`}>
                        {customer.role}
                      </span>
                    </td>
                    <td className="num">{customer.orderCount}</td>
                    <td className="num">{formatMoney(customer.spentCents)}</td>
                    <td className="muted small">{formatDate(customer.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
