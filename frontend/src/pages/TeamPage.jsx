import { useEffect, useState } from 'react';
import * as api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

export default function TeamPage() {
  const { token, user: currentUser } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api
      .getUsers(token)
      .then((res) => {
        if (active) {
          setUsers(res.data);
          setError('');
        }
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load team members');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  async function handleUpdate(member, payload, successMsg) {
    setBusyId(member._id);
    try {
      const res = await api.updateUser(token, member._id, payload);
      setUsers((prev) => prev.map((u) => (u._id === member._id ? res.data : u)));
      toast.success(successMsg);
    } catch (err) {
      toast.error(err.message || 'Failed to update user');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Team</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          Manage staff & admin roles and revoke sessions immediately when needed
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-ink-muted">Loading team…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-ink-muted">No users found.</p>
      ) : (
        <div className="bg-surface border border-line rounded-xl shadow-sm divide-y divide-line overflow-hidden">
          {users.map((member) => {
            const isSelf = member._id === currentUser?.id;
            const isBusy = busyId === member._id;
            const nextRole = member.role === 'admin' ? 'staff' : 'admin';

            return (
              <div
                key={member._id}
                className="p-4 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{member.name}</p>
                    {isSelf && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-canvas border border-line text-ink-muted">
                        You
                      </span>
                    )}
                    <span
                      className={`text-[11px] capitalize font-medium px-2 py-0.5 rounded-full ${
                        member.role === 'admin'
                          ? 'bg-hero-tint text-paprika'
                          : 'bg-canvas text-ink-muted border border-line'
                      }`}
                    >
                      {member.role}
                    </span>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        member.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5 font-mono">{member.email}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSelf || isBusy}
                    onClick={() =>
                      handleUpdate(
                        member,
                        { role: nextRole },
                        `${member.name} is now ${nextRole}`
                      )
                    }
                    className="text-xs border border-line rounded-lg px-3 py-1.5 hover:border-ink-muted disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    Make {nextRole}
                  </button>
                  <button
                    type="button"
                    disabled={isSelf || isBusy}
                    onClick={() =>
                      handleUpdate(
                        member,
                        { isActive: !member.isActive },
                        `${member.name} ${member.isActive ? 'deactivated' : 'reactivated'}`
                      )
                    }
                    className="text-xs border border-line rounded-lg px-3 py-1.5 text-ink-muted hover:text-paprika hover:border-paprika disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {member.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
