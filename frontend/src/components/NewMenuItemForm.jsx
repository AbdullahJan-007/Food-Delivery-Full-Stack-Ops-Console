import { useState } from 'react';
import * as api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import FormField from './FormField';
import { validateMenuItem, hasErrors } from '../lib/validation';

const CATEGORIES = ['Starters', 'Main Course', 'Desserts', 'Beverages', 'Sides'];

export default function NewMenuItemForm({
  initialItem = null,
  onCreated = undefined,
  onSaved = undefined,
  onCancel = undefined,
}) {
  const { token } = useAuth();
  const isEditing = Boolean(initialItem);

  const [name, setName] = useState(initialItem?.name ?? '');
  const [description, setDescription] = useState(initialItem?.description ?? '');
  const [price, setPrice] = useState(initialItem ? String(initialItem.price) : '');
  const [category, setCategory] = useState(initialItem?.category ?? CATEGORIES[1]);
  const [imageUrl, setImageUrl] = useState(initialItem?.imageUrl ?? '');
  const [fieldErrors, setFieldErrors] = useState(/** @type {Record<string, string>} */ ({}));
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    const errors = validateMenuItem({ name, price, category, imageUrl });
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setFormError('');
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        category,
        imageUrl: imageUrl.trim(),
      };

      if (isEditing) {
        const res = await api.updateMenuItem(token, initialItem._id, payload);
        onSaved?.(res.data);
      } else {
        const res = await api.createMenuItem(token, payload);
        onCreated?.(res.data);
        setName('');
        setDescription('');
        setPrice('');
        setCategory(CATEGORIES[1]);
        setImageUrl('');
        setFieldErrors({});
      }
    } catch (err) {
      setFormError(err.message || (isEditing ? 'Could not update item' : 'Could not create item'));
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
      <div className="sm:col-span-2 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">
          {isEditing ? `Edit "${initialItem.name}"` : 'New menu item'}
        </h2>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-ink-muted hover:text-ink cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>

      {formError && (
        <p role="alert" className="sm:col-span-2 text-sm text-red-600">
          {formError}
        </p>
      )}

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
          step="0.01"
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
          className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember bg-surface"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </FormField>

      <FormField error={fieldErrors.imageUrl}>
        <input
          type="url"
          placeholder="Image URL (optional, https://...)"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 ${
            fieldErrors.imageUrl ? 'border-red-300' : 'border-line focus:border-ember'
          }`}
        />
      </FormField>

      <div className="sm:col-span-2">
        <FormField>
          <input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember"
          />
        </FormField>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="sm:col-span-2 rounded-lg bg-ink text-white text-sm font-medium py-2 disabled:opacity-60 cursor-pointer"
      >
        {submitting
          ? isEditing
            ? 'Saving…'
            : 'Adding…'
          : isEditing
            ? 'Save changes'
            : 'Add menu item'}
      </button>
    </form>
  );
}
