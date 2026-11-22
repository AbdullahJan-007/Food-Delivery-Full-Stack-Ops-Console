import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../lib/api';
import { formatMoney } from '../lib/currency';
import { STATUS_LABELS } from '../lib/orderStatus';
import { validateOrder, hasErrors } from '../lib/validation';
import { useToast } from '../hooks/useToast';
import {
  BrandLogoIcon,
  CategoryIllustration,
  OrdersIcon,
  SearchIcon,
  PlusIcon,
  CheckIcon,
  PhoneIcon,
  MapPinIcon,
} from '../components/Icons';

const CATEGORIES = ['All', 'Starters', 'Main Course', 'Sides', 'Beverages', 'Desserts'];
const TRACKING_KEY = 'fd_recent_order_id';
const LIFECYCLE_STEPS = [
  { key: 'pending', title: 'Order Received', desc: 'Sent to kitchen queue' },
  { key: 'confirmed', title: 'Confirmed', desc: 'Kitchen accepted your order' },
  { key: 'preparing', title: 'Preparing', desc: 'Chefs are cooking your meal fresh' },
  { key: 'out_for_delivery', title: 'Out for Delivery', desc: 'Rider is on the way to your address' },
  { key: 'delivered', title: 'Delivered', desc: 'Enjoy your meal!' },
];

function readSavedOrderId() {
  try {
    return localStorage.getItem(TRACKING_KEY) || '';
  } catch {
    return '';
  }
}

export default function StorefrontPage() {
  const toast = useToast();

  const [restaurant, setRestaurant] = useState({ name: 'Food Delivery', slug: '', currency: 'PKR' });
  const [menuItems, setMenuItems] = useState([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cart & Checkout Drawer
  const [cart, setCart] = useState(/** @type {Record<string, number>} */ ({}));
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState(/** @type {Record<string, string>} */ ({}));
  const [submitting, setSubmitting] = useState(false);

  // Live Order Tracking
  const [trackedOrderId, setTrackedOrderId] = useState(readSavedOrderId);
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);

  const loadMenu = useCallback(async () => {
    setError('');
    try {
      const res = await api.getStorefront({
        category: category === 'All' ? undefined : category,
        search: search.trim() || undefined,
      });
      setRestaurant(res.data.restaurant);
      setMenuItems(res.data.menuItems);
    } catch (err) {
      setError(err.message || 'Could not load restaurant menu');
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMenu();
    }, search ? 200 : 0);
    return () => clearTimeout(timer);
  }, [loadMenu, search]);

  // Fetch tracked order and subscribe to real-time SSE updates
  useEffect(() => {
    if (!trackedOrderId) return undefined;

    let active = true;
    api
      .trackCustomerOrder(trackedOrderId)
      .then((res) => {
        if (active) setTrackedOrder(res.data);
      })
      .catch(() => {
        if (active) {
          setTrackedOrder(null);
          setTrackedOrderId('');
          try {
            localStorage.removeItem(TRACKING_KEY);
          } catch {
            // ignore
          }
        }
      });

    const source = new EventSource(api.getOrderRealtimeUrl(trackedOrderId));
    source.addEventListener('connected', () => {
      if (active) setLiveConnected(true);
    });
    source.addEventListener('status', (ev) => {
      if (!active) return;
      try {
        const payload = JSON.parse(ev.data);
        if (payload?.order?.status) {
          setTrackedOrder((prev) =>
            prev
              ? {
                  ...prev,
                  status: payload.order.status,
                  statusHistory: payload.order.statusHistory ?? prev.statusHistory,
                  updatedAt: payload.order.updatedAt ?? prev.updatedAt,
                }
              : prev
          );
          toast.info(`Order update: ${STATUS_LABELS[payload.order.status]}`);
        }
      } catch {
        // ignore parse errors
      }
    });
    source.onerror = () => {
      if (active) setLiveConnected(false);
    };

    return () => {
      active = false;
      source.close();
      setLiveConnected(false);
    };
  }, [trackedOrderId, toast]);

  const cartLines = useMemo(
    () =>
      menuItems
        .filter((item) => (cart[item._id] ?? 0) > 0)
        .map((item) => ({ ...item, quantity: cart[item._id] })),
    [menuItems, cart]
  );

  const totalItemCount = useMemo(
    () => Object.values(cart).reduce((sum, q) => sum + q, 0),
    [cart]
  );

  const cartSubtotal = useMemo(() => {
    const sum = cartLines.reduce((acc, item) => acc + item.price * item.quantity, 0);
    return Math.round((sum + Number.EPSILON) * 100) / 100;
  }, [cartLines]);

  function updateQty(id, delta) {
    setCart((prev) => {
      const next = Math.min(Math.max(0, (prev[id] ?? 0) + delta), 50);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  }

  async function handlePlaceOrder(e) {
    e.preventDefault();
    const errors = validateOrder({
      customerName,
      customerPhone,
      deliveryAddress,
      items: cartLines,
      notes,
    });
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setSubmitting(true);
    try {
      const res = await api.placeCustomerOrder({
        organizationSlug: restaurant.slug,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        paymentMethod,
        notes: notes.trim(),
        items: cartLines.map((i) => ({ menuItem: i._id, quantity: i.quantity })),
      });

      const placed = res.data;
      setCart({});
      setCartOpen(false);
      setTrackedOrder(placed);
      setTrackedOrderId(placed._id);
      setTrackerOpen(true);
      try {
        localStorage.setItem(TRACKING_KEY, placed._id);
      } catch {
        // ignore
      }
      toast.success('Order sent to the kitchen! Track live updates here.');
    } catch (err) {
      toast.error(err.message || 'Could not place order');
    } finally {
      setSubmitting(false);
    }
  }

  const currentStepIndex = trackedOrder
    ? LIFECYCLE_STEPS.findIndex((s) => s.key === trackedOrder.status)
    : -1;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Top Customer Navigation Bar */}
      <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur border-b border-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogoIcon className="w-9 h-9 shrink-0" />
            <div className="min-w-0">
              <p className="font-display font-bold text-base text-ink truncate">
                {restaurant.name}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Open now · 25–35 min delivery</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {trackedOrder && (
              <button
                type="button"
                onClick={() => setTrackerOpen(true)}
                className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Track: {STATUS_LABELS[trackedOrder.status]}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-ember hover:bg-paprika text-white transition-colors shadow-xs cursor-pointer"
            >
              <OrdersIcon className="w-4 h-4" />
              <span>Cart</span>
              {totalItemCount > 0 && (
                <span className="font-mono text-xs bg-white/20 px-1.5 py-0.5 rounded-md">
                  {totalItemCount} · {formatMoney(cartSubtotal, restaurant.currency)}
                </span>
              )}
            </button>

            <Link
              to="/admin/login"
              className="hidden sm:inline-flex items-center text-xs font-semibold text-ink-muted hover:text-ink border border-line hover:border-ink-muted bg-surface rounded-lg px-3 py-2 transition-colors"
            >
              Admin Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Editorial Light Hero */}
      <section className="bg-gradient-to-b from-hero-tint to-canvas border-b border-line/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-surface border border-line text-ember mb-4">
              Fresh Kitchen · Live Order Tracking
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink leading-tight">
              Freshly prepared meals, delivered hot to your doorstep.
            </h1>
            <p className="text-sm sm:text-base text-ink-muted mt-3 leading-relaxed">
              Browse our live kitchen menu, customize your cart in seconds, and watch every step from confirmation to delivery in real time.
            </p>
          </div>

          {/* Search & Category Controls */}
          <div className="mt-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`text-xs sm:text-sm font-medium px-3.5 py-2 rounded-full border transition-colors cursor-pointer ${
                    category === c
                      ? 'bg-ink text-white border-ink shadow-xs'
                      : 'bg-surface border-line text-ink-muted hover:text-ink hover:border-ink-muted'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <SearchIcon className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                placeholder="Search burgers, fries, drinks…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface pl-10 pr-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ember/30 focus:border-ember shadow-xs"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Menu Grid */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {error && (
          <div role="alert" className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-56 rounded-2xl bg-surface border border-line animate-pulse" />
            ))}
          </div>
        ) : menuItems.length === 0 ? (
          <div className="bg-surface border border-line rounded-2xl p-12 text-center">
            <p className="font-display text-lg font-semibold text-ink">No dishes found</p>
            <p className="text-sm text-ink-muted mt-1">
              Try clearing your search or selecting another category.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item) => {
              const qty = cart[item._id] ?? 0;
              return (
                <article
                  key={item._id}
                  className="bg-surface border border-line rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <CategoryIllustration category={item.category} className="w-14 h-14 shrink-0" />
                      <span className="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-surface-alt text-ink-muted">
                        {item.category}
                      </span>
                    </div>

                    <h2 className="font-display text-lg font-semibold text-ink mt-4 leading-snug">
                      {item.name}
                    </h2>
                    <p className="text-sm text-ink-muted mt-1.5 line-clamp-2 min-h-[2.5rem]">
                      {item.description || 'Freshly prepared to order in our kitchen.'}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-line flex items-center justify-between gap-3">
                    <span className="font-mono text-base font-bold text-ink">
                      {formatMoney(item.price, restaurant.currency)}
                    </span>

                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => updateQty(item._id, 1)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-1.5 rounded-lg bg-hero-tint text-ember hover:bg-ember hover:text-white transition-colors cursor-pointer"
                      >
                        <PlusIcon className="w-4 h-4" />
                        Add
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-2 bg-surface-alt border border-line rounded-lg p-1">
                        <button
                          type="button"
                          aria-label={`Remove one ${item.name}`}
                          onClick={() => updateQty(item._id, -1)}
                          className="w-7 h-7 rounded-md bg-surface text-ink font-semibold hover:bg-line/50 cursor-pointer"
                        >
                          −
                        </button>
                        <span className="font-mono text-sm font-semibold w-5 text-center">{qty}</span>
                        <button
                          type="button"
                          aria-label={`Add one ${item.name}`}
                          onClick={() => updateQty(item._id, 1)}
                          className="w-7 h-7 rounded-md bg-ember text-white font-semibold hover:bg-paprika cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Slide-Over Cart & Checkout Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="fixed inset-0 bg-ink/35 backdrop-blur-[2px]"
            onClick={() => setCartOpen(false)}
          />
          <aside className="relative z-10 w-full max-w-md bg-surface h-full shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-line flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-ink">Your Order</h2>
                <p className="text-xs text-ink-muted">{restaurant.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="text-sm font-medium text-ink-muted hover:text-ink px-2 py-1 rounded-md hover:bg-surface-alt cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {cartLines.length === 0 ? (
                <div className="text-center py-12">
                  <p className="font-medium text-ink">Your cart is empty</p>
                  <p className="text-xs text-ink-muted mt-1">Add dishes from the menu to place an order.</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-line border border-line rounded-xl overflow-hidden">
                    {cartLines.map((line) => (
                      <div key={line._id} className="p-3.5 flex items-center justify-between gap-3 bg-canvas/40">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">{line.name}</p>
                          <p className="text-xs font-mono text-ink-muted">
                            {formatMoney(line.price, restaurant.currency)} each
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateQty(line._id, -1)}
                            className="w-7 h-7 rounded-md border border-line bg-surface text-sm font-semibold cursor-pointer"
                          >
                            −
                          </button>
                          <span className="font-mono text-sm font-semibold w-5 text-center">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(line._id, 1)}
                            className="w-7 h-7 rounded-md bg-ember text-white text-sm font-semibold cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl bg-surface-alt p-4 space-y-2 text-sm">
                    <div className="flex justify-between text-ink-muted">
                      <span>Subtotal</span>
                      <span className="font-mono">{formatMoney(cartSubtotal, restaurant.currency)}</span>
                    </div>
                    <div className="flex justify-between text-ink-muted">
                      <span>Delivery Fee</span>
                      <span className="font-medium text-emerald-700">Free</span>
                    </div>
                    <div className="pt-2 border-t border-line flex justify-between font-semibold text-ink text-base">
                      <span>Total</span>
                      <span className="font-mono">{formatMoney(cartSubtotal, restaurant.currency)}</span>
                    </div>
                  </div>

                  <form id="customer-checkout-form" onSubmit={handlePlaceOrder} noValidate className="space-y-3.5">
                    <h3 className="font-display text-sm font-semibold text-ink">Delivery Details</h3>

                    <div>
                      <label className="block text-xs font-medium text-ink-muted mb-1">Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Ayesha Khan"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ember/30 ${
                          fieldErrors.customerName ? 'border-red-400' : 'border-line focus:border-ember'
                        }`}
                      />
                      {fieldErrors.customerName && (
                        <p className="text-xs text-red-600 mt-1">{fieldErrors.customerName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ink-muted mb-1">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="+92 300 1234567"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ember/30 ${
                          fieldErrors.customerPhone ? 'border-red-400' : 'border-line focus:border-ember'
                        }`}
                      />
                      {fieldErrors.customerPhone && (
                        <p className="text-xs text-red-600 mt-1">{fieldErrors.customerPhone}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ink-muted mb-1">Delivery Address</label>
                      <input
                        type="text"
                        placeholder="House #, Street, Sector / City"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ember/30 ${
                          fieldErrors.deliveryAddress ? 'border-red-400' : 'border-line focus:border-ember'
                        }`}
                      />
                      {fieldErrors.deliveryAddress && (
                        <p className="text-xs text-red-600 mt-1">{fieldErrors.deliveryAddress}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ink-muted mb-1">Payment Method</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'cash', label: 'Cash' },
                          { id: 'card', label: 'Card' },
                          { id: 'online', label: 'Online' },
                        ].map((pm) => (
                          <button
                            key={pm.id}
                            type="button"
                            onClick={() => setPaymentMethod(pm.id)}
                            className={`text-xs font-semibold py-2 rounded-lg border transition-colors cursor-pointer ${
                              paymentMethod === pm.id
                                ? 'bg-ink text-white border-ink'
                                : 'bg-surface border-line text-ink-muted hover:text-ink'
                            }`}
                          >
                            {pm.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ink-muted mb-1">
                        Kitchen Notes (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Spice level, extra sauce, ring bell…"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ember/30 focus:border-ember"
                      />
                    </div>
                  </form>
                </>
              )}
            </div>

            {cartLines.length > 0 && (
              <div className="p-5 border-t border-line bg-surface">
                <button
                  type="submit"
                  form="customer-checkout-form"
                  disabled={submitting}
                  className="w-full rounded-xl bg-ember hover:bg-paprika text-white text-sm font-semibold py-3 transition-colors disabled:opacity-60 cursor-pointer shadow-sm"
                >
                  {submitting
                    ? 'Sending to kitchen…'
                    : `Place Order · ${formatMoney(cartSubtotal, restaurant.currency)}`}
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Live Real-Time Order Tracker Drawer */}
      {trackerOpen && trackedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-ink/35 backdrop-blur-[2px]"
            onClick={() => setTrackerOpen(false)}
          />
          <aside className="relative z-10 w-full max-w-md bg-surface h-full shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-line flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-ink">Live Order Tracker</h2>
                <div className="flex items-center gap-1.5 text-xs text-ink-muted mt-0.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      liveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  <span>{liveConnected ? 'Real-time kitchen sync active' : 'Connected'}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTrackerOpen(false)}
                className="text-sm font-medium text-ink-muted hover:text-ink px-2 py-1 rounded-md hover:bg-surface-alt cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {trackedOrder.status === 'cancelled' ? (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                  <p className="font-semibold text-red-900">Order Cancelled</p>
                  <p className="text-xs text-red-700 mt-1">
                    This order was cancelled. Feel free to place a new order anytime.
                  </p>
                </div>
              ) : (
                <ol className="space-y-4">
                  {LIFECYCLE_STEPS.map((step, idx) => {
                    const done = idx <= currentStepIndex;
                    const active = idx === currentStepIndex;
                    return (
                      <li key={step.key} className="flex items-start gap-3.5">
                        <div
                          className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                            done
                              ? 'bg-ember border-ember text-white'
                              : 'bg-surface-alt border-line text-ink-muted'
                          }`}
                        >
                          {done ? <CheckIcon className="w-3.5 h-3.5" /> : <span className="text-[11px] font-mono">{idx + 1}</span>}
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${done ? 'text-ink' : 'text-ink-muted'}`}>
                            {step.title}
                            {active && (
                              <span className="ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-hero-tint text-ember">
                                Current
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-ink-muted mt-0.5">{step.desc}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}

              <div className="rounded-xl border border-line bg-canvas p-4 space-y-2.5 text-sm">
                <p className="font-display font-semibold text-ink">Order Summary</p>
                <div className="space-y-1 text-xs text-ink-muted">
                  <p className="inline-flex items-center gap-1.5">
                    <PhoneIcon className="w-3.5 h-3.5" />
                    {trackedOrder.customerName}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{trackedOrder.deliveryAddress}</span>
                  </p>
                </div>
                <div className="pt-2 border-t border-line space-y-1">
                  {trackedOrder.items?.map((i, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-ink">
                        {i.quantity}× {i.name}
                      </span>
                      <span className="font-mono text-ink-muted">
                        {formatMoney(i.price * i.quantity, trackedOrder.currency || restaurant.currency)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-line flex justify-between font-semibold text-ink">
                  <span>Total ({trackedOrder.paymentMethod})</span>
                  <span className="font-mono">
                    {formatMoney(trackedOrder.totalAmount, trackedOrder.currency || restaurant.currency)}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
