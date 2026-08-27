import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import FormField from '../components/FormField';
import { validateLogin, hasErrors } from '../lib/validation';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If ProtectedRoute redirected here from a specific page, send the user
  // back to it after a successful login instead of always landing on /orders.
  const redirectTo = location.state?.from ?? '/orders';

  async function handleSubmit(e) {
    e.preventDefault();

    const errors = validateLogin({ email, password });
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setFormError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setFormError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          'radial-gradient(120% 100% at 50% 0%, var(--color-hero-tint) 0%, var(--color-canvas) 60%)',
      }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold">
            Food Delivery{' '}
            <span className="bg-gradient-to-br from-ember to-paprika bg-clip-text text-transparent">
              Ops
            </span>
          </h1>
          <p className="text-ink-muted text-sm mt-2">
            Sign in with your staff or admin account
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-surface border border-line rounded-xl shadow-sm p-7 space-y-4"
        >
          {formError && (
            <div className="text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}

          <FormField label="Email" error={fieldErrors.email}>
            <input
              type="email"
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
            className="w-full rounded-lg bg-gradient-to-br from-ember to-paprika text-white text-sm font-medium py-2.5 disabled:opacity-60 transition-opacity"
          >
            {submitting ? 'Signing in…' : 'Log in'}
          </button>
        </form>
      </div>
    </main>
  );
}
