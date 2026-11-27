import { useEffect, useState } from 'react';
import { Link, parseLocation, useLocation } from '../lib/router.jsx';
import { api } from '../lib/api.js';
import { formatDate, formatMoney, statusLabel } from '../lib/format.js';
import { Alert, PageLoader, ProductImage, StatusBadge } from '../components/ui.jsx';
import { IconCheck } from '../components/icons.jsx';

const TIMELINE = ['pending', 'processing', 'shipped', 'delivered'];

export default function OrderDetail({ id }) {
  const { query } = parseLocation(useLocation());
  const justPlaced = query.get('placed') === '1';
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/orders/${id}`)
      .then((data) => {
        if (!cancelled) setOrder(data.order);
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
  }, [id]);

  if (loading) return <PageLoader label="Loading order…" />;

  if (error) {
    return (
      <div className="container page">
        <Alert>{error}</Alert>
        <Link to="/orders" className="btn btn-outline">
          ← Back to orders
        </Link>
      </div>
    );
  }

  if (!order) return null;

  const currentStep = TIMELINE.indexOf(order.status);

  return (
    <div className="container page">
      {justPlaced && (
        <div className="success-banner">
          <IconCheck />
          <div>
            <strong>Thank you! Your order is confirmed.</strong>
            <span className="small">
              Order #{order.id} was saved to your account — you can track its status below.
            </span>
          </div>
        </div>
      )}

      <div className="page-head">
        <div>
          <h1>Order #{order.id}</h1>
          <p className="muted">
            Placed {formatDate(order.createdAt)} · {order.items.length} product(s)
          </p>
        </div>
        <div className="row-gap">
          <StatusBadge status={order.status} />
          <Link to="/orders" className="btn btn-ghost btn-sm">
            All orders
          </Link>
        </div>
      </div>

      {order.status !== 'cancelled' ? (
        <ol className="timeline">
          {TIMELINE.map((step, index) => (
            <li
              key={step}
              className={`timeline-step${index <= currentStep ? ' done' : ''}${
                index === currentStep ? ' current' : ''
              }`}
            >
              <span className="timeline-dot">{index <= currentStep ? '✓' : index + 1}</span>
              <span>{statusLabel(step)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <Alert type="error">This order was cancelled. Contact support if you need help.</Alert>
      )}

      <div className="detail-layout">
        <div className="card">
          <h2>Items</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="num">Price</th>
                  <th className="num">Qty</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.productId}>
                    <td>
                      <div className="table-product">
                        <div className="table-thumb">
                          <ProductImage src={item.imageUrl} alt={item.name} />
                        </div>
                        <Link to={`/product/${item.productId}`}>{item.name}</Link>
                      </div>
                    </td>
                    <td className="num">{formatMoney(item.unitPriceCents)}</td>
                    <td className="num">{item.quantity}</td>
                    <td className="num">{formatMoney(item.lineTotalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="totals">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatMoney(order.subtotalCents)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span>{order.shippingCents === 0 ? 'Free' : formatMoney(order.shippingCents)}</span>
            </div>
            <div className="summary-row total">
              <span>Total paid</span>
              <span>{formatMoney(order.totalCents)}</span>
            </div>
          </div>
        </div>

        <aside className="card">
          <h2>Shipping address</h2>
          <address className="address">
            <strong>{order.shipping.name}</strong>
            {order.shipping.address}
            {order.shipping.city}, {order.shipping.zip}
            {order.shipping.country}
            {order.shipping.phone && <span>{order.shipping.phone}</span>}
          </address>
          <div className="summary-divider" />
          <h3>Payment</h3>
          <p className="muted small">
            {order.paymentMethod === 'cod' ? 'Cash on delivery' : 'Card on delivery'}
          </p>
          <div className="summary-divider" />
          <h3>Need help?</h3>
          <p className="muted small">
            Email <a href="mailto:support@shopsphere.com">support@shopsphere.com</a> quoting order #
            {order.id}.
          </p>
        </aside>
      </div>
    </div>
  );
}
