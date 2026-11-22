import { useMemo, useState } from 'react';
import * as api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import FormField from './FormField';
import { validateOrder, hasErrors } from '../lib/validation';

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Cash on delivery' },
  { value: 'card', label: 'Card' },
  { value: 'online', label: 'Online transfer' },
];

export default function NewOrderForm({ menuItems, onCreated }) {
  const { token } = useAuth();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [quantities, setQuantities] = useState({});
  const [fieldErrors, setFieldErrors] = useState(/** @type {Record<string, string>} */ ({}));
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selected = useMemo(
    () => menuItems.filter((m) => (quantities[m._id] ?? 0) > 0),
    [menuItems, quantities]
  );

  const estimatedTotal = useMemo(() => {
    const raw = selected.reduce((sum, m) => sum + m.price * (quantities[m._id] ?? 0), 0);
    return Math.round((raw + Number.EPSILON) * 100) / 100;
  }, [selected, quantities]);

  function setQty(id, rawQty) {
    const parsed = Number.parseInt(rawQty, 10);
    const clamped = Number.isNaN(parsed) ? 0 : Math.min(Math.max(0, parsed), 100);
    setQuantities((prev) => ({ ...prev, [id]: clamped }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const errors = validateOrder({
      customerName,
      customerPhone,
      deliveryAddress,
      items: selected,
      notes,
    });
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setFormError('');
    setSubmitting(true);
    try {
      const res = await api.createOrder(token, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        paymentMethod,
        notes: notes.trim(),
        items: selected.map((m) => ({ menuItem: m._id, quantity: quantities[m._id] })),
      });
      onCreated(res.data);
    } catch (err) {
      setFormError(err.message || 'Could not place order');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="bg-surface border border-line rounded-xl p-5 shadow-sm mb-6 space-y-4"
    >
      {formError && (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      )}

      <div className="grid sm:grid-cols-3 gap-3">
        <FormField error={fieldErrors.customerName}>
          <input
            placeholder="Customer name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 ${
              fieldErrors.customerName ? 'border-red-300' : 'border-line focus:border-ember'
            }`}
          />
        </FormField>
        <FormField error={fieldErrors.customerPhone}>
          <input
            placeholder="Phone (e.g. +92 300 1234567)"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 ${
              fieldErrors.customerPhone ? 'border-red-300' : 'border-line focus:border-ember'
            }`}
          />
        </FormField>
        <FormField error={fieldErrors.deliveryAddress}>
          <input
            placeholder="Delivery address"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 ${
              fieldErrors.deliveryAddress ? 'border-red-300' : 'border-line focus:border-ember'
            }`}
          />
        </FormField>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <FormField>
          <select
            aria-label="Payment method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember"
          >
            {PAYMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField error={fieldErrors.notes}>
          <input
            placeholder="Kitchen / delivery notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember"
          />
        </FormField>
      </div>

      <div>
        <div
          className={`border rounded-lg divide-y divide-line max-h-56 overflow-y-auto ${
            fieldErrors.items ? 'border-red-300' : 'border-line'
          }`}
        >
          {menuItems.length === 0 && (
            <p className="text-sm text-ink-muted p-3">No available menu items.</p>
          )}
          {menuItems.map((m) => {
            const qty = quantities[m._id] ?? 0;
            return (
              <div key={m._id} className="flex items-center justify-between px-3 py-2">
                <div>
                  <p className="text-sm">{m.name}</p>
                  <p className="text-xs text-ink-muted font-mono">Rs {m.price}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label={`Decrease ${m.name}`}
                    onClick={() => setQty(m._id, qty - 1)}
                    className="h-7 w-7 rounded-md border border-line text-sm hover:bg-canvas cursor-pointer"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    aria-label={`Quantity for ${m.name}`}
                    value={qty}
                    onChange={(e) => setQty(m._id, e.target.value)}
                    className="w-14 rounded-lg border border-line px-2 py-1 text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember"
                  />
                  <button
                    type="button"
                    aria-label={`Increase ${m.name}`}
                    onClick={() => setQty(m._id, qty + 1)}
                    className="h-7 w-7 rounded-md border border-line text-sm hover:bg-canvas cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {fieldErrors.items && <p className="text-xs text-red-600 mt-1">{fieldErrors.items}</p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          Estimated total: <span className="font-mono text-ink font-medium">Rs {estimatedTotal}</span>
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-gradient-to-br from-ember to-paprika text-white text-sm font-medium px-5 py-2 disabled:opacity-60 cursor-pointer"
        >
          {submitting ? 'Placing…' : 'Place order'}
        </button>
      </div>
    </form>
  );
}
