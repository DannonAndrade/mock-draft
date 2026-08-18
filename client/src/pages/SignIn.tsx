import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import DraftBaseLogo from '../assets/DraftBase-Logo.svg';

export default function SignIn() {
  const { user, loading, signIn } = useAuth();
  const [searchParams] = useSearchParams();

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#0081C6]" />
      </div>
    );
  }

  if (user) return <Navigate to="/simulator" replace />;

  return (
    <div className="relative flex min-h-[calc(100vh-64px)] items-center justify-center bg-slate-100 p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#dbeafe,transparent_45%)]" />
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <Link to="/" className="mb-6 inline-flex h-16 w-28 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <img src={DraftBaseLogo} alt="DraftBase" className="h-full w-auto" />
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Sign in to DraftBase</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
          Sign in to create draft rooms, claim a team, and make picks securely.
        </p>

        {searchParams.get('authError') && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            Google sign-in was not completed. Please try again.
          </div>
        )}

        <button
          onClick={signIn}
          className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3.5 font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-base font-black text-[#4285F4]">G</span>
          Continue with Google
        </button>

        <p className="mt-6 text-xs leading-5 text-slate-400">
          DraftBase only receives your basic Google profile and email. It cannot access Gmail, Drive, or your password.
        </p>
        <Link to="/" className="mt-5 inline-block text-sm font-semibold text-[#0081C6] hover:underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}
