import { useState } from 'react';
import { Link } from '../lib/router.jsx';
import { formatMoney } from '../lib/format.js';
import { useCart } from '../state/CartContext.jsx';
import { useToast } from '../state/ToastContext.jsx';
import { IconCart, IconCheck } from './icons.jsx';
import { ProductImage, Stars } from './ui.jsx';

export default function ProductCard({ product }) {
  const { addItem, pendingIds } = useCart();
  const toast = useToast();
  const [added, setAdded] = useState(false);
  const busy = pendingIds.includes(product.id);
  const outOfStock = product.stock <= 0;

  const handleAdd = async () => {
    try {
      await addItem(product, 1);
      setAdded(true);
      toast.success(`${product.name} added to your cart`);
      window.setTimeout(() => setAdded(false), 1800);
    } catch (error) {
      toast.error(error.message || 'Could not add this product to your cart');
    }
  };

  return (
    <article className="product-card">
      <Link to={`/product/${product.id}`} className="product-media" aria-label={product.name}>
        <ProductImage src={product.imageUrl} alt={product.name} />
        {product.featured ? <span className="badge badge-floating">Featured</span> : null}
        {outOfStock ? <span className="badge badge-floating">Out of stock</span> : null}
      </Link>
      <div className="product-body">
        <span className="product-cat">{product.category?.name || 'ShopSphere'}</span>
        <Link to={`/product/${product.id}`} className="product-name">
          {product.name}
        </Link>
        <Stars rating={product.rating} count={product.reviewCount} />
        <div className="product-foot">
          <span className="product-price">{formatMoney(product.priceCents)}</span>
          <button
            type="button"
            className="add-btn"
            onClick={handleAdd}
            disabled={busy || outOfStock}
            aria-label={`Add ${product.name} to cart`}
          >
            {added ? <IconCheck width={14} height={14} /> : <IconCart width={14} height={14} />}
            {outOfStock ? 'Sold out' : added ? 'Added' : busy ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>
    </article>
  );
}
