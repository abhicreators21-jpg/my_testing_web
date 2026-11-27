import { useEffect, useMemo, useState } from 'react';
import { Link } from '../../lib/router.jsx';
import { api } from '../../lib/api.js';
import { formatDate, formatMoney, statusLabel } from '../../lib/format.js';
import { useToast } from '../../state/ToastContext.jsx';
import { Alert, PageLoader, StatusBadge } from '../../components/ui.jsx';
import AdminLayout from './AdminLayout.jsx';

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrders() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/orders');
      setOrders(data.orders);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesTerm =
        !term ||
        String(order.id).includes(term) ||
        order.customerName.toLowerCase().includes(term) ||
        (order.customerEmail || '').toLowerCase().includes(term);
      return matchesStatus && matchesTerm;
    });
  }, [orders, statusFilter, search]);

  const changeStatus = async (order, status) => {
    if (status === order.status) return;
    setSavingId(order.id);
    try {
      const data = await api.patch(`/admin/orders/${order.id}/status`, { status });
      setOrders((current) => current.map((row) => (row.id === data.order.id ? data.order : row)));
      toast.success(`Order #${order.id} marked ${statusLabel(status)}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminLayout
      title="Orders"
      subtitle="Every customer order, newest first. Update status as you fulfil them."
    >
      <Alert>{error}</Alert>

      <div className="card">
        <div className="toolbar">
          <input
            className="input"
            placeholder="Search by order number, name or email…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search orders"
          />
          <select
            className="input"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <PageLoader label="Loading orders…" />
        ) : filtered.length === 0 ? (
          <p className="muted" style={{ padding: 16 }}>
            No orders match this filter.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th className="num">Total</th>
                  <th>Status</th>
                  <th>Update</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link to={`/orders/${order.id}`}>#{order.id}</Link>
                      <div className="muted small">{formatDate(order.createdAt)}</div>
                    </td>
                    <td>
                      {order.customerName}
                      <div className="muted small">{order.customerEmail}</div>
                    </td>
                    <td className="num">{order.itemCount ?? order.items?.length ?? 0}</td>
                    <td className="num">{formatMoney(order.totalCents)}</td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td>
                      <select
                        className="input input-sm"
                        value={order.status}
                        disabled={savingId === order.id}
                        onChange={(event) => changeStatus(order, event.target.value)}
                        aria-label={`Update status for order ${order.id}`}
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {statusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </td>
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
