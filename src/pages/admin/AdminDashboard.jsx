import { useEffect, useState } from 'react';
import { Link } from '../../lib/router.jsx';
import { api } from '../../lib/api.js';
import { formatDate, formatMoney, statusLabel } from '../../lib/format.js';
import { Alert, PageLoader, ProductImage, StatusBadge } from '../../components/ui.jsx';
import AdminLayout from './AdminLayout.jsx';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .get('/admin/stats')
      .then((data) => {
        if (!cancelled) setStats(data.stats);
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

  if (loading) return <PageLoader label="Loading dashboard…" />;

  const cards = stats
    ? [
        { label: 'Revenue', value: formatMoney(stats.revenueCents), hint: 'Excluding cancelled orders' },
        { label: 'Orders', value: stats.orderCount, hint: 'All time' },
        { label: 'Customers', value: stats.customerCount, hint: 'Registered accounts' },
        { label: 'Products', value: stats.productCount, hint: `${stats.lowStock} low on stock` },
      ]
    : [];

  return (
    <AdminLayout
      title="Dashboard"
      subtitle="Live store performance from the ShopSphere database."
      actions={
        <Link to="/admin/products" className="btn btn-primary btn-sm">
          + New product
        </Link>
      }
    >
      <Alert>{error}</Alert>

      {stats && (
        <>
          <div className="stats-grid">
            {cards.map((card) => (
              <div className="stat-card" key={card.label}>
                <span className="stat-label">{card.label}</span>
                <strong className="stat-value">{card.value}</strong>
                <span className="muted small">{card.hint}</span>
              </div>
            ))}
          </div>

          <div className="admin-columns">
            <div className="card">
              <div className="card-head">
                <h2>Recent orders</h2>
                <Link to="/admin/orders" className="link-arrow">
                  View all
                </Link>
              </div>
              {stats.recentOrders.length === 0 ? (
                <p className="muted small">No orders have been placed yet.</p>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Status</th>
                        <th className="num">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentOrders.map((order) => (
                        <tr key={order.id}>
                          <td>
                            <Link to={`/orders/${order.id}`}>#{order.id}</Link>
                            <div className="muted small">{formatDate(order.createdAt)}</div>
                          </td>
                          <td>
                            {order.customerName}
                            <div className="muted small">{order.customerEmail}</div>
                          </td>
                          <td>
                            <StatusBadge status={order.status} />
                          </td>
                          <td className="num">{formatMoney(order.totalCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="stack">
              <div className="card">
                <h2>Orders by status</h2>
                <ul className="status-list">
                  {stats.statusBreakdown.map((row) => (
                    <li key={row.status}>
                      <StatusBadge status={row.status} />
                      <strong>{row.count}</strong>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card">
                <h2>Top sellers</h2>
                {stats.topProducts.length === 0 ? (
                  <p className="muted small">No sales recorded yet.</p>
                ) : (
                  <ul className="plain-list">
                    {stats.topProducts.map((product) => (
                      <li key={product.name}>
                        <span>{product.name}</span>
                        <span className="muted small">
                          {product.units} sold · {formatMoney(product.revenueCents)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Low stock alert</h2>
              <Link to="/admin/products" className="link-arrow">
                Manage inventory
              </Link>
            </div>
            {stats.lowStockProducts.length === 0 ? (
              <p className="muted small">Every product is well stocked.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th className="num">Stock</th>
                      <th className="num">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.lowStockProducts.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <div className="table-product">
                            <div className="table-thumb">
                              <ProductImage src={product.imageUrl} alt={product.name} />
                            </div>
                            <Link to={`/product/${product.id}`}>{product.name}</Link>
                          </div>
                        </td>
                        <td>{product.category?.name || '—'}</td>
                        <td className="num">
                          <span className={product.stock === 0 ? 'text-danger' : 'text-warn'}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="num">{formatMoney(product.priceCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="muted small">
            Order statuses: {stats.statusBreakdown.map((row) => statusLabel(row.status)).join(' · ')}
          </p>
        </>
      )}
    </AdminLayout>
  );
}
