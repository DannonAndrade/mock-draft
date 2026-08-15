import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserId } from '../hooks/useUserId';
import { createDraft, joinDraft } from '../utils/api';
import DraftBaseLogo from '../assets/DraftBase-Logo.svg';

export default function Home() {
  const navigate = useNavigate();
  const userId = useUserId();
  const [draftIdInput, setDraftIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateDraft = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await createDraft(userId);
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
    if (!userId || !draftIdInput.trim()) {
      setError('Please enter a draft ID');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await joinDraft(draftIdInput.trim(), userId);
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
    <div className="min-h-[calc(100vh-64px)] bg-[#f1f5f9] flex items-center justify-center p-4 relative font-sans">
      {/* Subtle light background grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e160_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e160_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="relative bg-white border border-slate-200/80 p-8 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Top blue accent banner */}
        <div className="absolute top-0 inset-x-0 h-3 bg-[#022A53]" />

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-14 bg-slate-50 rounded-2xl mb-4 border border-slate-200 shadow-xs p-2.5">
            <img src={DraftBaseLogo} alt="DraftBase Logo" className="h-full w-auto object-contain mx-auto" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            DraftBase <span className="text-[#0081C6] font-semibold">Simulator</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Create or join a draft to get started</p>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-medium flex items-start gap-2.5">
            <span className="text-lg leading-none mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-5">
          <button
            onClick={handleCreateDraft}
            disabled={loading || !userId}
            className="w-full bg-[#022A53] hover:bg-[#011f40] text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-blue-500/10 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create New Draft'}
          </button>

          <div className="relative flex py-2.5 items-center">
            <div className="flex-grow border-t-2 border-slate-200"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-xs font-black uppercase tracking-wider">or</span>
            <div className="flex-grow border-t-2 border-slate-200"></div>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Enter Draft ID"
              value={draftIdInput}
              onChange={(e) => setDraftIdInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinDraft()}
              className="w-full bg-white border-2 border-slate-300 focus:border-[#022A53] rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-4 focus:ring-[#022A53]/10 placeholder-slate-500 text-slate-800 font-bold transition-all shadow-xs"
            />

            <button
              onClick={handleJoinDraft}
              disabled={loading || !userId || !draftIdInput.trim()}
              className="w-full bg-white hover:bg-blue-50/40 text-[#022A53] border-2 border-[#022A53] py-3.5 rounded-2xl font-black active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              {loading ? 'Joining...' : 'Join Draft'}
            </button>
          </div>
        </div>

        {userId && (
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-55 bg-slate-50 text-slate-600 text-xs font-bold rounded-full border border-slate-200">
              <span className="w-1.5 h-1.5 bg-[#0081C6] rounded-full animate-ping"></span>
              User ID: <span className="font-mono font-medium">{userId}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}