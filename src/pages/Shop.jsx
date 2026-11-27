import { useEffect, useMemo, useState } from 'react';
import { api, queryString } from '../lib/api.js';
import { navigate, parseLocation, useLocation } from '../lib/router.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { IconClose, IconSearch } from '../components/icons.jsx';
import { Alert, EmptyState, SkeletonGrid } from '../components/ui.jsx';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest arrivals' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'name', label: 'Name: A–Z' },
];

export default function Shop() {
  const location = useLocation();
  const { query } = parseLocation(location);

  const filters = useMemo(
    () => ({
      search: query.get('search') || '',
      category: query.get('category') || '',
      minPrice: query.get('minPrice') || '',
      maxPrice: query.get('maxPrice') || '',
      inStock: query.get('inStock') === 'true',
      sort: query.get('sort') || 'newest',
      page: Number(query.get('page')) || 1,
    }),
    [location],
  );

  const [searchInput, setSearchInput] = useState(filters.search);
  const [categories, setCategories] = useState([]);
  const [data, setData] = useState({ products: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => setSearchInput(filters.search), [filters.search]);

  useEffect(() => {
    api
      .get('/categories')
      .then((res) => setCategories(res.categories || []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .get(
        `/products${queryString({
          search: filters.search,
          category: filters.category,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          inStock: filters.inStock ? 'true' : '',
          sort: filters.sort,
          page: filters.page,
          limit: 12,
        })}`,
      )
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters.search, filters.category, filters.minPrice, filters.maxPrice, filters.inStock, filters.sort, filters.page]);

  const applyFilters = (patch) => {
    const next = { ...filters, page: 1, ...patch };
    const qs = queryString({
      search: next.search,
      category: next.category,
      minPrice: next.minPrice,
      maxPrice: next.maxPrice,
      inStock: next.inStock ? 'true' : '',
      sort: next.sort === 'newest' ? '' : next.sort,
    });
    navigate(`/shop${qs}`);
  };

  const activeCategory = categories.find((category) => category.slug === filters.category);
  const hasFilters =
    Boolean(filters.search || filters.category || filters.minPrice || filters.maxPrice || filters.inStock);

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{activeCategory ? activeCategory.name : 'All products'}</h1>
          <p className="muted">
            {loading ? 'Loading products…' : `${data.total} product${data.total === 1 ? '' : 's'} available`}
            {filters.search ? ` for “${filters.search}”` : ''}
          </p>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <label className="sr-only" htmlFor="sort">
            Sort products
          </label>
          <select
            id="sort"
            className="select"
            value={filters.sort}
            onChange={(event) => applyFilters({ sort: event.target.value })}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="shop-layout">
        <aside className="filters" aria-label="Product filters">
          <form
            className="filter-block"
            onSubmit={(event) => {
              event.preventDefault();
              applyFilters({ search: searchInput.trim() });
            }}
          >
            <h3>Search</h3>
            <div className="search-field">
              <IconSearch width={16} height={16} />
              <input
                type="search"
                placeholder="Product name…"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                aria-label="Search products"
              />
            </div>
            <button type="submit" className="btn btn-outline btn-sm btn-block" style={{ marginTop: 8 }}>
              Apply search
            </button>
          </form>

          <div className="filter-block">
            <h3>Category</h3>
            <div className="filter-list">
              <button
                type="button"
                className={`filter-item${!filters.category ? ' active' : ''}`}
                onClick={() => applyFilters({ category: '' })}
              >
                All categories
                <span>{categories.reduce((sum, category) => sum + category.productCount, 0)}</span>
              </button>
              {categories.map((category) => (
                <button
                  type="button"
                  key={category.id}
                  className={`filter-item${filters.category === category.slug ? ' active' : ''}`}
                  onClick={() => applyFilters({ category: category.slug })}
                >
                  {category.name}
                  <span>{category.productCount}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="filter-block">
            <h3>Price range</h3>
            <div className="row" style={{ gap: 8 }}>
              <input
                className="input"
                type="number"
                min="0"
                placeholder="Min $"
                aria-label="Minimum price"
                defaultValue={filters.minPrice}
                key={`min-${filters.minPrice}`}
                onBlur={(event) => {
                  if (event.target.value !== filters.minPrice) applyFilters({ minPrice: event.target.value });
                }}
              />
              <input
                className="input"
                type="number"
                min="0"
                placeholder="Max $"
                aria-label="Maximum price"
                defaultValue={filters.maxPrice}
                key={`max-${filters.maxPrice}`}
                onBlur={(event) => {
                  if (event.target.value !== filters.maxPrice) applyFilters({ maxPrice: event.target.value });
                }}
              />
            </div>
            <label className="check-row" style={{ marginTop: 12 }}>
              <input
                type="checkbox"
                checked={filters.inStock}
                onChange={(event) => applyFilters({ inStock: event.target.checked })}
              />
              In stock only
            </label>
          </div>

          {hasFilters ? (
            <button type="button" className="btn btn-ghost btn-sm btn-block" onClick={() => navigate('/shop')}>
              <IconClose width={14} height={14} /> Clear all filters
            </button>
          ) : null}
        </aside>

        <div>
          {error ? <Alert>{error}</Alert> : null}

          {loading ? (
            <SkeletonGrid count={6} />
          ) : data.products.length === 0 ? (
            <EmptyState
              title="No products match those filters"
              message="Try a different search term, widen the price range or clear the filters."
              action={
                <button type="button" className="btn btn-primary" onClick={() => navigate('/shop')}>
                  Reset filters
                </button>
              }
            />
          ) : (
            <>
              <div className="product-grid">
                {data.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {data.pages > 1 ? (
                <nav className="pagination" aria-label="Pagination">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={filters.page <= 1}
                    onClick={() => {
                      const qs = queryString({
                        search: filters.search,
                        category: filters.category,
                        minPrice: filters.minPrice,
                        maxPrice: filters.maxPrice,
                        inStock: filters.inStock ? 'true' : '',
                        sort: filters.sort === 'newest' ? '' : filters.sort,
                        page: filters.page - 1,
                      });
                      navigate(`/shop${qs}`);
                    }}
                  >
                    ← Previous
                  </button>
                  <span className="small muted">
                    Page {data.page} of {data.pages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={filters.page >= data.pages}
                    onClick={() => {
                      const qs = queryString({
                        search: filters.search,
                        category: filters.category,
                        minPrice: filters.minPrice,
                        maxPrice: filters.maxPrice,
                        inStock: filters.inStock ? 'true' : '',
                        sort: filters.sort === 'newest' ? '' : filters.sort,
                        page: filters.page + 1,
                      });
                      navigate(`/shop${qs}`);
                    }}
                  >
                    Next →
                  </button>
                </nav>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
