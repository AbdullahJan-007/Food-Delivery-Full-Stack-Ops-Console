import { useEffect, useState } from 'react';
import * as api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import FormField from '../components/FormField';

const CURRENCIES = ['PKR', 'USD', 'EUR', 'GBP', 'AED'];
const PLANS = [
  { value: 'starter', label: 'Starter (50 menu items · 10 staff · 1,000 orders/mo)' },
  { value: 'growth', label: 'Growth (250 menu items · 50 staff · 10,000 orders/mo)' },
  { value: 'enterprise', label: 'Enterprise (5,000 menu items · 500 staff · 250,000 orders/mo)' },
];

export default function SettingsPage() {
  const { token, updateOrganizationState } = useAuth();
  const toast = useToast();

  const [org, setOrg] = useState(null);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('PKR');
  const [plan, setPlan] = useState('starter');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api
      .getOrganization(token)
      .then((res) => {
        if (!active) return;
        setOrg(res.data);
        setName(res.data.name);
        setCurrency(res.data.currency);
        setPlan(res.data.plan);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load workspace settings');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Workspace name is required');
      return;
    }

    setSaving(true);
    try {
      const res = await api.updateOrganization(token, {
        name: name.trim(),
        currency,
        plan,
      });
      setOrg((prev) => (prev ? { ...prev, ...res.data } : res.data));
      updateOrganizationState(res.data);
      toast.success('Workspace settings saved');
    } catch (err) {
      toast.error(err.message || 'Failed to save workspace settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-ink-muted">Loading workspace settings…</p>;
  if (error) return <p role="alert" className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Workspace Settings</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          Multi-tenant SaaS branding, billing plan quotas, and staff invite slug
        </p>
      </div>

      {org?.usage && org?.limits && (
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="bg-surface border border-line rounded-xl p-4 shadow-xs">
            <p className="text-xs text-ink-muted">Menu Items</p>
            <p className="font-mono text-xl font-semibold mt-1">
              {org.usage.menuItems} / {org.limits.maxMenuItems}
            </p>
          </div>
          <div className="bg-surface border border-line rounded-xl p-4 shadow-xs">
            <p className="text-xs text-ink-muted">Team Seats</p>
            <p className="font-mono text-xl font-semibold mt-1">
              {org.usage.staff} / {org.limits.maxStaff}
            </p>
          </div>
          <div className="bg-surface border border-line rounded-xl p-4 shadow-xs">
            <p className="text-xs text-ink-muted">Orders This Month</p>
            <p className="font-mono text-xl font-semibold mt-1">
              {org.usage.monthlyOrders} / {org.limits.maxMonthlyOrders.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="bg-surface border border-line rounded-xl p-6 shadow-sm space-y-4 max-w-xl"
      >
        <div className="rounded-lg bg-canvas border border-line px-3 py-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-ink-muted">Workspace Invite Slug (share with staff)</p>
            <p className="font-mono text-sm font-medium">{org?.slug}</p>
          </div>
        </div>

        <FormField label="Workspace / Restaurant Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember"
          />
        </FormField>

        <FormField label="Display Currency">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="SaaS Subscription Plan">
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember"
          >
            {PLANS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </FormField>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-gradient-to-br from-ember to-paprika text-white text-sm font-medium px-5 py-2 disabled:opacity-60 cursor-pointer"
        >
          {saving ? 'Saving…' : 'Save workspace settings'}
        </button>
      </form>
    </div>
  );
}
