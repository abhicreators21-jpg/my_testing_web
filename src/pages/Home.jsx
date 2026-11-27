import { useEffect, useState } from 'react';
import { Link } from '../lib/router.jsx';
import { api } from '../lib/api.js';
import ProductCard from '../components/ProductCard.jsx';
import { IconBox, IconCart, IconSearch, IconShield, IconTruck } from '../components/icons.jsx';
import { Alert, SkeletonGrid } from '../components/ui.jsx';

const CATEGORY_ICONS = {
  audio: '🎧',
  computers: '💻',
  'home-living': '🛋️',
  accessories: '⌚',
  photography: '📷',
  fitness: '🏋️',
};

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [fresh, setFresh] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [catData, featuredData, freshData] = await Promise.all([
          api.get('/categories'),
          api.get('/products?featured=true&limit=8'),
          api.get('/products?sort=newest&limit=4'),
        ]);
        if (cancelled) return;
        setCategories(catData.categories || []);
        setFeatured(featuredData.products || []);
        setFresh(freshData.products || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">New season · Free shipping over $50</span>
            <h1>
              Gear that keeps up with <span>your everyday</span>.
            </h1>
            <p>
              Hand-picked audio, computing and home essentials — tested by our team, backed by a
              30-day return promise and delivered in days.
            </p>
            <div className="hero-actions">
              <Link to="/shop" className="btn btn-primary btn-lg">
                Shop the collection
              </Link>
              <Link to="/shop?sort=rating" className="btn btn-ghost btn-lg">
                Browse top rated
              </Link>
            </div>
            <div className="hero-stats">
              <div>
                <strong>{loading ? '—' : `${categories.reduce((sum, c) => sum + c.productCount, 0)}+`}</strong>
                <span>Products in stock</span>
              </div>
              <div>
                <strong>4.7★</strong>
                <span>Average rating</span>
              </div>
              <div>
                <strong>48h</strong>
                <span>Typical delivery</span>
              </div>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-card hero-card-a">
              <IconCart width={26} height={26} />
              <span>Cart saved to your account</span>
            </div>
            <div className="hero-card hero-card-b">
              <IconTruck width={26} height={26} />
              <span>Free shipping over $50</span>
            </div>
            <div className="hero-card hero-card-c">
              <IconShield width={26} height={26} />
              <span>Secure checkout</span>
            </div>
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="section-head">
          <div>
            <h2>Shop by category</h2>
            <p>Find exactly what you need, faster.</p>
          </div>
          <Link to="/shop" className="link-arrow">
            View all products →
          </Link>
        </div>
        <div className="category-grid">
          {(loading ? Array.from({ length: 4 }) : categories).map((category, index) =>
            loading ? (
              <div className="category-card" key={`sk-${index}`}>
                <div className="skeleton" style={{ height: 22, width: 22, borderRadius: 8 }} />
                <div className="skeleton" style={{ height: 12, width: '60%', marginTop: 12 }} />
              </div>
            ) : (
              <Link
                to={`/shop?category=${encodeURIComponent(category.slug)}`}
                className="category-card"
                key={category.id}
              >
                <span className="category-emoji" aria-hidden="true">
                  {CATEGORY_ICONS[category.slug] || <IconBox width={22} height={22} />}
                </span>
                <strong>{category.name}</strong>
                <span>{category.productCount} products</span>
              </Link>
            ),
          )}
        </div>
      </section>

      <section className="container section">
        <div className="section-head">
          <div>
            <h2>Featured this week</h2>
            <p>Our team's favourite picks, updated weekly.</p>
          </div>
          <Link to="/shop?sort=rating" className="link-arrow">
            More top rated →
          </Link>
        </div>
        {error ? <Alert>{error}</Alert> : null}
        {loading ? (
          <SkeletonGrid count={4} />
        ) : featured.length ? (
          <div className="product-grid">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="muted">No featured products yet.</p>
        )}
      </section>

      <section className="container section">
        <div className="feature-band">
          <div>
            <IconTruck width={22} height={22} />
            <h4>Free shipping</h4>
            <p>On every order over $50, delivered in 2–4 days.</p>
          </div>
          <div>
            <IconShield width={22} height={22} />
            <h4>Secure by design</h4>
            <p>Hashed passwords and httpOnly session cookies.</p>
          </div>
          <div>
            <IconBox width={22} height={22} />
            <h4>30-day returns</h4>
            <p>Changed your mind? Send it back, no questions.</p>
          </div>
          <div>
            <IconSearch width={22} height={22} />
            <h4>Real inventory</h4>
            <p>Stock levels come straight from our database.</p>
          </div>
        </div>
      </section>

      {fresh.length ? (
        <section className="container section" style={{ paddingBottom: 64 }}>
          <div className="section-head">
            <div>
              <h2>Just landed</h2>
              <p>The newest additions to the ShopSphere catalog.</p>
            </div>
            <Link to="/shop?sort=newest" className="link-arrow">
              See what's new →
            </Link>
          </div>
          <div className="product-grid">
            {fresh.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
