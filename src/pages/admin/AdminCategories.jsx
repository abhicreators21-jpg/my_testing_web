import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useToast } from '../../state/ToastContext.jsx';
import { Alert, Field, Modal, PageLoader } from '../../components/ui.jsx';
import AdminLayout from './AdminLayout.jsx';

export default function AdminCategories() {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [formError, setFormError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/categories');
      setCategories(data.categories);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm({ name: '', description: '' });
    setFormError('');
    setFormErrors({});
    setEditor({ mode: 'create' });
  };

  const openEdit = (category) => {
    setForm({ name: category.name, description: category.description || '' });
    setFormError('');
    setFormErrors({});
    setEditor({ mode: 'edit', id: category.id });
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (form.name.trim().length < 2) {
      setFormErrors({ name: 'Enter a category name' });
      return;
    }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() };
      if (editor.mode === 'create') {
        const data = await api.post('/admin/categories', payload);
        setCategories((current) =>
          [...current, data.category].sort((a, b) => a.name.localeCompare(b.name)),
        );
        toast.success(`Category “${data.category.name}” created`);
      } else {
        const data = await api.put(`/admin/categories/${editor.id}`, payload);
        setCategories((current) =>
          current
            .map((category) => (category.id === data.category.id ? data.category : category))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        toast.success(`Category “${data.category.name}” updated`);
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
    try {
      await api.del(`/admin/categories/${deleting.id}`);
      setCategories((current) => current.filter((category) => category.id !== deleting.id));
      toast.success('Category deleted');
      setDeleting(null);
    } catch (err) {
      toast.error(err.message);
      setDeleting(null);
    }
  };

  return (
    <AdminLayout
      title="Categories"
      subtitle="Group products so shoppers can browse by department."
      actions={
        <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
          + Add category
        </button>
      }
    >
      <Alert>{error}</Alert>

      {loading ? (
        <PageLoader label="Loading categories…" />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Description</th>
                  <th className="num">Products</th>
                  <th className="num">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <strong>{category.name}</strong>
                    </td>
                    <td className="muted small">{category.slug}</td>
                    <td className="muted small">{category.description || '—'}</td>
                    <td className="num">{category.productCount}</td>
                    <td className="num">
                      <div className="row-gap" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(category)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm text-danger"
                          onClick={() => setDeleting(category)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editor && (
        <Modal
          title={editor.mode === 'create' ? 'Add category' : 'Edit category'}
          onClose={() => setEditor(null)}
        >
          <form onSubmit={submit} noValidate>
            <Alert>{formError}</Alert>
            <Field label="Category name" htmlFor="ac-name" error={formErrors.name}>
              <input
                id="ac-name"
                className="input"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </Field>
            <Field label="Description" htmlFor="ac-description">
              <textarea
                id="ac-description"
                className="input"
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </Field>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setEditor(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editor.mode === 'create' ? 'Create category' : 'Save changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete category" onClose={() => setDeleting(null)}>
          <p>
            Delete <strong>{deleting.name}</strong>? Categories can only be removed when they contain
            no products.
          </p>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => setDeleting(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmDelete}>
              Delete category
            </button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
