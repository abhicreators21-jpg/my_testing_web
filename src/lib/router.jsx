/** Minimal history-API router (no external dependency). */
import { useEffect, useState } from 'react';

export function currentPath() {
  return `${window.location.pathname}${window.location.search}`;
}

export function navigate(to, { replace = false, keepScroll = false } = {}) {
  if (to === currentPath()) return;
  if (replace) window.history.replaceState({}, '', to);
  else window.history.pushState({}, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
  if (!keepScroll) window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

export function useLocation() {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const onChange = () => setPath(currentPath());
    window.addEventListener('popstate', onChange);
    return () => window.removeEventListener('popstate', onChange);
  }, []);
  return path;
}

/** Splits "/admin/products?x=1" into { pathname, search, segments, query }. */
export function parseLocation(location) {
  const [pathname, search = ''] = location.split('?');
  const segments = pathname.split('/').filter(Boolean);
  return {
    pathname,
    search,
    segments,
    query: new URLSearchParams(search),
  };
}

export function Link({ to, children, className = '', onClick, ...rest }) {
  return (
    <a
      href={to}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        onClick?.(event);
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
