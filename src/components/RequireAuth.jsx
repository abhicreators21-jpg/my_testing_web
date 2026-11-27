import { useEffect } from 'react';
import { navigate } from '../lib/router.jsx';
import { useAuth } from '../state/AuthContext.jsx';
import { PageLoader } from './ui.jsx';

/** Route guard: redirects anonymous visitors to sign in, and non-admins home. */
export default function RequireAuth({ children, admin = false }) {
  const { user, loading, isAdmin } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      navigate(`/login?next=${next}`, { replace: true });
      return;
    }
    if (admin && !isAdmin) navigate('/', { replace: true });
  }, [user, loading, admin, isAdmin]);

  if (loading) return <PageLoader label="Checking your session…" />;
  if (!user) return <PageLoader label="Redirecting to sign in…" />;
  if (admin && !isAdmin) return <PageLoader label="Redirecting…" />;
  return children;
}
