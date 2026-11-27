import { useEffect, useState } from 'react';
import { Link } from '../lib/router.jsx';
import { formatMoney, statusLabel } from '../lib/format.js';
import { IconBox, IconStar } from './icons.jsx';

export function Spinner({ light = false, size }) {
  return (
    <span
      className={`spinner${light ? ' light' : ''}`}
      style={size ? { width: size, height: size } : undefined}
      aria-hidden="true"
    />
  );
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="spinner-page" role="status" aria-live="polite">
      <div className="stack" style={{ alignItems: 'center', gap: 12 }}>
        <Spinner size={30} />
        <span className="muted small">{label}</span>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="product-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div className="skeleton-card" key={index}>
          <div className="skeleton media" />
          <div className="body">
            <div className="skeleton" style={{ height: 10, width: '40%' }} />
            <div className="skeleton" style={{ height: 14, width: '85%' }} />
            <div className="skeleton" style={{ height: 14, width: '55%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProductImage({ src, alt, className = '', fallbackClassName = 'product-media-fallback' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <div className={fallbackClassName} role="img" aria-label={alt}>
        <span>{String(alt || 'ShopSphere').slice(0, 2).toUpperCase()}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export function Stars({ rating = 0, count, showCount = true }) {
  const rounded = Math.round(Number(rating) || 0);
  return (
    <span className="stars">
      <IconStar className="star" width={13} height={13} />
      {Number(rating || 0).toFixed(1)}
      {showCount && count !== undefined ? <span className="muted">({count})</span> : null}
      <span className="sr-only">{rounded} out of 5 stars</span>
    </span>
  );
}

export function StatusBadge({ status }) {
  const value = String(status || '').toLowerCase();
  const cls = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(value)
    ? `badge-${value}`
    : 'badge-neutral';
  return <span className={`badge ${cls}`}>{statusLabel(status)}</span>;
}

export function EmptyState({ icon, title, message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon || <IconBox />}</div>
      <h3>{title}</h3>
      {message ? <p>{message}</p> : null}
      {action}
    </div>
  );
}

export function Alert({ type = 'error', children }) {
  if (!children) return null;
  return (
    <div className={type === 'success' ? 'form-success' : 'form-error'} role="alert">
      {children}
    </div>
  );
}

export function Field({ label, htmlFor, error, hint, children }) {
  return (
    <div className="field">
      {label ? <label htmlFor={htmlFor}>{label}</label> : null}
      {children}
      {hint && !error ? <span className="small muted">{hint}</span> : null}
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}

export function QuantityStepper({ value, onChange, min = 1, max = 99, disabled = false, small = false }) {
  return (
    <div className={`qty-stepper${small ? ' sm' : ''}`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span aria-live="polite">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

export function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </div>
        {children}
        {footer ? <div className="modal-actions">{footer}</div> : null}
      </div>
    </div>
  );
}

export function ProductLink({ id, name, className = 'product-name' }) {
  return (
    <Link to={`/product/${id}`} className={className}>
      {name}
    </Link>
  );
}

export function Money({ cents }) {
  return <>{formatMoney(cents)}</>;
}
