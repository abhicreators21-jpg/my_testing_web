import { Link } from '../lib/router.jsx';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              <span className="brand-mark">S</span> ShopSphere
            </div>
            <p style={{ maxWidth: '34ch' }}>
              Thoughtfully curated audio, computing and home essentials — shipped fast, backed by a
              30-day return promise.
            </p>
          </div>
          <div>
            <h4>Shop</h4>
            <Link to="/shop">All products</Link>
            <Link to="/shop?category=audio">Audio</Link>
            <Link to="/shop?category=computers">Computers</Link>
            <Link to="/shop?category=home-living">Home &amp; Living</Link>
          </div>
          <div>
            <h4>Account</h4>
            <Link to="/login">Sign in</Link>
            <Link to="/register">Create account</Link>
            <Link to="/orders">Order history</Link>
            <Link to="/profile">Profile settings</Link>
          </div>
          <div>
            <h4>Support</h4>
            <Link to="/shop">Shipping &amp; returns</Link>
            <Link to="/shop">Track an order</Link>
            <a href="mailto:support@shopsphere.example">support@shopsphere.example</a>
            <span className="small">Mon–Fri, 9am–6pm PT</span>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} ShopSphere. All rights reserved.</span>
          <span>Built with React, Express and SQLite.</span>
        </div>
      </div>
    </footer>
  );
}
