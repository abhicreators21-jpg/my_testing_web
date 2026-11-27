import { useEffect, useState } from 'react';
import { Link } from '../lib/router.jsx';
import { api } from '../lib/api.js';
import { formatDate } from '../lib/format.js';
import { useAuth } from '../state/AuthContext.jsx';
import { useToast } from '../state/ToastContext.jsx';
import { Alert, Field } from '../components/ui.jsx';

const FIELDS = [
  { key: 'name', label: 'Full name', autoComplete: 'name' },
  { key: 'phone', label: 'Phone', autoComplete: 'tel' },
  { key: 'address', label: 'Street address', autoComplete: 'street-address', wide: true },
  { key: 'city', label: 'City', autoComplete: 'address-level2' },
  { key: 'zip', label: 'ZIP / postal code', autoComplete: 'postal-code' },
  { key: 'country', label: 'Country', autoComplete: 'country-name' },
];

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    zip: '',
    country: '',
  });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      zip: user.zip || '',
      country: user.country || '',
    });
  }, [user]);

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setError('');
    setErrors({});
    if (form.name.trim().length < 2) {
      setErrors({ name: 'Enter your full name' });
      return;
    }
    setSaving(true);
    try {
      const data = await api.patch('/auth/profile', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        zip: form.zip.trim(),
        country: form.country.trim(),
      });
      setUser(data.user);
      toast.success('Profile updated');
    } catch (err) {
      setError(err.message);
      if (err.fields) setErrors(err.fields);
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');
    if (passwords.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    if (passwords.newPassword !== passwords.confirm) {
      setPasswordError('New passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      await api.patch('/auth/profile', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Password changed');
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>My profile</h1>
          <p className="muted">
            Member since {formatDate(user?.createdAt)} · {user?.email}
          </p>
        </div>
        <Link to="/orders" className="btn btn-outline">
          My orders
        </Link>
      </div>

      <div className="detail-layout">
        <form className="card" onSubmit={saveProfile} noValidate>
          <h2>Account details</h2>
          <Alert>{error}</Alert>
          <div className="form-grid">
            {FIELDS.map((field) => (
              <Field
                key={field.key}
                label={field.label}
                htmlFor={`profile-${field.key}`}
                error={errors[field.key]}
                className={field.wide ? 'span-2' : undefined}
              >
                <input
                  id={`profile-${field.key}`}
                  className="input"
                  value={form[field.key]}
                  onChange={update(field.key)}
                  autoComplete={field.autoComplete}
                />
              </Field>
            ))}
          </div>
          <Field label="Email address" htmlFor="profile-email" hint="Email changes are disabled.">
            <input id="profile-email" className="input" value={user?.email || ''} disabled />
          </Field>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>

        <aside className="card">
          <h2>Change password</h2>
          <Alert>{passwordError}</Alert>
          <form onSubmit={savePassword} noValidate>
            <Field label="Current password" htmlFor="pw-current">
              <input
                id="pw-current"
                className="input"
                type="password"
                autoComplete="current-password"
                value={passwords.currentPassword}
                onChange={(event) =>
                  setPasswords((current) => ({ ...current, currentPassword: event.target.value }))
                }
              />
            </Field>
            <Field label="New password" htmlFor="pw-new" hint="At least 8 characters.">
              <input
                id="pw-new"
                className="input"
                type="password"
                autoComplete="new-password"
                value={passwords.newPassword}
                onChange={(event) =>
                  setPasswords((current) => ({ ...current, newPassword: event.target.value }))
                }
              />
            </Field>
            <Field label="Confirm new password" htmlFor="pw-confirm">
              <input
                id="pw-confirm"
                className="input"
                type="password"
                autoComplete="new-password"
                value={passwords.confirm}
                onChange={(event) =>
                  setPasswords((current) => ({ ...current, confirm: event.target.value }))
                }
              />
            </Field>
            <button type="submit" className="btn btn-outline btn-block" disabled={savingPassword}>
              {savingPassword ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
