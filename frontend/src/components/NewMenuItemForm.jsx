import { useState } from 'react';
import * as api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import FormField from './FormField';
import { validateMenuItem, hasErrors } from '../lib/validation';

const CATEGORIES = ['Starters', 'Main Course', 'Desserts', 'Beverages', 'Sides'];

export default function NewMenuItemForm({ onCreated }) {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(CATEGORIES[1]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    const errors = validateMenuItem({ name, price, category });
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setFormError('');
    setSubmitting(true);
    try {
      const res = await api.createMenuItem(token, {
        name,
        description,
        price: Number(price),
        category,
      });
      onCreated(res.data);
      setName('');
      setDescription('');
      setPrice('');
      setCategory(CATEGORIES[1]);
      setFieldErrors({});
    } catch (err) {
      setFormError(err.message || 'Could not create item');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="bg-surface border border-line rounded-xl p-5 shadow-sm mb-6 grid sm:grid-cols-2 gap-3"
    >
      {formError && <p className="sm:col-span-2 text-sm text-red-600">{formError}</p>}

      <FormField error={fieldErrors.name}>
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 ${
            fieldErrors.name ? 'border-red-300' : 'border-line focus:border-ember'
          }`}
        />
      </FormField>

      <FormField error={fieldErrors.price}>
        <input
          type="number"
          min="0"
          step="1"
          placeholder="Price (Rs)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 ${
            fieldErrors.price ? 'border-red-300' : 'border-line focus:border-ember'
          }`}
        />
      </FormField>

      <FormField error={fieldErrors.category}>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </FormField>

      <FormField>
        <input
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember"
        />
      </FormField>

      <button
        type="submit"
        disabled={submitting}
        className="sm:col-span-2 rounded-lg bg-ink text-white text-sm font-medium py-2 disabled:opacity-60"
      >
        {submitting ? 'Adding…' : 'Add menu item'}
      </button>
    </form>
  );
}
