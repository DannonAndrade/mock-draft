import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Account() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[#f1f5f9]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#0081C6]" />
      </div>
    );
  }

  if (!user) return <Navigate to="/signin" replace />;

  const initials = user.displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    setSigningOut(true);
    setError('');
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign out');
      setSigningOut(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] bg-[#f1f5f9] px-4 py-12 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#cbd5e160_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e160_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative mx-auto max-w-2xl">
        <div className="mb-7">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#0081C6]">Settings</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#022A53]">Your account</h1>
          <p className="mt-2 text-sm text-slate-500">View your DraftBase identity and manage your session.</p>
        </div>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
          <div className="flex flex-col items-center border-b border-slate-100 px-6 py-8 text-center sm:flex-row sm:text-left">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="h-20 w-20 rounded-full border-4 border-sky-50 object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#022A53] text-xl font-black text-white shadow-sm">
                {initials}
              </div>
            )}
            <div className="mt-4 sm:ml-5 sm:mt-0">
              <h2 className="text-xl font-extrabold text-slate-900">{user.displayName}</h2>
              <p className="mt-1 text-sm text-slate-500">DraftBase member</p>
            </div>
          </div>

          <dl className="divide-y divide-slate-100 px-6">
            <div className="flex items-center gap-4 py-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <Mail size={18} />
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Email</dt>
                <dd className="mt-1 truncate text-sm font-semibold text-slate-700">{user.email || 'Not provided'}</dd>
              </div>
            </div>
            <div className="flex items-center gap-4 py-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <ShieldCheck size={18} />
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Sign-in provider</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-700">Google</dd>
              </div>
            </div>
            <div className="flex items-center gap-4 py-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <UserRound size={18} />
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Account ID</dt>
                <dd className="mt-1 truncate font-mono text-xs font-semibold text-slate-600">{user.id}</dd>
              </div>
            </div>
          </dl>

          <div className="border-t border-slate-100 bg-slate-50/70 p-6">
            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Link
                to="/nfl-draft/simulator"
                className="rounded-xl bg-[#022A53] px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-[#011f40]"
              >
                Open Simulator
              </Link>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LogOut size={16} />
                {signingOut ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
