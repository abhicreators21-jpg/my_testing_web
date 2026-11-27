import { useEffect, useMemo, useState } from 'react';
import { Link } from '../../lib/router.jsx';
import { api } from '../../lib/api.js';
import { formatMoney } from '../../lib/format.js';
import { useToast } from '../../state/ToastContext.jsx';
import { Alert, Field, Modal, PageLoader, ProductImage } from '../../components/ui.jsx';
import { IconTrash } from '../../components/icons.jsx';
import AdminLayout from './AdminLayout.jsx';

const EMPTY = {
  name: '',
  categoryId: '',
  price: '',
  stock: '10',
  imageUrl: '',
  description: '',
  featured: false,
};

export default function AdminProducts() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editor, setEditor] = useState(null); // { mode: 'create'|'edit', id?, form }
  const [form, setForm] = useState(EMPTY);
  const [formErrors, setFormErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [productData, categoryData] = await Promise.all([
        api.get('/admin/products'),
        api.get('/admin/categories'),
      ]);
      setProducts(productData.products);
      setCategories(categoryData.categories);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesTerm =
        !term ||
        product.name.toLowerCase().includes(term) ||
        (product.category?.name || '').toLowerCase().includes(term);
      const matchesCategory =
        categoryFilter === 'all' || String(product.category?.id) === String(categoryFilter);
      return matchesTerm && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  const openCreate = () => {
    setForm({ ...EMPTY, categoryId: categories[0]?.id ? String(categories[0].id) : '' });
    setFormErrors({});
    setFormError('');
    setEditor({ mode: 'create' });
  };

  const openEdit = (product) => {
    setForm({
      name: product.name,
      categoryId: product.category?.id ? String(product.category.id) : '',
      price: (product.priceCents / 100).toFixed(2),
      stock: String(product.stock),
      imageUrl: product.imageUrl || '',
      description: product.description || '',
      featured: product.featured,
    });
    setFormErrors({});
    setFormError('');
    setEditor({ mode: 'edit', id: product.id });
  };

  const update = (key) => (event) => {
    const value = key === 'featured' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
    setFormErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError('');
    const nextErrors = {};
    if (form.name.trim().length < 2) nextErrors.name = 'Enter a product name';
    if (!Number(form.price) || Number(form.price) <= 0) nextErrors.price = 'Enter a price above 0';
    if (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) {
      nextErrors.stock = 'Stock must be 0 or more';
    }
    if (!form.categoryId) nextErrors.categoryId = 'Choose a category';
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        stock: Number(form.stock),
        categoryId: Number(form.categoryId),
        imageUrl: form.imageUrl.trim(),
        featured: form.featured ? 1 : 0,
      };
      if (editor.mode === 'create') {
        const data = await api.post('/admin/products', payload);
        setProducts((current) => [data.product, ...current]);
        toast.success(`“${data.product.name}” created`);
      } else {
        const data = await api.put(`/admin/products/${editor.id}`, payload);
        setProducts((current) => current.map((p) => (p.id === data.product.id ? data.product : p)));
        toast.success(`“${data.product.name}” updated`);
      }
      setEditor(null);
    } catch (err) {
      setFormError(err.message);
      if (err.fields) setFormErrors(err.fields);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await api.del(`/admin/products/${deleting.id}`);
      setProducts((current) => current.filter((product) => product.id !== deleting.id));
      toast.success(`“${deleting.name}” deleted`);
      setDeleting(null);
    } catch (err) {
      toast.error(err.message);
      setDeleting(null);
    }
  };

  return (
    <AdminLayout
      title="Products"
      subtitle={`${products.length} product(s) in the catalog`}
      actions={
        <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
          + Add product
        </button>
      }
    >
      <Alert>{error}</Alert>

      <div className="card">
        <div className="toolbar">
          <input
            className="input"
            placeholder="Search products…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search products"
          />
          <select
            className="input"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <PageLoader label="Loading products…" />
        ) : filtered.length === 0 ? (
          <p className="muted" style={{ padding: 16 }}>
            No products match your filters.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th className="num">Price</th>
                  <th className="num">Stock</th>
                  <th>Featured</th>
                  <th className="num">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="table-product">
                        <div className="table-thumb">
                          <ProductImage src={product.imageUrl} alt={product.name} />
                        </div>
                        <div>
                          <Link to={`/product/${product.id}`}>{product.name}</Link>
                          <div className="muted small">#{product.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>{product.category?.name || '—'}</td>
                    <td className="num">{formatMoney(product.priceCents)}</td>
                    <td className="num">
                      <span className={product.stock === 0 ? 'text-danger' : product.stock <= 10 ? 'text-warn' : ''}>
                        {product.stock}
                      </span>
                    </td>
                    <td>{product.featured ? 'Yes' : '—'}</td>
                    <td className="num">
                      <div className="row-gap" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(product)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm text-danger"
                          onClick={() => setDeleting(product)}
                          aria-label={`Delete ${product.name}`}
                        >
                          <IconTrash width={15} height={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editor && (
        <Modal
          title={editor.mode === 'create' ? 'Add product' : 'Edit product'}
          onClose={() => setEditor(null)}
        >
          <form onSubmit={submit} noValidate>
            <Alert>{formError}</Alert>
            <Field label="Product name" htmlFor="ap-name" error={formErrors.name}>
              <input id="ap-name" className="input" value={form.name} onChange={update('name')} />
            </Field>
            <div className="form-grid">
              <Field label="Price (USD)" htmlFor="ap-price" error={formErrors.price}>
                <input
                  id="ap-price"
                  className="input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.price}
                  onChange={update('price')}
                />
              </Field>
              <Field label="Stock" htmlFor="ap-stock" error={formErrors.stock}>
                <input
                  id="ap-stock"
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={update('stock')}
                />
              </Field>
            </div>
            <Field label="Category" htmlFor="ap-category" error={formErrors.categoryId}>
              <select id="ap-category" className="input" value={form.categoryId} onChange={update('categoryId')}>
                <option value="">Select a category…</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Image URL" htmlFor="ap-image" error={formErrors.imageUrl} hint="Optional. Leave blank for a placeholder.">
              <input id="ap-image" className="input" value={form.imageUrl} onChange={update('imageUrl')} />
            </Field>
            <Field label="Description" htmlFor="ap-description" error={formErrors.description}>
              <textarea
                id="ap-description"
                className="input"
                rows={4}
                value={form.description}
                onChange={update('description')}
              />
            </Field>
            <label className="checkbox-row">
              <input type="checkbox" checked={form.featured} onChange={update('featured')} />
              Feature this product on the home page
            </label>

            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setEditor(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editor.mode === 'create' ? 'Create product' : 'Save changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete product" onClose={() => setDeleting(null)}>
          <p>
            Delete <strong>{deleting.name}</strong>? Existing orders keep their item snapshot, but the
            product will disappear from the store.
          </p>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => setDeleting(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmDelete}>
              Delete product
            </button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
