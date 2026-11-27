import { Link, useLocation, parseLocation } from '../lib/router.jsx';
import { useAuth } from '../state/AuthContext.jsx';
import {
  IconBox,
  IconChart,
  IconGrid,
  IconOrders,
  IconUsers,
} from '../components/icons.jsx';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: IconChart, exact: true },
  { to: '/admin/products', label: 'Products', icon: IconBox },
  { to: '/admin/categories', label: 'Categories', icon: IconGrid },
  { to: '/admin/orders', label: 'Orders', icon: IconOrders },
  { to: '/admin/customers', label: 'Customers', icon: IconUsers },
];

export default function AdminLayout({ children, title, subtitle, actions }) {
  const { user } = useAuth();
  const { pathname } = parseLocation(useLocation());

  return (
    <div className="container page admin-page">
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-head">
            <span className="brand-mark">S</span>
            <div>
              <strong>Admin console</strong>
              <span className="muted small">{user?.name}</span>
            </div>
          </div>
          <nav aria-label="Admin sections">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <Link key={item.to} to={item.to} className={`admin-link${active ? ' active' : ''}`}>
                  <Icon width={18} height={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Link to="/" className="admin-link back">
            ← Back to store
          </Link>
        </aside>

        <section className="admin-main">
          <header className="admin-head">
            <div>
              <h1>{title}</h1>
              {subtitle ? <p className="muted">{subtitle}</p> : null}
            </div>
            {actions ? <div className="row-gap">{actions}</div> : null}
          </header>
          {children}
        </section>
      </div>
    </div>
  );
}
