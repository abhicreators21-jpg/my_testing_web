import { Link } from '../lib/router.jsx';

export default function NotFound() {
  return (
    <div className="container page">
      <div className="empty-state card">
        <span className="empty-icon">🧭</span>
        <h1>Page not found</h1>
        <p>The page you are looking for does not exist or has moved.</p>
        <Link to="/" className="btn btn-primary">
          Back to the store
        </Link>
      </div>
    </div>
  );
}
