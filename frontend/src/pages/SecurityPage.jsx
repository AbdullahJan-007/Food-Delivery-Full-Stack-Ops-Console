import { useCallback, useEffect, useState } from 'react';
import * as api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import {
  ShieldIcon,
  ActivityIcon,
  BanIcon,
  RefreshIcon,
} from '../components/Icons';

const SEVERITY_STYLES = {
  critical: 'bg-red-100 text-red-900 border-red-300',
  high: 'bg-orange-100 text-orange-900 border-orange-300',
  medium: 'bg-amber-100 text-amber-900 border-amber-300',
  low: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

export default function SecurityPage() {
  const { token } = useAuth();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ipInput, setIpInput] = useState('');
  const [reasonInput, setReasonInput] = useState('');
  const [durationInput, setDurationInput] = useState('60');
  const [blocking, setBlocking] = useState(false);
  const [unblockingIp, setUnblockingIp] = useState(null);
  const [error, setError] = useState('');

  const fetchTraffic = useCallback(async () => {
    try {
      const res = await api.getTrafficMonitor(token);
      setData(res.data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load traffic monitor');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    let active = true;
    api
      .getTrafficMonitor(token)
      .then((res) => {
        if (active) setData(res.data);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load traffic monitor');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchTraffic();
  }

  async function handleManualBlock(e) {
    e.preventDefault();
    if (!ipInput.trim()) {
      toast.error('Enter an IP address to block');
      return;
    }

    setBlocking(true);
    try {
      await api.blockIp(token, {
        ip: ipInput.trim(),
        reason: reasonInput.trim() || 'Manual block from Security Console',
        durationMinutes: Number(durationInput) || 60,
      });
      toast.success(`Blocked IP ${ipInput.trim()}`);
      setIpInput('');
      setReasonInput('');
      await fetchTraffic();
    } catch (err) {
      toast.error(err.message || 'Could not block IP');
    } finally {
      setBlocking(false);
    }
  }

  async function handleUnblock(ip) {
    setUnblockingIp(ip);
    try {
      await api.unblockIp(token, ip);
      toast.success(`Unblocked IP ${ip}`);
      await fetchTraffic();
    } catch (err) {
      toast.error(err.message || 'Could not unblock IP');
    } finally {
      setUnblockingIp(null);
    }
  }

  if (loading) return <p className="text-sm text-ink-muted">Loading traffic control telemetry…</p>;
  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold">Traffic Control & Shield</h1>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              Active
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Real-time burst flood defense, brute-force lockout, scanner probe detection, and IP quarantine
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 text-sm font-medium border border-line bg-surface hover:bg-surface-alt rounded-lg px-3.5 py-2 transition-colors cursor-pointer disabled:opacity-60"
        >
          <RefreshIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-surface border border-line rounded-xl p-4 shadow-xs flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-ink-muted">Total Requests</p>
                <p className="font-mono text-2xl font-semibold mt-1">{data.metrics.totalRequests}</p>
              </div>
              <span className="p-2 rounded-lg bg-surface-alt text-ink">
                <ActivityIcon className="w-5 h-5" />
              </span>
            </div>

            <div className="bg-surface border border-line rounded-xl p-4 shadow-xs flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-ink-muted">Blocked Attacks</p>
                <p className="font-mono text-2xl font-semibold text-red-700 mt-1">
                  {data.metrics.blockedRequests}
                </p>
              </div>
              <span className="p-2 rounded-lg bg-red-50 text-red-700">
                <BanIcon className="w-5 h-5" />
              </span>
            </div>

            <div className="bg-surface border border-line rounded-xl p-4 shadow-xs flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-ink-muted">Quarantined IPs</p>
                <p className="font-mono text-2xl font-semibold text-ember mt-1">
                  {data.metrics.activeBlockedIps}
                </p>
              </div>
              <span className="p-2 rounded-lg bg-hero-tint text-ember">
                <ShieldIcon className="w-5 h-5" />
              </span>
            </div>

            <div className="bg-surface border border-line rounded-xl p-4 shadow-xs">
              <p className="text-xs font-medium text-ink-muted">Burst Policy</p>
              <p className="font-mono text-base font-semibold mt-1.5">{data.policy.burstLimit}</p>
              <p className="text-xs text-ink-muted mt-0.5">
                Auto-ban at {data.policy.quarantineThreshold} threat pts
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="bg-surface border border-line rounded-xl p-5 shadow-xs space-y-4">
              <h2 className="font-display text-base font-semibold">Manual IP Blocklist</h2>

              <form onSubmit={handleManualBlock} className="grid sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  placeholder="IP (e.g. 203.0.113.10)"
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                  className="rounded-lg border border-line px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember"
                />
                <input
                  type="text"
                  placeholder="Reason"
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  className="rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember"
                />
                <div className="flex gap-2">
                  <select
                    aria-label="Block duration"
                    value={durationInput}
                    onChange={(e) => setDurationInput(e.target.value)}
                    className="rounded-lg border border-line bg-surface px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ember/40"
                  >
                    <option value="15">15m</option>
                    <option value="60">1h</option>
                    <option value="720">12h</option>
                    <option value="1440">24h</option>
                  </select>
                  <button
                    type="submit"
                    disabled={blocking}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-ink text-white text-xs font-medium px-3 py-2 disabled:opacity-60 cursor-pointer"
                  >
                    <BanIcon className="w-3.5 h-3.5" />
                    {blocking ? 'Blocking…' : 'Block IP'}
                  </button>
                </div>
              </form>

              <div className="divide-y divide-line border border-line rounded-lg overflow-hidden">
                {data.blockedIps.length === 0 ? (
                  <p className="text-xs text-ink-muted p-4 text-center">
                    No IPs are currently quarantined.
                  </p>
                ) : (
                  data.blockedIps.map((entry) => (
                    <div
                      key={entry.ip}
                      className="p-3 flex items-center justify-between gap-3 bg-canvas/50"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-medium">{entry.ip}</p>
                        <p className="text-xs text-ink-muted truncate">{entry.reason}</p>
                      </div>
                      <button
                        type="button"
                        disabled={unblockingIp === entry.ip}
                        onClick={() => handleUnblock(entry.ip)}
                        className="text-xs font-medium border border-line bg-surface hover:border-ink rounded-lg px-2.5 py-1 cursor-pointer disabled:opacity-50"
                      >
                        {unblockingIp === entry.ip ? 'Unblocking…' : 'Unblock'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="bg-surface border border-line rounded-xl p-5 shadow-xs space-y-3">
              <h2 className="font-display text-base font-semibold">Recent Security Events</h2>
              <div className="divide-y divide-line border border-line rounded-lg max-h-80 overflow-y-auto">
                {data.recentEvents.length === 0 ? (
                  <p className="text-xs text-ink-muted p-4 text-center">
                    No security anomalies detected yet.
                  </p>
                ) : (
                  data.recentEvents.map((ev) => (
                    <div key={ev.id} className="p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-mono font-semibold px-2 py-0.5 rounded border ${
                            SEVERITY_STYLES[ev.severity] ?? SEVERITY_STYLES.medium
                          }`}
                        >
                          {ev.type}
                        </span>
                        <span className="text-ink-muted font-mono">
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-ink font-medium">{ev.action}</p>
                      <p className="text-ink-muted font-mono truncate">
                        IP: {ev.ip} · Path: {ev.path}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
