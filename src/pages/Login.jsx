import { useState } from 'react';
import { Link, navigate, parseLocation, useLocation } from '../lib/router.jsx';
import { useAuth } from '../state/AuthContext.jsx';
import { useCart } from '../state/CartContext.jsx';
import { useToast } from '../state/ToastContext.jsx';
import { Alert, Field } from '../components/ui.jsx';

export default function Login() {
  const { login } = useAuth();
  const { refresh } = useCart();
  const toast = useToast();
  const { query } = parseLocation(useLocation());
  const next = query.get('next') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setErrors({});
    const nextErrors = {};
    if (!email.trim()) nextErrors.email = 'Email is required';
    if (!password) nextErrors.password = 'Password is required';
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      await refresh();
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`);
      navigate(user.role === 'admin' && next === '/' ? '/admin' : next);
    } catch (err) {
      setError(err.message);
      if (err.fields) setErrors(err.fields);
    } finally {
      setLoading(false);
    }
  };

  const fill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="container auth-page">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="muted">Sign in to sync your cart, place orders and track deliveries.</p>

        <form onSubmit={submit} noValidate>
          <Alert>{error}</Alert>
          <Field label="Email address" htmlFor="login-email" error={errors.email}>
            <input
              id="login-email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label="Password" htmlFor="login-password" error={errors.password}>
            <input
              id="login-password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-alt">
          New to ShopSphere? <Link to="/register">Create an account</Link>
        </p>

        <div className="demo-box">
          <strong>Demo accounts</strong>
          <button type="button" onClick={() => fill('admin@shopsphere.com', 'Admin@12345')}>
            Admin · admin@shopsphere.com
          </button>
          <button type="button" onClick={() => fill('demo@shopsphere.com', 'Demo@12345')}>
            Customer · demo@shopsphere.com
          </button>
          <small>Passwords: Admin@12345 / Demo@12345</small>
        </div>
      </div>
    </div>
  );
}
