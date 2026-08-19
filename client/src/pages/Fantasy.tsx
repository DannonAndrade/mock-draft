import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { CalendarDays, ChevronRight, Plus, Trash2, Users } from 'lucide-react';
import { deleteFantasyBoard, listFantasyBoards, type FantasyBoard } from '../utils/api';
import { useAuth } from '../hooks/useAuth';

export default function Fantasy() {
  const { user, loading: authLoading } = useAuth();
  const [boards, setBoards] = useState<FantasyBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    listFantasyBoards()
      .then(({ boards: savedBoards }) => setBoards(savedBoards))
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load draft boards'))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) return <div className="min-h-[calc(100vh-64px)] bg-slate-50" />;
  if (!user) return <Navigate to="/signin" replace />;

  const removeBoard = async (board: FantasyBoard) => {
    if (!window.confirm(`Delete “${board.name}”? This cannot be undone.`)) return;
    try {
      await deleteFantasyBoard(board.id);
      setBoards((current) => current.filter((item) => item.id !== board.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete draft board');
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f1f5f9] px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#0081C6]">Fantasy</p><h1 className="mt-2 text-4xl font-black tracking-tight text-[#022A53]">Your draft boards</h1><p className="mt-2 text-slate-600">Create a board for each league and return to it anytime.</p></div>
          <Link to="/fantasy/draft-boards/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#022A53] px-5 py-3 font-bold text-white hover:bg-[#011f40]"><Plus size={18} /> Create draft board</Link>
        </div>
        {error && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {loading ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-48 animate-pulse rounded-2xl bg-white" />)}</div>
        ) : boards.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-[#0081C6]"><Plus size={22} /></div>
            <h2 className="mt-4 text-xl font-extrabold text-slate-900">Create your first draft board</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Choose your league settings once, then use the full board screen for rankings and draft-day tracking.</p>
            <Link to="/fantasy/draft-boards/new" className="mt-6 inline-flex rounded-xl bg-[#022A53] px-5 py-3 font-bold text-white">Get started</Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <article key={board.id} className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-extrabold uppercase tracking-wider text-[#0081C6]">{board.season} season</p><h2 className="mt-2 truncate text-xl font-extrabold text-slate-900">{board.name}</h2></div><button onClick={() => void removeBoard(board)} aria-label={`Delete ${board.name}`} className="relative z-10 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button></div>
                <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-slate-600"><span className="rounded-full bg-slate-100 px-3 py-1.5">{board.scoring}</span><span className="rounded-full bg-slate-100 px-3 py-1.5">{board.draftOrder}</span><span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5"><Users size={12} /> {board.leagueSize} teams</span>{board.draftOrder !== 'Auction' && <span className="rounded-full bg-slate-100 px-3 py-1.5">Pick {board.draftPosition}</span>}</div>
                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400"><span className="inline-flex items-center gap-1.5"><CalendarDays size={13} /> Updated {new Date(board.updatedAt).toLocaleDateString()}</span><span className="inline-flex items-center gap-1 font-bold text-[#0074b3]">Open <ChevronRight size={14} /></span></div>
                <Link to={`/fantasy/draft-boards/${board.id}`} aria-label={`Open ${board.name}`} className="absolute inset-0 rounded-2xl" />
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
