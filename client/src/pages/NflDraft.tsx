import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function NflDraft() {
  const { user } = useAuth();

  return (
    <div className="relative flex min-h-[calc(100vh-64px)] items-center bg-[#f1f5f9] px-6 py-16">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#cbd5e160_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e160_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="relative mx-auto w-full max-w-5xl">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#0081C6]">NFL Draft</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-[#022A53] sm:text-5xl">Run your own mock draft</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
          Create a live draft room, invite friends, and fill open teams with automated opponents.
        </p>

        <div className="mt-10 max-w-xl rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5">
          <p className="text-sm font-bold text-[#0081C6]">Mock draft simulator</p>
          <h2 className="mt-2 text-2xl font-extrabold text-slate-900">Start or join a draft</h2>
          <p className="mt-3 leading-7 text-slate-500">Draft in real time, manage your team, and follow every pick as it happens.</p>
          <Link
            to={user ? '/nfl-draft/simulator' : '/signin'}
            className="mt-6 inline-flex rounded-xl bg-[#022A53] px-5 py-3 font-bold text-white transition hover:bg-[#011f40]"
          >
            {user ? 'Open simulator' : 'Sign in to draft'}
          </Link>
        </div>
      </div>
    </div>
  );
}
