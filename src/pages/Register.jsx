import { useState } from 'react';
import { Link, navigate, parseLocation, useLocation } from '../lib/router.jsx';
import { useAuth } from '../state/AuthContext.jsx';
import { useCart } from '../state/CartContext.jsx';
import { useToast } from '../state/ToastContext.jsx';
import { Alert, Field } from '../components/ui.jsx';

export default function Register() {
  const { register } = useAuth();
  const { refresh } = useCart();
  const toast = useToast();
  const { query } = parseLocation(useLocation());
  const next = query.get('next') || '/';

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const nextErrors = {};
    if (form.name.trim().length < 2) nextErrors.name = 'Enter your full name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) nextErrors.email = 'Enter a valid email address';
    if (form.password.length < 8) nextErrors.password = 'Use at least 8 characters';
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      nextErrors.password = 'Include at least one letter and one number';
    }
    if (form.confirm !== form.password) nextErrors.confirm = 'Passwords do not match';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      const user = await register(form.name.trim(), form.email.trim(), form.password);
      await refresh();
      toast.success(`Account created — welcome, ${user.name.split(' ')[0]}!`);
      navigate(next);
    } catch (err) {
      setError(err.message);
      if (err.fields) setErrors(err.fields);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container auth-page">
      <div className="auth-card">
        <h1>Create your account</h1>
        <p className="muted">Save your cart, check out faster and track every order.</p>

        <form onSubmit={submit} noValidate>
          <Alert>{error}</Alert>
          <Field label="Full name" htmlFor="reg-name" error={errors.name}>
            <input
              id="reg-name"
              className="input"
              autoComplete="name"
              value={form.name}
              onChange={update('name')}
            />
          </Field>
          <Field label="Email address" htmlFor="reg-email" error={errors.email}>
            <input
              id="reg-email"
              className="input"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={update('email')}
            />
          </Field>
          <Field
            label="Password"
            htmlFor="reg-password"
            error={errors.password}
            hint="At least 8 characters, with a letter and a number."
          >
            <input
              id="reg-password"
              className="input"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={update('password')}
            />
          </Field>
          <Field label="Confirm password" htmlFor="reg-confirm" error={errors.confirm}>
            <input
              id="reg-confirm"
              className="input"
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={update('confirm')}
            />
          </Field>
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-alt">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
