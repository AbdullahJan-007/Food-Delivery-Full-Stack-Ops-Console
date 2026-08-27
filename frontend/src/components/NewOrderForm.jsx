import { useMemo, useState } from 'react';
import * as api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import FormField from './FormField';
import { validateOrder, hasErrors } from '../lib/validation';

export default function NewOrderForm({ menuItems, onCreated }) {
  const { token } = useAuth();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [quantities, setQuantities] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selected = useMemo(
    () => menuItems.filter((m) => (quantities[m._id] ?? 0) > 0),
    [menuItems, quantities]
  );

  // Client-side only, for feedback while picking items — the backend
  // recomputes this from its own current prices and is the number charged.
  const estimatedTotal = useMemo(
    () => selected.reduce((sum, m) => sum + m.price * (quantities[m._id] ?? 0), 0),
    [selected, quantities]
  );

  function setQty(id, qty) {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, qty) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const errors = validateOrder({
      customerName,
      customerPhone,
      deliveryAddress,
      items: selected,
    });
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setFormError('');
    setSubmitting(true);
    try {
      const res = await api.createOrder(token, {
        customerName,
        customerPhone,
        deliveryAddress,
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
      {formError && <p className="text-sm text-red-600">{formError}</p>}

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
            placeholder="Phone"
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

      <div>
        <div
          className={`border rounded-lg divide-y divide-line max-h-56 overflow-y-auto ${
            fieldErrors.items ? 'border-red-300' : 'border-line'
          }`}
        >
          {menuItems.length === 0 && (
            <p className="text-sm text-ink-muted p-3">No available menu items.</p>
          )}
          {menuItems.map((m) => (
            <div key={m._id} className="flex items-center justify-between px-3 py-2">
              <div>
                <p className="text-sm">{m.name}</p>
                <p className="text-xs text-ink-muted font-mono">Rs {m.price}</p>
              </div>
              <input
                type="number"
                min="0"
                value={quantities[m._id] ?? 0}
                onChange={(e) => setQty(m._id, Number(e.target.value))}
                className="w-16 rounded-lg border border-line px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember"
              />
            </div>
          ))}
        </div>
        {fieldErrors.items && <p className="text-xs text-red-600 mt-1">{fieldErrors.items}</p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          Estimated total: <span className="font-mono text-ink">Rs {estimatedTotal}</span>
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-gradient-to-br from-ember to-paprika text-white text-sm font-medium px-5 py-2 disabled:opacity-60"
        >
          {submitting ? 'Placing…' : 'Place order'}
        </button>
      </div>
    </form>
  );
}
