import { useCallback, useEffect, useState } from 'react';
import * as api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { nextStatuses, STATUS_LABELS } from '../lib/orderStatus';
import { formatMoney } from '../lib/currency';
import StatusStepper from '../components/StatusStepper';
import NewOrderForm from '../components/NewOrderForm';
import {
  OrdersIcon,
  FlameIcon,
  CheckIcon,
  RevenueIcon,
  PlusIcon,
  SearchIcon,
  PhoneIcon,
  MapPinIcon,
  CancelIcon,
  TrashIcon,
} from '../components/Icons';

const FILTERS = ['all', 'pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];

export default function OrdersPage() {
  const { token, user, organization } = useAuth();
  const currency = organization?.currency || 'PKR';
  const toast = useToast();
  const isAdmin = user?.role === 'admin';

  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [liveSync, setLiveSync] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [ordersRes, menuRes, statsRes] = await Promise.all([
        api.getOrders(token, {
          status: filter === 'all' ? undefined : filter,
          search: search.trim() || undefined,
        }),
        api.getMenuItems(token),
        api.getOrderStats(token),
      ]);
      setOrders(ordersRes.data);
      setMenuItems(menuRes.data);
      setStats(statsRes.data);
    } catch (err) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [token, filter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  // Real-time SSE sync: instantly receive new customer storefront orders & status changes
  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    const source = new EventSource(api.getAdminRealtimeUrl(token));

    source.addEventListener('connected', () => {
      if (active) setLiveSync(true);
    });

    source.addEventListener('order', (ev) => {
      if (!active) return;
      try {
        const payload = JSON.parse(ev.data);
        if (payload?.type === 'order:created' && payload.order) {
          toast.info(`New ${payload.order.source === 'customer' ? 'customer ' : ''}order from ${payload.order.customerName}!`);
        }
        load();
      } catch {
        // ignore parse errors
      }
    });

    source.onerror = () => {
      if (active) setLiveSync(false);
    };

    return () => {
      active = false;
      source.close();
      setLiveSync(false);
    };
  }, [token, load, toast]);

  async function advanceStatus(order, nextStatus) {
    setBusyId(order._id);
    try {
      const res = await api.updateOrderStatus(token, order._id, nextStatus);
      setOrders((prev) => {
        if (filter !== 'all' && filter !== nextStatus) {
          return prev.filter((o) => o._id !== order._id);
        }
        return prev.map((o) => (o._id === order._id ? res.data : o));
      });
      toast.success(`Order moved to ${STATUS_LABELS[nextStatus]}`);
      api
        .getOrderStats(token)
        .then((s) => setStats(s.data))
        .catch(() => {});
    } catch (err) {
      toast.error(err.message || 'Failed to update order status');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(order) {
    if (!window.confirm(`Delete order for ${order.customerName}? This cannot be undone.`)) {
      return;
    }
    setBusyId(order._id);
    try {
      await api.deleteOrder(token, order._id);
      setOrders((prev) => prev.filter((o) => o._id !== order._id));
      toast.success('Order deleted');
      api
        .getOrderStats(token)
        .then((s) => setStats(s.data))
        .catch(() => {});
    } catch (err) {
      toast.error(err.message || 'Failed to delete order');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold text-ink">Live Orders</h1>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                liveSync
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-surface-alt text-ink-muted border-line'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  liveSync ? 'bg-emerald-500 animate-pulse' : 'bg-ink-muted'
                }`}
              />
              {liveSync ? 'Real-time sync' : 'Connecting'}
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Customer storefront orders appear here immediately — advance status to update customers live
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg bg-ember hover:bg-paprika text-white px-4 py-2 shadow-xs transition-colors cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          {showForm ? 'Close form' : 'New manual order'}
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-surface border border-line rounded-xl p-4 shadow-xs flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-ink-muted">Total Orders</p>
              <p className="font-mono text-2xl font-semibold text-ink mt-1">{stats.totalOrders}</p>
            </div>
            <span className="p-2 rounded-lg bg-surface-alt text-ink">
              <OrdersIcon className="w-5 h-5" />
            </span>
          </div>
          <div className="bg-surface border border-line rounded-xl p-4 shadow-xs flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-ink-muted">Active Queue</p>
              <p className="font-mono text-2xl font-semibold text-ember mt-1">{stats.activeOrders}</p>
            </div>
            <span className="p-2 rounded-lg bg-hero-tint text-ember">
              <FlameIcon className="w-5 h-5" />
            </span>
          </div>
          <div className="bg-surface border border-line rounded-xl p-4 shadow-xs flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-ink-muted">Delivered</p>
              <p className="font-mono text-2xl font-semibold text-emerald-700 mt-1">
                {stats.deliveredOrders}
              </p>
            </div>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <CheckIcon className="w-5 h-5" />
            </span>
          </div>
          <div className="bg-surface border border-line rounded-xl p-4 shadow-xs flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-ink-muted">Revenue</p>
              <p className="font-mono text-2xl font-semibold text-paprika mt-1">
                {formatMoney(stats.totalRevenue, currency)}
              </p>
            </div>
            <span className="p-2 rounded-lg bg-pink-50 text-paprika">
              <RevenueIcon className="w-5 h-5" />
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              type="button"
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                filter === f
                  ? 'bg-ink text-white border-ink'
                  : 'bg-surface border-line text-ink-muted hover:text-ink hover:border-ink-muted'
              }`}
            >
              {f === 'all' ? 'All' : STATUS_LABELS[f]}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <SearchIcon className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            placeholder="Search customer, phone, address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface pl-9 pr-3 py-1.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember"
          />
        </div>
      </div>

      {showForm && (
        <NewOrderForm
          menuItems={menuItems.filter((m) => m.isAvailable)}
          onCreated={(order) => {
            setShowForm(false);
            toast.success(`Order placed for ${order.customerName}`);
            if (filter === 'all' || filter === 'pending') {
              setOrders((prev) => [order, ...prev]);
            }
            api
              .getOrderStats(token)
              .then((s) => setStats(s.data))
              .catch(() => {});
          }}
        />
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-ink-muted">Loading orders…</p>
      ) : orders.length === 0 ? (
        <div className="bg-surface border border-line rounded-xl p-8 text-center">
          <p className="text-sm font-medium text-ink">No orders match this view.</p>
          <p className="text-xs text-ink-muted mt-1">
            Create a new order or switch filters to inspect other statuses.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const isBusy = busyId === order._id;
            return (
              <div
                key={order._id}
                className="bg-surface border border-line rounded-xl p-5 shadow-xs hover:border-ink-muted/40 transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-ink">{order.customerName}</p>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                          order.source === 'customer'
                            ? 'bg-hero-tint text-ember border-ember/25'
                            : 'bg-surface-alt text-ink-muted border-line'
                        }`}
                      >
                        {order.source === 'customer' ? 'Online Customer' : 'Staff Entry'}
                      </span>
                      <span className="text-[11px] uppercase tracking-wide font-mono font-medium px-2 py-0.5 rounded bg-surface-alt border border-line text-ink">
                        {order.paymentMethod || 'cash'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                      <span className="inline-flex items-center gap-1">
                        <PhoneIcon className="w-3.5 h-3.5" />
                        {order.customerPhone}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPinIcon className="w-3.5 h-3.5" />
                        {order.deliveryAddress}
                      </span>
                    </div>
                    <p className="text-xs text-ink font-medium pt-0.5">
                      {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                    </p>
                    {order.notes && (
                      <p className="text-xs text-ember font-medium pt-0.5">Note: {order.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-base font-semibold text-paprika">
                      {formatMoney(order.totalAmount, currency)}
                    </p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-line flex flex-wrap items-center justify-between gap-3">
                  <StatusStepper status={order.status} />

                  <div className="flex items-center gap-2">
                    {nextStatuses(order.status).map((next) => (
                      <button
                        type="button"
                        key={next}
                        disabled={isBusy}
                        onClick={() => advanceStatus(order, next)}
                        className={
                          next === 'cancelled'
                            ? 'inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-red-700 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer'
                            : 'inline-flex items-center gap-1 text-xs font-semibold rounded-lg bg-ink text-white px-3 py-1.5 hover:bg-ink/90 transition-colors disabled:opacity-50 cursor-pointer'
                        }
                      >
                        {next === 'cancelled' ? (
                          <CancelIcon className="w-3.5 h-3.5" />
                        ) : (
                          <CheckIcon className="w-3.5 h-3.5" />
                        )}
                        {isBusy ? 'Saving…' : next === 'cancelled' ? 'Cancel' : STATUS_LABELS[next]}
                      </button>
                    ))}
                    {isAdmin && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDelete(order)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-red-700 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
