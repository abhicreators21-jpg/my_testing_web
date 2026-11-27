import { useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import { parseLocation, useLocation } from './lib/router.jsx';
import { AuthProvider } from './state/AuthContext.jsx';
import { CartProvider } from './state/CartContext.jsx';
import { ToastProvider } from './state/ToastContext.jsx';

import Home from './pages/Home.jsx';
import Shop from './pages/Shop.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import Profile from './pages/Profile.jsx';
import NotFound from './pages/NotFound.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminProducts from './pages/admin/AdminProducts.jsx';
import AdminCategories from './pages/admin/AdminCategories.jsx';
import AdminOrders from './pages/admin/AdminOrders.jsx';
import AdminCustomers from './pages/admin/AdminCustomers.jsx';

function Routes() {
  const location = useLocation();
  const { pathname, segments } = parseLocation(location);
  const [first, second] = segments;

  let page;
  let hideFooter = false;

  switch (first) {
    case undefined:
      page = <Home />;
      break;
    case 'shop':
      page = <Shop />;
      break;
    case 'product':
      page = <ProductDetail id={second} />;
      break;
    case 'cart':
      page = <Cart />;
      break;
    case 'checkout':
      page = (
        <RequireAuth>
          <Checkout />
        </RequireAuth>
      );
      break;
    case 'login':
      page = <Login />;
      break;
    case 'register':
      page = <Register />;
      break;
    case 'orders':
      page = second ? (
        <RequireAuth>
          <OrderDetail id={second} />
        </RequireAuth>
      ) : (
        <RequireAuth>
          <Orders />
        </RequireAuth>
      );
      break;
    case 'profile':
      page = (
        <RequireAuth>
          <Profile />
        </RequireAuth>
      );
      break;
    case 'admin': {
      hideFooter = true;
      const section = {
        undefined: <AdminDashboard />,
        products: <AdminProducts />,
        categories: <AdminCategories />,
        orders: <AdminOrders />,
        customers: <AdminCustomers />,
      }[second];
      page = (
        <RequireAuth admin>
          {section || <NotFound />}
        </RequireAuth>
      );
      break;
    }
    default:
      page = <NotFound />;
  }

  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main" key={pathname}>
        {page}
      </main>
      {hideFooter ? null : <Footer />}
    </div>
  );
}

export default function App() {
  useEffect(() => {
    if (!window.history.state) window.history.replaceState({}, '', window.location.pathname + window.location.search);
  }, []);

  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <Routes />
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  );
}
