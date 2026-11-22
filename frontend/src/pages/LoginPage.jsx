import { useState } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import FormField from '../components/FormField';
import { BrandLogoIcon } from '../components/Icons';
import {
  validateLogin,
  validateRegister,
  hasErrors,
  isSafeRedirectPath,
} from '../lib/validation';

const CURRENCIES = ['PKR', 'USD', 'EUR', 'GBP', 'AED'];

export default function LoginPage() {
  const { token, login, register, registerOrg } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState('login');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationSlug, setOrganizationSlug] = useState('');
  const [currency, setCurrency] = useState('PKR');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState(/** @type {Record<string, string>} */ ({}));
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const rawRedirect = location.state?.from;
  const redirectTo = isSafeRedirectPath(rawRedirect) ? rawRedirect : '/admin/orders';

  if (token) {
    return <Navigate to={redirectTo} replace />;
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setFieldErrors({});
    setFormError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const errors =
      mode === 'login'
        ? validateLogin({ email, password })
        : validateRegister({ name, email, password });

    if (mode === 'org' && !organizationName.trim()) {
      errors.organizationName = 'Restaurant / Workspace name is required';
    }

    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setFormError('');
    setSubmitting(true);
    try {
      if (mode === 'org') {
        await registerOrg({
          organizationName: organizationName.trim(),
          currency,
          name: name.trim(),
          email: email.trim(),
          password,
        });
      } else if (mode === 'register') {
        await register(name.trim(), email.trim(), password, organizationSlug.trim() || undefined);
      } else {
        await login(email.trim(), password);
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setFormError(err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{
        background:
          'radial-gradient(120% 100% at 50% 0%, var(--color-hero-tint) 0%, var(--color-canvas) 60%)',
      }}
    >
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink px-3 py-1.5 rounded-full bg-surface border border-line shadow-xs transition-colors"
          >
            ← Back to Customer Storefront
          </Link>
        </div>

        <div className="text-center mb-7">
          <div className="flex justify-center mb-3">
            <BrandLogoIcon className="w-12 h-12 shadow-sm" />
          </div>
          <h1 className="font-display text-3xl font-bold text-ink">
            Admin & Kitchen{' '}
            <span className="text-ember">Portal</span>
          </h1>
          <p className="text-ink-muted text-sm mt-2">
            {mode === 'login'
              ? 'Sign in with your authorized admin or staff credentials'
              : mode === 'org'
                ? 'Launch a new multi-tenant restaurant workspace'
                : 'Join an existing restaurant workspace as staff'}
          </p>
        </div>

        <div className="bg-surface border border-line rounded-xl shadow-sm p-7 space-y-5">
          <div className="grid grid-cols-3 rounded-lg bg-canvas p-1 border border-line gap-1">
            {[
              { id: 'login', label: 'Sign in' },
              { id: 'org', label: 'New workspace' },
              { id: 'register', label: 'Staff join' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchMode(tab.id)}
                className={`text-xs font-medium py-1.5 rounded-md transition-colors cursor-pointer ${
                  mode === tab.id ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {formError && (
              <div
                role="alert"
                className="text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2"
              >
                {formError}
              </div>
            )}

            {mode === 'org' && (
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <FormField label="Workspace name" error={fieldErrors.organizationName}>
                    <input
                      type="text"
                      placeholder="e.g. Lahore Spice Kitchen"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 ${
                        fieldErrors.organizationName ? 'border-red-300' : 'border-line focus:border-ember'
                      }`}
                    />
                  </FormField>
                </div>
                <FormField label="Currency">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
            )}

            {mode === 'register' && (
              <FormField label="Workspace slug (optional)">
                <input
                  type="text"
                  placeholder="e.g. lahore-spice-kitchen"
                  value={organizationSlug}
                  onChange={(e) => setOrganizationSlug(e.target.value)}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember"
                />
              </FormField>
            )}

            {mode !== 'login' && (
              <FormField label={mode === 'org' ? 'Admin full name' : 'Full name'} error={fieldErrors.name}>
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 ${
                    fieldErrors.name ? 'border-red-300' : 'border-line focus:border-ember'
                  }`}
                />
              </FormField>
            )}

            <FormField label="Email" error={fieldErrors.email}>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 ${
                  fieldErrors.email ? 'border-red-300' : 'border-line focus:border-ember'
                }`}
              />
            </FormField>

            <FormField label="Password" error={fieldErrors.password}>
              <input
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 ${
                  fieldErrors.password ? 'border-red-300' : 'border-line focus:border-ember'
                }`}
              />
            </FormField>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-ember hover:bg-paprika text-white text-sm font-semibold py-2.5 disabled:opacity-60 transition-colors cursor-pointer"
            >
              {submitting
                ? 'Please wait…'
                : mode === 'org'
                  ? 'Create workspace'
                  : mode === 'register'
                    ? 'Join as staff'
                    : 'Log in'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
