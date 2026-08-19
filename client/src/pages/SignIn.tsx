import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import DraftBaseLogo from '../assets/DraftBase-Logo.svg';

function GoogleLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" className="h-[18px] w-[18px] shrink-0">
      <path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.797 2.716v2.258h2.909c1.702-1.567 2.684-3.875 2.684-6.614Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.181l-2.909-2.258c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.963 10.706A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.168.281-1.706V4.962H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.038l3.007-2.332Z" />
      <path fill="#EA4335" d="M9 3.58c1.322 0 2.508.454 3.441 1.346l2.581-2.581C13.464.892 11.426 0 9 0A9 9 0 0 0 .956 4.962l3.007 2.332C4.672 5.165 6.656 3.58 9 3.58Z" />
    </svg>
  );
}

export default function SignIn() {
  const { user, loading, signIn } = useAuth();
  const [searchParams] = useSearchParams();
  const [redirecting, setRedirecting] = useState(false);
  const authError = searchParams.has('authError');

  const handleGoogleSignIn = () => {
    setRedirecting(true);
    signIn();
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#0081C6]" />
      </div>
    );
  }

  if (user) return <Navigate to="/nfl-draft/simulator" replace />;

  return (
    <div className="relative flex min-h-[calc(100vh-64px)] items-center justify-center bg-[#f8fafc] px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#e0f2fe,transparent_42%)]" />
      <div className="relative w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white px-8 py-10 text-center shadow-lg shadow-slate-900/5 sm:px-10">
        <Link to="/" className="mb-7 inline-flex h-14 w-24 items-center justify-center rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-200">
          <img src={DraftBaseLogo} alt="DraftBase" className="h-full w-auto" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome to DraftBase</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">
          Sign in to create a draft, join a room, and make your picks.
        </p>

        {authError && (
          <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700">
            We couldn’t sign you in with Google. Please try again.
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={redirecting}
          className="mt-7 grid h-11 w-full grid-cols-[24px_1fr_24px] items-center rounded-md border border-[#dadce0] bg-white px-3 text-sm font-medium text-[#3c4043] shadow-sm transition hover:border-[#d2e3fc] hover:bg-[#f8faff] hover:shadow disabled:cursor-wait disabled:opacity-70"
        >
          {redirecting ? (
            <span className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-slate-200 border-t-[#4285F4]" />
          ) : (
            <GoogleLogo />
          )}
          <span>{redirecting ? 'Redirecting to Google…' : 'Sign in with Google'}</span>
          <span />
        </button>

        <p className="mt-6 text-xs leading-5 text-slate-500">
          We’ll receive your name, email address, and profile photo from Google. We never receive your Google password.
        </p>
        <Link to="/" className="mt-6 inline-block text-sm font-medium text-[#0074b3] hover:underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}
