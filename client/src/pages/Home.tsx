import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import DraftBaseLogo from '../assets/DraftBase-Logo.svg';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="relative flex min-h-[calc(100vh-64px)] items-center justify-center overflow-hidden bg-[#f1f5f9] px-6 py-16">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#cbd5e160_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e160_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-blue-50 to-transparent" />

      <main className="relative mx-auto max-w-2xl text-center">
        <img
          src={DraftBaseLogo}
          alt="DraftBase"
          className="mx-auto mb-8 h-16 w-auto"
        />

        <h1 className="text-4xl font-black tracking-tight text-[#022A53] sm:text-6xl">
          DraftBase
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-slate-500 sm:text-lg">
          Build custom rankings and run live NFL mock drafts with friends or CPU teams.
        </p>

        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to={user ? '/simulator' : '/signin'}
            className="rounded-xl bg-[#022A53] px-6 py-3.5 font-bold text-white shadow-sm transition hover:bg-[#011f40]"
          >
            {user ? 'Open Simulator' : 'Get Started'}
          </Link>
          <Link
            to="/board"
            className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 font-bold text-slate-700 transition hover:border-[#0081C6] hover:text-[#0081C6]"
          >
            Draft Board
          </Link>
        </div>
      </main>
    </div>
  );
}
