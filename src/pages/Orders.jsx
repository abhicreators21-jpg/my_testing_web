import { useEffect, useState } from 'react';
import { Link } from '../lib/router.jsx';
import { api } from '../lib/api.js';
import { formatDate, formatMoney } from '../lib/format.js';
import { Alert, EmptyState, PageLoader, ProductImage, StatusBadge } from '../components/ui.jsx';
import { IconBox } from '../components/icons.jsx';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/orders')
      .then((data) => {
        if (!cancelled) setOrders(data.orders);
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

  if (loading) return <PageLoader label="Loading your orders…" />;

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>My orders</h1>
          <p className="muted">Every order you have placed on ShopSphere.</p>
        </div>
        <Link to="/shop" className="btn btn-outline">
          Continue shopping
        </Link>
      </div>

      <Alert>{error}</Alert>

      {orders.length === 0 && !error ? (
        <EmptyState
          icon={<IconBox width={26} height={26} />}
          title="No orders yet"
          description="When you place your first order it will show up here with live status updates."
          action={
            <Link to="/shop" className="btn btn-primary">
              Start shopping
            </Link>
          }
        />
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <article className="card order-card" key={order.id}>
              <header className="order-card-head">
                <div>
                  <h2>Order #{order.id}</h2>
                  <span className="muted small">Placed {formatDate(order.createdAt)}</span>
                </div>
                <StatusBadge status={order.status} />
              </header>

              <div className="order-thumbs">
                {order.items.slice(0, 5).map((item) => (
                  <div className="order-thumb" key={item.productId}>
                    <ProductImage src={item.imageUrl} alt={item.name} />
                  </div>
                ))}
                {order.items.length > 5 && (
                  <span className="muted small">+{order.items.length - 5} more</span>
                )}
              </div>

              <div className="order-card-foot">
                <span className="muted small">
                  {order.items.reduce((sum, item) => sum + item.quantity, 0)} item(s) ·{' '}
                  {formatMoney(order.totalCents)}
                </span>
                <Link to={`/orders/${order.id}`} className="btn btn-ghost btn-sm">
                  View details →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
