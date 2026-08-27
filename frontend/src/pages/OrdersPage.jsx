import { useCallback, useEffect, useState } from 'react';
import * as api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { nextStatuses, STATUS_LABELS } from '../lib/orderStatus';
import StatusStepper from '../components/StatusStepper';
import NewOrderForm from '../components/NewOrderForm';

const FILTERS = ['all', 'pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];

export default function OrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [ordersRes, menuRes] = await Promise.all([
        api.getOrders(token, filter === 'all' ? undefined : filter),
        api.getMenuItems(token),
      ]);
      setOrders(ordersRes.data);
      setMenuItems(menuRes.data);
    } catch (err) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => {
    // Standard fetch-on-mount / fetch-on-filter-change effect — react.dev
    // lists data fetching as a canonical valid effect use case. The rule
    // below wants a data-fetching library instead, which is disproportionate
    // for a project this size.
    // eslint-disable-next-line react/set-state-in-effect
    load();
  }, [load]);

  async function advanceStatus(order, status) {
    const res = await api.updateOrderStatus(token, order._id, status);
    setOrders((prev) => prev.map((o) => (o._id === order._id ? res.data : o)));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-2xl font-bold">Orders</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="text-sm font-medium rounded-lg bg-gradient-to-br from-ember to-paprika text-white px-4 py-2"
        >
          {showForm ? 'Close' : '+ New order'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              filter === f
                ? 'bg-ink text-white border-ink'
                : 'border-line text-ink-muted hover:border-ink-muted'
            }`}
          >
            {f === 'all' ? 'All' : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {showForm && (
        <NewOrderForm
          menuItems={menuItems.filter((m) => m.isAvailable)}
          onCreated={(order) => {
            setOrders((prev) => [order, ...prev]);
            setShowForm(false);
          }}
        />
      )}

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <p className="text-sm text-ink-muted">Loading orders…</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-ink-muted">No orders in this view yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-surface border border-line rounded-xl p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{order.customerName}</p>
                  <p className="text-xs text-ink-muted">
                    {order.customerPhone} · {order.deliveryAddress}
                  </p>
                  <p className="text-xs text-ink-muted mt-1">
                    {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">Rs {order.totalAmount}</p>
                  <p className="text-xs text-ink-muted">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-line flex flex-wrap items-center justify-between gap-3">
                <StatusStepper status={order.status} />

                <div className="flex items-center gap-2">
                  {nextStatuses(order.status).map((next) => (
                    <button
                      key={next}
                      onClick={() => advanceStatus(order, next)}
                      className={
                        next === 'cancelled'
                          ? 'text-xs text-ink-muted hover:text-paprika px-2 py-1'
                          : 'text-xs font-medium rounded-lg bg-ink text-white px-3 py-1.5'
                      }
                    >
                      {next === 'cancelled' ? 'Cancel' : STATUS_LABELS[next]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
