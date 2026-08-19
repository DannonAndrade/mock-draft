import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { createFantasyBoard, type FantasyBoard } from '../utils/api';
import { useAuth } from '../hooks/useAuth';

export default function NewFantasyBoard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(`${new Date().getFullYear()} Fantasy Board`);
  const [scoring, setScoring] = useState<FantasyBoard['scoring']>('PPR');
  const [draftOrder, setDraftOrder] = useState<FantasyBoard['draftOrder']>('Snake');
  const [leagueSize, setLeagueSize] = useState(10);
  const [draftPosition, setDraftPosition] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!loading && !user) return <Navigate to="/signin" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const { board } = await createFantasyBoard({ name: name.trim(), season: new Date().getFullYear(), scoring, draftOrder, leagueSize, draftPosition });
      navigate(`/fantasy/draft-boards/${board.id}`, { replace: true });
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create draft board'); setSaving(false); }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f1f5f9] px-4 py-12">
      <form onSubmit={submit} className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-10">
        <Link to="/fantasy" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#0081C6]"><ArrowLeft size={16} /> Draft boards</Link>
        <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.18em] text-[#0081C6]">New fantasy board</p><h1 className="mt-2 text-3xl font-black text-[#022A53]">Set up your draft</h1><p className="mt-2 text-sm leading-6 text-slate-500">These settings determine rankings and pick positions. They’ll stay out of the way once you open the board.</p>
        {error && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <label className="sm:col-span-2 text-sm font-bold text-slate-700">Board name<input autoFocus required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium outline-none focus:border-[#0081C6] focus:ring-2 focus:ring-sky-100" /></label>
          <label className="text-sm font-bold text-slate-700">Scoring<select value={scoring} onChange={(event) => setScoring(event.target.value as FantasyBoard['scoring'])} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#0081C6]"><option>PPR</option><option>Half PPR</option><option>Standard</option><option>Superflex</option></select></label>
          <label className="text-sm font-bold text-slate-700">Draft type<select value={draftOrder} onChange={(event) => setDraftOrder(event.target.value as FantasyBoard['draftOrder'])} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#0081C6]"><option>Snake</option><option>Linear</option><option>Auction</option></select></label>
          <label className="text-sm font-bold text-slate-700">League size<select value={leagueSize} onChange={(event) => { const size = Number(event.target.value); setLeagueSize(size); setDraftPosition((pick) => Math.min(pick, size)); }} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#0081C6]">{[8, 10, 12, 14, 16].map((size) => <option key={size} value={size}>{size} teams</option>)}</select></label>
          <label className="text-sm font-bold text-slate-700">Draft position<select value={draftPosition} onChange={(event) => setDraftPosition(Number(event.target.value))} disabled={draftOrder === 'Auction'} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#0081C6] disabled:bg-slate-100 disabled:text-slate-400">{Array.from({ length: leagueSize }, (_, index) => <option key={index + 1} value={index + 1}>Pick {index + 1}</option>)}</select></label>
        </div>
        <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Link to="/fantasy" className="rounded-xl px-5 py-3 text-center font-bold text-slate-600 hover:bg-slate-100">Cancel</Link><button disabled={saving || !name.trim()} className="rounded-xl bg-[#022A53] px-6 py-3 font-bold text-white hover:bg-[#011f40] disabled:opacity-50">{saving ? 'Creating…' : 'Create draft board'}</button></div>
      </form>
    </div>
  );
}
