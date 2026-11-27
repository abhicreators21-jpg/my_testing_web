import { useEffect, useState } from 'react';
import { Link, navigate } from '../lib/router.jsx';
import { api } from '../lib/api.js';
import { formatMoney } from '../lib/format.js';
import { useAuth } from '../state/AuthContext.jsx';
import { useCart } from '../state/CartContext.jsx';
import { useToast } from '../state/ToastContext.jsx';
import { Alert, Field, ProductImage } from '../components/ui.jsx';
import { IconShield } from '../components/icons.jsx';

const EMPTY_FORM = {
  name: '',
  address: '',
  city: '',
  zip: '',
  country: '',
  phone: '',
  paymentMethod: 'card',
};

export default function Checkout() {
  const { user } = useAuth();
  const { cart, loading, refresh } = useCart();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      address: user.address || '',
      city: user.city || '',
      zip: user.zip || '',
      country: user.country || 'United States',
      phone: user.phone || '',
      paymentMethod: 'card',
    });
  }, [user]);

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter the recipient name';
    if (form.address.trim().length < 4) next.address = 'Enter a street address';
    if (form.city.trim().length < 2) next.city = 'Enter a city';
    if (form.zip.trim().length < 2) next.zip = 'Enter a ZIP or postal code';
    if (form.country.trim().length < 2) next.country = 'Enter a country';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      const data = await api.post('/orders', {
        name: form.name.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        zip: form.zip.trim(),
        country: form.country.trim(),
        phone: form.phone.trim(),
        paymentMethod: form.paymentMethod,
      });
      await refresh();
      toast.success(`Order #${data.order.id} placed successfully`);
      navigate(`/orders/${data.order.id}?placed=1`);
    } catch (err) {
      setError(err.message);
      if (err.fields) setErrors(err.fields);
    } finally {
      setSubmitting(false);
    }
  };

  if (!loading && cart.items.length === 0) {
    return (
      <div className="container page">
        <div className="empty-state">
          <h2>Your cart is empty</h2>
          <p>Add a few products before checking out.</p>
          <Link to="/shop" className="btn btn-primary">
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Checkout</h1>
          <p className="muted">Step 2 of 2 · Shipping and payment</p>
        </div>
        <Link to="/cart" className="link-arrow">
          ← Back to cart
        </Link>
      </div>

      <form className="checkout-layout" onSubmit={handleSubmit} noValidate>
        <div className="card checkout-form">
          <h2>Shipping details</h2>
          <Alert>{error}</Alert>

          <div className="form-grid">
            <Field label="Full name" htmlFor="co-name" error={errors.name}>
              <input id="co-name" className="input" value={form.name} onChange={update('name')} autoComplete="name" />
            </Field>
            <Field label="Phone (optional)" htmlFor="co-phone" error={errors.phone}>
              <input id="co-phone" className="input" value={form.phone} onChange={update('phone')} autoComplete="tel" />
            </Field>
          </div>

          <Field label="Street address" htmlFor="co-address" error={errors.address}>
            <input
              id="co-address"
              className="input"
              value={form.address}
              onChange={update('address')}
              autoComplete="street-address"
            />
          </Field>

          <div className="form-grid three">
            <Field label="City" htmlFor="co-city" error={errors.city}>
              <input id="co-city" className="input" value={form.city} onChange={update('city')} autoComplete="address-level2" />
            </Field>
            <Field label="ZIP / postal code" htmlFor="co-zip" error={errors.zip}>
              <input id="co-zip" className="input" value={form.zip} onChange={update('zip')} autoComplete="postal-code" />
            </Field>
            <Field label="Country" htmlFor="co-country" error={errors.country}>
              <input id="co-country" className="input" value={form.country} onChange={update('country')} autoComplete="country-name" />
            </Field>
          </div>

          <h2 style={{ marginTop: 8 }}>Payment method</h2>
          <div className="payment-options">
            <label className={`payment-option${form.paymentMethod === 'card' ? ' active' : ''}`}>
              <input
                type="radio"
                name="paymentMethod"
                value="card"
                checked={form.paymentMethod === 'card'}
                onChange={update('paymentMethod')}
              />
              <span>
                <strong>Card on delivery</strong>
                <small>Demo checkout — no card details are collected.</small>
              </span>
            </label>
            <label className={`payment-option${form.paymentMethod === 'cod' ? ' active' : ''}`}>
              <input
                type="radio"
                name="paymentMethod"
                value="cod"
                checked={form.paymentMethod === 'cod'}
                onChange={update('paymentMethod')}
              />
              <span>
                <strong>Cash on delivery</strong>
                <small>Pay the courier when your parcel arrives.</small>
              </span>
            </label>
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
            {submitting ? 'Placing your order…' : `Place order · ${formatMoney(cart.totalCents)}`}
          </button>
          <p className="small muted" style={{ textAlign: 'center', marginTop: 10 }}>
            <IconShield width={13} height={13} /> Orders are stored in the ShopSphere database and
            visible in your order history.
          </p>
        </div>

        <aside className="summary">
          <h2>Your order</h2>
          <div className="summary-items">
            {cart.items.map((item) => (
              <div className="summary-item" key={item.productId}>
                <div className="summary-thumb">
                  <ProductImage src={item.imageUrl} alt={item.name} />
                  <span className="summary-qty">{item.quantity}</span>
                </div>
                <div>
                  <strong>{item.name}</strong>
                  <span className="muted small">
                    {formatMoney(item.priceCents)} × {item.quantity}
                  </span>
                </div>
                <span className="summary-line">{formatMoney(item.lineTotalCents)}</span>
              </div>
            ))}
          </div>
          <div className="summary-divider" />
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatMoney(cart.subtotalCents)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <span>{cart.shippingCents === 0 ? 'Free' : formatMoney(cart.shippingCents)}</span>
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <span>{formatMoney(cart.totalCents)}</span>
          </div>
        </aside>
      </form>
    </div>
  );
}
