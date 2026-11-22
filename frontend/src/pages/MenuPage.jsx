import { useCallback, useEffect, useState } from 'react';
import * as api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { formatMoney } from '../lib/currency';
import NewMenuItemForm from '../components/NewMenuItemForm';
import {
  CategoryIllustration,
  PlusIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
} from '../components/Icons';

const CATEGORIES = ['All', 'Starters', 'Main Course', 'Desserts', 'Beverages', 'Sides'];

export default function MenuPage() {
  const { token, user, organization } = useAuth();
  const currency = organization?.currency || 'PKR';
  const toast = useToast();
  const isAdmin = user?.role === 'admin';

  const [items, setItems] = useState([]);
  const [category, setCategory] = useState('All');
  const [availability, setAvailability] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await api.getMenuItems(token, {
        category: category === 'All' ? undefined : category,
        available: availability === 'all' ? undefined : availability,
        search: search.trim() || undefined,
      });
      setItems(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  }, [token, category, availability, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  async function toggleAvailability(item) {
    setBusyId(item._id);
    try {
      const res = await api.updateMenuItem(token, item._id, {
        isAvailable: !item.isAvailable,
      });
      setItems((prev) => prev.map((i) => (i._id === item._id ? res.data : i)));
      toast.success(`"${item.name}" marked ${res.data.isAvailable ? 'available' : 'unavailable'}`);
    } catch (err) {
      toast.error(err.message || 'Failed to update availability');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.name}" from the menu?`)) return;
    setBusyId(item._id);
    try {
      await api.deleteMenuItem(token, item._id);
      setItems((prev) => prev.filter((i) => i._id !== item._id));
      if (editingItem?._id === item._id) setEditingItem(null);
      toast.success(`"${item.name}" deleted`);
    } catch (err) {
      toast.error(err.message || 'Failed to delete menu item');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Menu</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Catalog pricing, category artwork, and real-time kitchen availability
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setShowForm((s) => !s);
            }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg bg-gradient-to-br from-ember to-paprika text-white px-4 py-2 shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            {showForm ? 'Close form' : 'Add item'}
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setCategory(c)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                category === c
                  ? 'bg-ink text-white border-ink'
                  : 'bg-surface border-line text-ink-muted hover:text-ink hover:border-ink-muted'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Filter by availability"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-ember/40"
          >
            <option value="all">All status</option>
            <option value="true">Available</option>
            <option value="false">Unavailable</option>
          </select>
          <div className="relative w-full sm:w-52">
            <SearchIcon className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              placeholder="Search menu…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface pl-9 pr-3 py-1.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember"
            />
          </div>
        </div>
      </div>

      {showForm && isAdmin && (
        <NewMenuItemForm
          onCreated={(item) => {
            setItems((prev) => [item, ...prev]);
            setShowForm(false);
            toast.success(`"${item.name}" added to menu`);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingItem && isAdmin && (
        <NewMenuItemForm
          key={editingItem._id}
          initialItem={editingItem}
          onSaved={(updated) => {
            setItems((prev) => prev.map((i) => (i._id === updated._id ? updated : i)));
            setEditingItem(null);
            toast.success(`"${updated.name}" updated`);
          }}
          onCancel={() => setEditingItem(null)}
        />
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-ink-muted">Loading menu…</p>
      ) : items.length === 0 ? (
        <div className="bg-surface border border-line rounded-xl p-8 text-center">
          <p className="text-sm font-medium text-ink">No menu items match this filter.</p>
          <p className="text-xs text-ink-muted mt-1">
            Add items to your catalog or clear the active search filter.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const isBusy = busyId === item._id;
            return (
              <div
                key={item._id}
                className="bg-surface border border-line rounded-xl p-5 shadow-xs hover:border-ink-muted/40 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start gap-3">
                    <CategoryIllustration category={item.category} className="w-11 h-11 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-ink leading-snug">{item.name}</h3>
                        <span className="font-mono text-sm font-semibold text-paprika whitespace-nowrap">
                          {formatMoney(item.price, currency)}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-ink-muted mt-0.5">{item.category}</p>
                    </div>
                  </div>
                  {item.description && (
                    <p className="text-sm text-ink-muted mt-3 leading-relaxed">{item.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-line">
                  <button
                    type="button"
                    onClick={() => toggleAvailability(item)}
                    disabled={!isAdmin || isBusy}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border disabled:opacity-60 ${
                      item.isAvailable
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-surface-alt text-ink-muted border-line'
                    } ${isAdmin ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    {isBusy ? 'Saving…' : item.isAvailable ? 'Available' : 'Unavailable'}
                  </button>
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setShowForm(false);
                          setEditingItem(item);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink px-2 py-1 rounded-md hover:bg-surface-alt cursor-pointer"
                      >
                        <EditIcon className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDelete(item)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-50 cursor-pointer"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
