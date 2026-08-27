import { useCallback, useEffect, useState } from 'react';
import * as api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import NewMenuItemForm from '../components/NewMenuItemForm';

export default function MenuPage() {
  const { token, user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'admin';

  const load = useCallback(async () => {
    try {
      const res = await api.getMenuItems(token);
      setItems(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // See the same note in OrdersPage — standard fetch-on-mount effect.
    // eslint-disable-next-line react/set-state-in-effect
    load();
  }, [load]);

  async function toggleAvailability(item) {
    const res = await api.updateMenuItem(token, item._id, {
      isAvailable: !item.isAvailable,
    });
    setItems((prev) => prev.map((i) => (i._id === item._id ? res.data : i)));
  }

  async function handleDelete(id) {
    await api.deleteMenuItem(token, id);
    setItems((prev) => prev.filter((i) => i._id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Menu</h1>
        {isAdmin && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="text-sm font-medium rounded-lg bg-gradient-to-br from-ember to-paprika text-white px-4 py-2"
          >
            {showForm ? 'Close' : '+ Add item'}
          </button>
        )}
      </div>

      {showForm && isAdmin && (
        <NewMenuItemForm
          onCreated={(item) => {
            setItems((prev) => [item, ...prev]);
            setShowForm(false);
          }}
        />
      )}

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <p className="text-sm text-ink-muted">Loading menu…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-ink-muted">No menu items yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item._id}
              className="bg-surface border border-line rounded-xl p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium">{item.name}</h3>
                <span className="font-mono text-sm text-paprika whitespace-nowrap">
                  Rs {item.price}
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-1">{item.category}</p>
              {item.description && (
                <p className="text-sm text-ink-muted mt-2">{item.description}</p>
              )}

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-line">
                <button
                  onClick={() => toggleAvailability(item)}
                  disabled={!isAdmin}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    item.isAvailable ? 'bg-green-50 text-green-700' : 'bg-line text-ink-muted'
                  } ${isAdmin ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {item.isAvailable ? 'Available' : 'Unavailable'}
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(item._id)}
                    className="text-xs text-ink-muted hover:text-paprika"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
