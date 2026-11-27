import { useEffect, useState } from 'react';
import { Link, navigate } from '../lib/router.jsx';
import { api } from '../lib/api.js';
import { formatMoney } from '../lib/format.js';
import { useCart } from '../state/CartContext.jsx';
import { useToast } from '../state/ToastContext.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { IconCart, IconShield, IconTruck } from '../components/icons.jsx';
import { Alert, PageLoader, ProductImage, QuantityStepper, Stars } from '../components/ui.jsx';

export default function ProductDetail({ id }) {
  const { addItem } = useCart();
  const toast = useToast();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setQuantity(1);
    api
      .get(`/products/${id}`)
      .then((data) => {
        if (cancelled) return;
        setProduct(data.product);
        setRelated(data.related || []);
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

  const handleAdd = async (buyNow = false) => {
    setAdding(true);
    try {
      await addItem(product, quantity);
      toast.success(`${quantity} × ${product.name} added to your cart`);
      if (buyNow) navigate('/cart');
    } catch (err) {
      toast.error(err.message || 'Could not add to cart');
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <PageLoader label="Loading product…" />;
  if (error) {
    return (
      <div className="container page">
        <Alert>{error}</Alert>
        <Link to="/shop" className="btn btn-primary">
          Back to shop
        </Link>
      </div>
    );
  }
  if (!product) return null;

  const outOfStock = product.stock <= 0;
  const lowStock = product.stock > 0 && product.stock <= 10;

  return (
    <div className="container page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/shop">Shop</Link>
        {product.category ? (
          <>
            <span>/</span>
            <Link to={`/shop?category=${encodeURIComponent(product.category.slug)}`}>
              {product.category.name}
            </Link>
          </>
        ) : null}
      </nav>

      <div className="product-detail">
        <div className="detail-media">
          <ProductImage src={product.imageUrl} alt={product.name} className="detail-image" />
        </div>

        <div className="detail-info">
          <span className="product-cat">{product.category?.name || 'ShopSphere'}</span>
          <h1>{product.name}</h1>
          <Stars rating={product.rating} count={product.reviewCount} />
          <div className="detail-price">{formatMoney(product.priceCents)}</div>
          <p className="detail-desc">{product.description}</p>

          <div className="detail-stock">
            {outOfStock ? (
              <span className="badge badge-cancelled">Out of stock</span>
            ) : lowStock ? (
              <span className="badge badge-pending">Only {product.stock} left in stock</span>
            ) : (
              <span className="badge badge-delivered">In stock · {product.stock} available</span>
            )}
          </div>

          <div className="detail-buy">
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              max={Math.max(product.stock, 1)}
              disabled={outOfStock}
            />
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => handleAdd(false)}
              disabled={adding || outOfStock}
            >
              <IconCart width={18} height={18} />
              {outOfStock ? 'Out of stock' : adding ? 'Adding…' : 'Add to cart'}
            </button>
            <button
              type="button"
              className="btn btn-outline btn-lg"
              onClick={() => handleAdd(true)}
              disabled={adding || outOfStock}
            >
              Buy now
            </button>
          </div>

          <ul className="detail-perks">
            <li>
              <IconTruck width={16} height={16} /> Free shipping on orders over $50
            </li>
            <li>
              <IconShield width={16} height={16} /> Secure checkout · 30-day returns
            </li>
          </ul>
        </div>
      </div>

      {related.length ? (
        <section className="section">
          <div className="section-head">
            <h2>You may also like</h2>
            <Link to="/shop" className="link-arrow">
              Browse all →
            </Link>
          </div>
          <div className="product-grid">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
