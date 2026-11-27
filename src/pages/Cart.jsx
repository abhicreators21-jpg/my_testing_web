import { Link, navigate } from '../lib/router.jsx';
import { formatMoney } from '../lib/format.js';
import { useAuth } from '../state/AuthContext.jsx';
import { useCart } from '../state/CartContext.jsx';
import { useToast } from '../state/ToastContext.jsx';
import { IconCart, IconTrash, IconTruck } from '../components/icons.jsx';
import { Alert, EmptyState, PageLoader, ProductImage, QuantityStepper, Spinner } from '../components/ui.jsx';

export default function Cart() {
  const { cart, loading, setQuantity, removeItem, clearCart, pendingIds } = useCart();
  const { user } = useAuth();
  const toast = useToast();

  const changeQuantity = async (productId, quantity) => {
    try {
      await setQuantity(productId, quantity);
    } catch (error) {
      toast.error(error.message || 'Could not update the quantity');
    }
  };

  const handleRemove = async (item) => {
    try {
      await removeItem(item.productId);
      toast.info(`${item.name} removed from your cart`);
    } catch (error) {
      toast.error(error.message || 'Could not remove the item');
    }
  };

  const handleClear = async () => {
    try {
      await clearCart();
      toast.info('Cart cleared');
    } catch (error) {
      toast.error(error.message || 'Could not clear the cart');
    }
  };

  const goToCheckout = () => {
    if (!user) {
      toast.info('Sign in to complete your order — your cart will be saved.');
      navigate('/login?next=/checkout');
      return;
    }
    navigate('/checkout');
  };

  if (loading) return <PageLoader label="Loading your cart…" />;

  const remaining = Math.max(cart.freeShippingThresholdCents - cart.subtotalCents, 0);

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Your cart</h1>
          <p className="muted">
            {cart.count} item{cart.count === 1 ? '' : 's'}
            {!user ? ' · saved on this device until you sign in' : ' · saved to your account'}
          </p>
        </div>
        {cart.items.length ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleClear}>
            <IconTrash width={14} height={14} /> Clear cart
          </button>
        ) : null}
      </div>

      {cart.items.length === 0 ? (
        <EmptyState
          icon={<IconCart />}
          title="Your cart is empty"
          message="Browse the catalog and add something you love — items stay here when you refresh."
          action={
            <Link to="/shop" className="btn btn-primary">
              Start shopping
            </Link>
          }
        />
      ) : (
        <div className="cart-layout">
          <div className="cart-list">
            {cart.items.map((item) => {
              const busy = pendingIds.includes(item.productId);
              return (
                <div className="cart-item" key={item.productId}>
                  <Link to={`/product/${item.productId}`} className="cart-thumb">
                    <ProductImage src={item.imageUrl} alt={item.name} />
                  </Link>
                  <div className="cart-item-info">
                    <Link to={`/product/${item.productId}`} className="product-name">
                      {item.name}
                    </Link>
                    <span className="muted small">{formatMoney(item.priceCents)} each</span>
                    {item.stock < item.quantity ? (
                      <span className="field-error">Only {item.stock} in stock</span>
                    ) : null}
                  </div>
                  <div className="cart-item-actions">
                    <QuantityStepper
                      small
                      value={item.quantity}
                      onChange={(next) => changeQuantity(item.productId, next)}
                      max={Math.max(item.stock, 1)}
                      disabled={busy}
                    />
                    <button
                      type="button"
                      className="icon-btn subtle"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => handleRemove(item)}
                      disabled={busy}
                    >
                      {busy ? <Spinner size={14} /> : <IconTrash width={16} height={16} />}
                    </button>
                  </div>
                  <div className="cart-line-total">{formatMoney(item.lineTotalCents)}</div>
                </div>
              );
            })}
          </div>

          <aside className="summary">
            <h2>Order summary</h2>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatMoney(cart.subtotalCents)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span>{cart.shippingCents === 0 ? 'Free' : formatMoney(cart.shippingCents)}</span>
            </div>
            {remaining > 0 ? (
              <div className="shipping-hint">
                <IconTruck width={15} height={15} /> Add {formatMoney(remaining)} more for free shipping
              </div>
            ) : null}
            <div className="summary-divider" />
            <div className="summary-row total">
              <span>Total</span>
              <span>{formatMoney(cart.totalCents)}</span>
            </div>
            <button type="button" className="btn btn-primary btn-block btn-lg" onClick={goToCheckout}>
              {user ? 'Proceed to checkout' : 'Sign in to checkout'}
            </button>
            <Link to="/shop" className="btn btn-ghost btn-block">
              Continue shopping
            </Link>
            <p className="small muted" style={{ marginTop: 10 }}>
              Secure checkout · Your cart is stored in the ShopSphere database
              {user ? '' : ' once you sign in'}.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
