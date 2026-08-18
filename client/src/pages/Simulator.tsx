import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { createDraft, joinDraft } from '../utils/api';
import DraftBaseLogo from '../assets/DraftBase-Logo.svg';

export default function Simulator() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [draftIdInput, setDraftIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (authLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#0081C6]" />
      </div>
    );
  }

  if (!user) return <Navigate to="/signin" replace />;

  const handleCreateDraft = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await createDraft();
      localStorage.setItem('activeDraftId', response.draft.id);
      navigate(`/draft/${response.draft.id}`);
    } catch (err) {
      setError('Failed to create draft. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinDraft = async () => {
    if (!draftIdInput.trim()) {
      setError('Please enter a draft ID');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await joinDraft(draftIdInput.trim());
      localStorage.setItem('activeDraftId', draftIdInput.trim());
      navigate(`/draft/${draftIdInput.trim()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join draft');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-64px)] items-center justify-center bg-[#f1f5f9] p-4 font-sans">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#cbd5e160_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e160_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-8 shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-3 bg-[#022A53]" />

        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-24 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-2.5 shadow-xs">
            <img src={DraftBaseLogo} alt="DraftBase Logo" className="mx-auto h-full w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Draft <span className="font-semibold text-[#0081C6]">Simulator</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Create a new room or join an existing draft.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-5">
          <button
            onClick={handleCreateDraft}
            disabled={loading}
            className="w-full rounded-2xl bg-[#022A53] py-3.5 font-bold text-white shadow-lg shadow-blue-500/10 transition-all hover:bg-[#011f40] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create New Draft'}
          </button>

          <div className="relative flex items-center py-2.5">
            <div className="flex-grow border-t-2 border-slate-200" />
            <span className="mx-4 flex-shrink text-xs font-black uppercase tracking-wider text-slate-400">or</span>
            <div className="flex-grow border-t-2 border-slate-200" />
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Enter Draft ID"
              value={draftIdInput}
              onChange={(event) => setDraftIdInput(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && void handleJoinDraft()}
              className="w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-3.5 font-bold text-slate-800 shadow-xs transition-all placeholder:text-slate-500 focus:border-[#022A53] focus:outline-none focus:ring-4 focus:ring-[#022A53]/10"
            />
            <button
              onClick={handleJoinDraft}
              disabled={loading || !draftIdInput.trim()}
              className="w-full rounded-2xl border-2 border-[#022A53] bg-white py-3.5 font-black text-[#022A53] shadow-xs transition-all hover:bg-blue-50/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? 'Joining...' : 'Join Draft'}
            </button>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0081C6]" />
            Signed in as <span className="font-medium">{user.displayName}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
