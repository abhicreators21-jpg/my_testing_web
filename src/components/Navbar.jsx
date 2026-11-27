import { useEffect, useRef, useState } from 'react';
import { Link, navigate, useLocation } from '../lib/router.jsx';
import { useAuth } from '../state/AuthContext.jsx';
import { useCart } from '../state/CartContext.jsx';
import { IconCart, IconClose, IconLogout, IconMenu, IconSearch, IconUser } from './icons.jsx';

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'U';

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const { cart } = useCart();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [location]);

  useEffect(() => {
    const onClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    setSearch(params.get('search') || '');
  }, [location]);

  const submitSearch = (event) => {
    event.preventDefault();
    const term = search.trim();
    navigate(term ? `/shop?search=${encodeURIComponent(term)}` : '/shop');
  };

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate('/');
  };

  const isActive = (path) =>
    path === '/' ? location === '/' : location === path || location.startsWith(`${path}?`);

  return (
    <header className="site-header">
      <div className="container">
        <div className="header-inner">
          <Link to="/" className="brand" aria-label="ShopSphere home">
            <span className="brand-mark">S</span>
            <span>
              ShopSphere
              <small>Modern essentials</small>
            </span>
          </Link>

          <nav className="nav-links" aria-label="Main navigation">
            <Link to="/" className={`nav-link${isActive('/') ? ' active' : ''}`}>
              Home
            </Link>
            <Link to="/shop" className={`nav-link${isActive('/shop') ? ' active' : ''}`}>
              Shop
            </Link>
            <Link to="/shop?sort=rating" className="nav-link">
              Top rated
            </Link>
            {user ? (
              <Link to="/orders" className={`nav-link${isActive('/orders') ? ' active' : ''}`}>
                Orders
              </Link>
            ) : null}
            {isAdmin ? (
              <Link to="/admin" className={`nav-link${isActive('/admin') ? ' active' : ''}`}>
                Admin
              </Link>
            ) : null}
          </nav>

          <form className="header-search" onSubmit={submitSearch} role="search">
            <IconSearch width={17} height={17} />
            <input
              type="search"
              placeholder="Search products…"
              aria-label="Search products"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </form>

          <div className="header-actions">
            <Link to="/cart" className="icon-btn" aria-label={`Shopping cart, ${cart.count} items`}>
              <IconCart />
              {cart.count > 0 ? <span className="cart-count">{cart.count}</span> : null}
            </Link>

            {user ? (
              <div className="account-menu" ref={menuRef}>
                <button
                  type="button"
                  className="account-trigger"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                >
                  <span className="avatar">{initials(user.name)}</span>
                  <span>{user.name.split(' ')[0]}</span>
                </button>
                {menuOpen ? (
                  <div className="menu" role="menu">
                    <div className="menu-head">
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                    <div className="menu-divider" />
                    <Link to="/profile" className="menu-item" role="menuitem">
                      <IconUser width={16} height={16} /> My profile
                    </Link>
                    <Link to="/orders" className="menu-item" role="menuitem">
                      Order history
                    </Link>
                    {isAdmin ? (
                      <Link to="/admin" className="menu-item" role="menuitem">
                        Admin dashboard
                      </Link>
                    ) : null}
                    <div className="menu-divider" />
                    <button type="button" className="menu-item" onClick={handleLogout} role="menuitem">
                      <IconLogout width={16} height={16} /> Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="row" style={{ gap: 8 }}>
                <Link to="/login" className="btn btn-outline btn-sm">
                  Sign in
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Sign up
                </Link>
              </div>
            )}

            <button
              type="button"
              className="icon-btn mobile-toggle"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </div>

        <div className={`mobile-nav${mobileOpen ? ' open' : ''}`}>
          <form className="header-search" onSubmit={submitSearch} style={{ display: 'flex', marginBottom: 10 }}>
            <IconSearch width={17} height={17} />
            <input
              type="search"
              placeholder="Search products…"
              aria-label="Search products"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </form>
          <Link to="/">Home</Link>
          <Link to="/shop">Shop all products</Link>
          <Link to="/cart">Cart ({cart.count})</Link>
          {user ? (
            <>
              <Link to="/orders">Order history</Link>
              <Link to="/profile">My profile</Link>
              {isAdmin ? <Link to="/admin">Admin dashboard</Link> : null}
              <button type="button" onClick={handleLogout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Link to="/register">Create account</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
