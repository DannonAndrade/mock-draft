import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  closestCenter, DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent, type Modifier,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertCircle, ArrowLeft, Check, ChevronDown, ChevronUp, Download, Flag, GripVertical, ListFilter,
  MousePointer2, Pause, Play, Plus, Radio, RefreshCw, Search, Star,
  Trash2, Undo2, X,
} from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  FantasyPlayer, getFantasyBoard, getFantasyPlayerGameLog, getFantasyPlayers, updateFantasyBoard,
  type FantasyGameLog, type FantasyGameLogEntry,
} from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import NflTeamLogo from '../components/NflTeamLogo';

type Scoring = 'PPR' | 'Half PPR' | 'Standard' | 'Superflex';
type DraftOrder = 'Snake' | 'Linear' | 'Auction';
type Position = 'ALL' | FantasyPlayer['position'];
type BoardMeta = Record<string, { note: string; target: boolean; avoid: boolean }>;

const POSITIONS: Position[] = ['ALL', 'RB', 'WR', 'QB', 'TE', 'D/ST', 'K'];
const positionColors: Record<string, string> = {
  RB: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  WR: 'bg-violet-50 text-violet-700 border-violet-200',
  QB: 'bg-rose-50 text-rose-700 border-rose-200',
  TE: 'bg-amber-50 text-amber-700 border-amber-200',
  'D/ST': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  K: 'bg-slate-100 text-slate-600 border-slate-200',
};
const tierColors = ['border-cyan-400', 'border-violet-400', 'border-amber-400', 'border-emerald-400', 'border-rose-400', 'border-blue-400'];
const restrictToVerticalColumn: Modifier = ({ transform }) => ({ ...transform, x: 0 });

function SortableBoardItem({ id, disabled, children }: { id: string; disabled: boolean; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
    transition: null,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: 'relative',
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.25 : 1,
  };

  return <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={disabled ? '' : 'cursor-grab touch-pan-y active:cursor-grabbing'}>{children}</div>;
}

function PlayerImageLink({ player }: { player: FantasyPlayer }) {
  const content = player.headshot
    ? <img src={player.headshot} draggable={false} onError={(event) => { event.currentTarget.style.display = 'none'; }} alt="" className="w-full h-full object-cover" />
    : <span className="text-[9px] font-black text-slate-400">NFL</span>;
  const className = 'h-8 w-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center';

  return player.espnUrl ? (
    <a href={player.espnUrl} target="_blank" rel="noreferrer noopener" title={`View ${player.name} on ESPN`} aria-label={`View ${player.name} on ESPN`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} className={`${className} hover:border-cyan-500 hover:ring-2 hover:ring-cyan-100 transition`}>
      {content}
    </a>
  ) : <div className={className}>{content}</div>;
}

function playerRank(player: FantasyPlayer, scoring: Scoring) {
  if (scoring === 'Standard') return player.standardRank;
  if (scoring === 'Superflex') return player.superflexRank;
  if (scoring === 'Half PPR') return Math.round((player.pprRank + player.standardRank) / 2);
  return player.pprRank;
}

function formatNumber(value: number | null, digits = 1) {
  return value == null ? '—' : value.toFixed(digits);
}

function gameStatCells(player: FantasyPlayer, game: FantasyGameLogEntry) {
  const stat = game.stats;
  const touchdowns = (stat.rushingTouchdowns ?? 0) + (stat.receivingTouchdowns ?? 0);
  if (player.position === 'QB') {
    return [
      { label: 'CMP/ATT', value: `${stat.completions ?? 0}/${stat.passingAttempts ?? 0}` },
      { label: 'PASS YD', value: stat.passingYards ?? 0 },
      { label: 'PASS TD', value: stat.passingTouchdowns ?? 0 },
      { label: 'INT', value: stat.interceptions ?? stat.passingInterceptions ?? 0 },
      { label: 'RUSH YD', value: stat.rushingYards ?? 0 },
    ];
  }
  if (player.position === 'K') {
    return [
      { label: 'FG', value: `${stat.fieldGoalsMade ?? 0}/${stat.fieldGoalAttempts ?? 0}` },
      { label: '40–49', value: stat.fieldGoalsMade40_49 ?? 0 },
      { label: '50+', value: stat.fieldGoalsMade50 ?? 0 },
      { label: 'XP', value: `${stat.extraPointsMade ?? 0}/${stat.extraPointAttempts ?? 0}` },
    ];
  }
  return [
    { label: 'CAR', value: stat.rushingAttempts ?? 0 },
    { label: 'RUSH YD', value: stat.rushingYards ?? 0 },
    { label: 'REC/TGT', value: `${stat.receptions ?? 0}/${stat.receivingTargets ?? 0}` },
    { label: 'REC YD', value: stat.receivingYards ?? 0 },
    { label: 'TD', value: touchdowns },
  ];
}

function teamSlotForOverall(overall: number, leagueSize: number, order: DraftOrder) {
  const round = Math.floor((overall - 1) / leagueSize) + 1;
  const roundPick = ((overall - 1) % leagueSize) + 1;
  return order === 'Snake' && round % 2 === 0 ? leagueSize - roundPick + 1 : roundPick;
}

export default function DraftBoard() {
  const { boardId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [boardName, setBoardName] = useState('Fantasy Draft Board');
  const [players, setPlayers] = useState<FantasyPlayer[]>([]);
  const [season, setSeason] = useState(new Date().getFullYear());
  const [boardIds, setBoardIds] = useState<string[]>([]);
  const [meta, setMeta] = useState<BoardMeta>({});
  const [scoring, setScoring] = useState<Scoring>('PPR');
  const [draftOrder, setDraftOrder] = useState<DraftOrder>('Snake');
  const [leagueSize, setLeagueSize] = useState(10);
  const [draftPosition, setDraftPosition] = useState(1);
  const [tierBreakIds, setTierBreakIds] = useState<string[]>([]);
  const [liveMode, setLiveMode] = useState(false);
  const [draftLog, setDraftLog] = useState<string[]>([]);
  const [position, setPosition] = useState<Position>('ALL');
  const [team, setTeam] = useState('ALL');
  const [teamFilterOpen, setTeamFilterOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [gameLogs, setGameLogs] = useState<Record<string, FantasyGameLog>>({});
  const [gameLogLoading, setGameLogLoading] = useState<Record<string, boolean>>({});
  const [gameLogErrors, setGameLogErrors] = useState<Record<string, string>>({});
  const [savedLoaded, setSavedLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 1 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 80, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const loadBoard = async () => {
    if (!boardId) return;
    setSavedLoaded(false);
    setLoading(true);
    setError('');
    try {
      const [response, { board }] = await Promise.all([getFantasyPlayers(), getFantasyBoard(boardId)]);
      setPlayers(response.players);
      setSeason(response.season);
      setBoardName(board.name);
      setScoring(board.scoring);
      setDraftOrder(board.draftOrder);
      setLeagueSize(board.leagueSize);
      setDraftPosition(board.draftPosition);
      const playerIds = new Set(response.players.map((player) => player.id));
      setBoardIds(board.state.boardIds.length ? board.state.boardIds.filter((id) => playerIds.has(id)) : response.players.slice(0, 100).map((player) => player.id));
      setMeta(board.state.meta ?? {});
      setTierBreakIds(board.state.tierBreakIds ?? []);
      setLiveMode(board.state.liveMode ?? false);
      setDraftLog((board.state.draftLog ?? []).filter((id) => playerIds.has(id)));
      setSavedLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load fantasy players');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user && boardId) void loadBoard(); }, [user, boardId]);

  useEffect(() => {
    if (!savedLoaded || !boardId) return;
    setSaveStatus('saving');
    const timeout = window.setTimeout(() => {
      updateFantasyBoard(boardId, { boardIds, meta, tierBreakIds, liveMode, draftLog })
        .then(() => setSaveStatus('saved'))
        .catch(() => setSaveStatus('error'));
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [boardIds, meta, tierBreakIds, liveMode, draftLog, savedLoaded, boardId]);

  useEffect(() => {
    if (draftPosition > leagueSize) setDraftPosition(leagueSize);
  }, [draftPosition, leagueSize]);

  const playerMap = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const teams = useMemo(() => [...new Set(players.map((player) => player.team))].sort(), [players]);
  const boardPlayers = useMemo(
    () => boardIds.map((id) => playerMap.get(id)).filter((player): player is FantasyPlayer => Boolean(player)),
    [boardIds, playerMap],
  );
  const normalizedSearch = search.trim().toLowerCase();
  const visibleBoard = boardPlayers.filter((player) =>
    (position === 'ALL' || player.position === position) &&
    (team === 'ALL' || player.team === team) &&
    (!liveMode || !draftLog.includes(player.id)) &&
    (!normalizedSearch || `${player.name} ${player.team} ${player.position}`.toLowerCase().includes(normalizedSearch)),
  );
  const availablePlayers = players
    .filter((player) => !boardIds.includes(player.id))
    .filter((player) => position === 'ALL' || player.position === position)
    .filter((player) => team === 'ALL' || player.team === team)
    .filter((player) => !liveMode || !draftLog.includes(player.id))
    .filter((player) => !normalizedSearch || `${player.name} ${player.team} ${player.position}`.toLowerCase().includes(normalizedSearch))
    .sort((a, b) => playerRank(a, scoring) - playerRank(b, scoring));

  const positionCounts = useMemo(() => boardPlayers.reduce<Record<string, number>>((counts, player) => {
    counts[player.position] = (counts[player.position] ?? 0) + 1;
    return counts;
  }, {}), [boardPlayers]);

  const draftPicks = useMemo(() => {
    if (draftOrder === 'Auction') return [];
    return Array.from({ length: 16 }, (_, index) => {
      const round = index + 1;
      const slot = draftOrder === 'Snake' && round % 2 === 0 ? leagueSize - draftPosition + 1 : draftPosition;
      return { round, slot, overall: (round - 1) * leagueSize + slot };
    });
  }, [draftOrder, leagueSize, draftPosition]);
  const pickByOverall = useMemo(() => new Map(draftPicks.map((pick) => [pick.overall, pick])), [draftPicks]);
  const draftedSet = useMemo(() => new Set(draftLog), [draftLog]);
  const currentOverallPick = draftLog.length + 1;
  const currentRound = Math.floor((currentOverallPick - 1) / leagueSize) + 1;
  const currentRoundPick = ((currentOverallPick - 1) % leagueSize) + 1;
  const currentTeamSlot = teamSlotForOverall(currentOverallPick, leagueSize, draftOrder);
  const nextUserPick = draftPicks.find((pick) => pick.overall >= currentOverallPick);

  const tierForIndex = (index: number) => 1 + boardIds
    .slice(1, index + 1)
    .filter((id) => tierBreakIds.includes(id)).length;

  const toggleDrafted = (playerId: string) => {
    setDraftLog((current) => current.includes(playerId)
      ? current.filter((id) => id !== playerId)
      : [...current, playerId]);
  };

  const resetLiveDraft = () => {
    if (!draftLog.length || window.confirm('Clear every taken player and restart live draft tracking at pick 1?')) setDraftLog([]);
  };

  const toggleLiveDraft = () => {
    if (liveMode) setDraftLog([]);
    setLiveMode(!liveMode);
    setMovingId(null);
  };

  const placePlayer = (playerId: string, targetId?: string) => {
    if (targetId === playerId) {
      setMovingId(null);
      return;
    }
    setBoardIds((current) => {
      const copy = current.filter((id) => id !== playerId);
      const target = targetId ? copy.indexOf(targetId) : copy.length;
      copy.splice(target < 0 ? copy.length : target, 0, playerId);
      return copy;
    });
    setMovingId(null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveDragId(null);
    if (!over || active.id === over.id) return;
    setBoardIds((current) => {
      const oldIndex = current.indexOf(String(active.id));
      const newIndex = current.indexOf(String(over.id));
      return oldIndex < 0 || newIndex < 0 ? current : arrayMove(current, oldIndex, newIndex);
    });
  };

  const updateMeta = (id: string, value: Partial<BoardMeta[string]>) => {
    setMeta((current) => ({
      ...current,
      [id]: { note: current[id]?.note ?? '', target: current[id]?.target ?? false, avoid: current[id]?.avoid ?? false, ...value },
    }));
  };

  const loadPlayerGameLog = async (player: FantasyPlayer) => {
    if (gameLogs[player.id] || gameLogLoading[player.id]) return;
    if (player.position === 'D/ST') {
      setGameLogs((current) => ({ ...current, [player.id]: { season: season - 1, source: 'ESPN', games: [] } }));
      return;
    }
    setGameLogLoading((current) => ({ ...current, [player.id]: true }));
    setGameLogErrors((current) => ({ ...current, [player.id]: '' }));
    try {
      const log = await getFantasyPlayerGameLog(player.id, season - 1, scoring);
      setGameLogs((current) => ({ ...current, [player.id]: log }));
    } catch (err) {
      setGameLogErrors((current) => ({ ...current, [player.id]: err instanceof Error ? err.message : 'Game log unavailable' }));
    } finally {
      setGameLogLoading((current) => ({ ...current, [player.id]: false }));
    }
  };

  const togglePlayerDetails = (player: FantasyPlayer) => {
    if (expandedId === player.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(player.id);
    void loadPlayerGameLog(player);
  };

  const resetBoard = () => {
    if (!window.confirm('Reset your board to ESPN’s current top 100? Your custom order and notes will be replaced.')) return;
    setBoardIds([...players].sort((a, b) => playerRank(a, scoring) - playerRank(b, scoring)).slice(0, 100).map((p) => p.id));
    setMeta({});
    setTierBreakIds([]);
  };

  const downloadCsv = () => {
    const escape = (value: string | number | null | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = boardPlayers.map((player, index) => [
      index + 1, player.name, player.position, player.team, tierForIndex(index),
      playerRank(player, scoring), player.projectedPoints, player.adp, player.auctionValue,
      player.injuryStatus, draftedSet.has(player.id) ? draftLog.indexOf(player.id) + 1 : '',
      meta[player.id]?.target ? 'Yes' : 'No', meta[player.id]?.avoid ? 'Yes' : 'No', meta[player.id]?.note ?? '',
    ].map(escape).join(','));
    const header = ['My Rank', 'Player', 'Position', 'Team', 'Tier', `${scoring} ESPN Rank`, 'Projected Points', 'ADP', 'Auction Value', 'Status', 'Drafted At', 'Target', 'Do Not Draft', 'Notes'].map(escape).join(',');
    const blob = new Blob([[header, ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `draftbase-${season}-${scoring.toLowerCase().replace(' ', '-')}-board.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!authLoading && !user) return <Navigate to="/signin" replace />;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#eef2f6] text-slate-900">
      <section className="bg-[#061f3c] text-white border-b border-slate-800">
        <div className="max-w-screen-2xl mx-auto px-4 py-4 sm:px-6">
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-black uppercase tracking-[0.14em]">
            <Link to="/fantasy" className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white"><ArrowLeft size={12} /> Draft boards</Link>
            <span className="text-slate-600">/</span>
            <span className="inline-flex items-center gap-1.5 text-cyan-400"><span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> {season} Fantasy Football</span>
          </div>
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="mr-1 truncate text-xl font-black tracking-tight sm:text-2xl">{boardName}</h1>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-300">
                <span className="rounded-md bg-white/10 px-2 py-1">{scoring}</span>
                <span className="rounded-md bg-white/10 px-2 py-1">{draftOrder}</span>
                <span className="rounded-md bg-white/10 px-2 py-1">{leagueSize} teams</span>
                {draftOrder !== 'Auction' && <span className="rounded-md bg-white/10 px-2 py-1">Pick {draftPosition}</span>}
                <span className={`inline-flex items-center gap-1 px-1.5 ${saveStatus === 'error' ? 'text-red-300' : 'text-slate-400'}`}>
                  {saveStatus === 'saved' && <Check size={13} />}{saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? 'Save failed' : 'Saved'}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              <button onClick={toggleLiveDraft} disabled={!players.length} className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-black transition disabled:opacity-50 ${liveMode ? 'bg-rose-500 text-white border-rose-400 hover:bg-rose-600' : 'bg-emerald-500 text-[#061f3c] border-emerald-400 hover:bg-emerald-400'}`}>
                {liveMode ? <><Pause size={14} /> Exit live</> : <><Play size={14} /> Live draft</>}
              </button>
              <button onClick={resetBoard} disabled={!players.length} className="inline-flex items-center gap-1.5 rounded-md border border-slate-600 px-3 py-2 text-xs font-bold hover:bg-white/5 disabled:opacity-50">
                <RefreshCw size={13} /> Reset
              </button>
              <button onClick={downloadCsv} disabled={!boardPlayers.length} className="inline-flex items-center gap-1.5 rounded-md bg-[#00a7d8] px-3 py-2 text-xs font-black text-[#061f3c] hover:bg-cyan-500 disabled:opacity-50">
                <Download size={14} /> CSV
              </button>
            </div>
          </div>

          {draftPicks.length > 0 && (
            <div className="mt-3 flex items-center gap-3 border-t border-white/10 pt-3">
              <p className="hidden shrink-0 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 sm:block">Your picks</p>
              <div className="flex flex-1 gap-1.5 overflow-x-auto pb-0.5">
                {draftPicks.map((pick) => <div key={pick.round} className="shrink-0 rounded border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-center"><span className="text-[10px] font-black text-cyan-300">{pick.round}.{String(pick.slot).padStart(2, '0')}</span><span className="ml-1 text-[8px] text-slate-400">#{pick.overall}</span></div>)}
              </div>
            </div>
          )}
        </div>
      </section>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-5">
        {liveMode && (
          <section className="mb-5 overflow-hidden rounded-xl border border-rose-200 bg-white shadow-md">
            <div className="grid lg:grid-cols-[1fr_auto]">
              <div className="bg-[#071f3b] text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="h-11 w-11 rounded-full bg-rose-500/15 border border-rose-400/30 flex items-center justify-center shrink-0"><Radio size={21} className="text-rose-400 animate-pulse" /></div>
                <div className="min-w-0"><div className="flex items-center gap-2"><span className="text-[10px] font-black tracking-[0.18em] uppercase text-rose-400">Live draft</span><span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" /></div><p className="text-xl font-black mt-0.5">Pick {currentOverallPick} · Round {currentRound}, Pick {currentRoundPick}</p><p className="text-xs text-slate-300 mt-1">{draftOrder === 'Auction' ? 'Track each winning nomination as it happens.' : currentTeamSlot === draftPosition ? 'You are on the clock.' : `Team ${currentTeamSlot} is on the clock.`}</p></div>
                {draftOrder !== 'Auction' && nextUserPick && <div className={`sm:ml-auto rounded-lg border px-4 py-2.5 ${nextUserPick.overall === currentOverallPick ? 'bg-emerald-400/15 border-emerald-400 text-emerald-300' : 'bg-white/5 border-white/10 text-slate-200'}`}><p className="text-[9px] uppercase tracking-wider font-black opacity-70">{nextUserPick.overall === currentOverallPick ? 'Your pick now' : 'Your next pick'}</p><p className="font-black">#{nextUserPick.overall} <span className="text-xs font-bold opacity-70">({Math.max(0, nextUserPick.overall - currentOverallPick)} away)</span></p></div>}
              </div>
              <div className="p-4 flex lg:flex-col justify-center gap-2 bg-rose-50">
                <button onClick={() => setDraftLog((log) => log.slice(0, -1))} disabled={!draftLog.length} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-white border border-slate-300 text-xs font-black disabled:opacity-40"><Undo2 size={14} /> Undo last</button>
                <button onClick={resetLiveDraft} disabled={!draftLog.length} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs font-black text-rose-700 disabled:opacity-40"><RefreshCw size={13} /> Restart tracker</button>
              </div>
            </div>
          </section>
        )}
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col lg:flex-row gap-3 lg:items-center justify-between mb-5">
          <div className="flex flex-wrap items-center gap-2">
            <ListFilter size={17} className="text-slate-400 shrink-0" />
            {POSITIONS.map((item) => (
              <button key={item} onClick={() => setPosition(item)} className={`px-3 py-1.5 rounded-md text-xs font-black whitespace-nowrap border ${position === item ? 'bg-[#062b52] text-white border-[#062b52]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                {item} {item !== 'ALL' && <span className="opacity-60">{positionCounts[item] ?? 0}</span>}
              </button>
            ))}
            <div className="mx-1 h-6 w-px shrink-0 bg-slate-200" />
            <div className="relative shrink-0">
              <button type="button" onClick={() => setTeamFilterOpen((open) => !open)} aria-haspopup="listbox" aria-expanded={teamFilterOpen} className="inline-flex min-w-28 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-black text-slate-600 hover:border-slate-400 focus:border-[#0081C6]">
                {team === 'ALL' ? <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-[8px] text-slate-400">NFL</span> : <NflTeamLogo teamName={team} className="h-5 w-5" />}
                <span className="flex-1 text-left">{team === 'ALL' ? 'All teams' : team}</span>
                <ChevronDown size={13} className={`transition-transform ${teamFilterOpen ? 'rotate-180' : ''}`} />
              </button>
              {teamFilterOpen && (
                <div role="listbox" aria-label="Filter by team" className="absolute left-0 top-full z-40 mt-1 grid max-h-72 w-56 grid-cols-2 gap-0.5 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                  <button type="button" role="option" aria-selected={team === 'ALL'} onClick={() => { setTeam('ALL'); setTeamFilterOpen(false); }} className={`col-span-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-bold ${team === 'ALL' ? 'bg-[#062b52] text-white' : 'text-slate-600 hover:bg-slate-100'}`}><span className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-[8px] text-slate-400">NFL</span> All teams</button>
                  {teams.map((teamName) => <button type="button" role="option" aria-selected={team === teamName} key={teamName} onClick={() => { setTeam(teamName); setTeamFilterOpen(false); }} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-bold ${team === teamName ? 'bg-sky-50 text-[#0074b3]' : 'text-slate-600 hover:bg-slate-100'}`}><NflTeamLogo teamName={teamName} className="h-6 w-6" /><span>{teamName}</span></button>)}
                </div>
              )}
            </div>
          </div>
          <div className="relative w-full lg:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search player or team" className="w-full border border-slate-300 rounded-lg pl-9 pr-9 py-2 text-sm outline-none focus:border-[#0081C6] focus:ring-2 focus:ring-blue-100" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={15} /></button>}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3 text-red-800 mb-5">
            <AlertCircle className="shrink-0" size={20} /><div><p className="font-black">Couldn’t load this draft board</p><p className="text-sm mt-1">{error}. Make sure the DraftBase server is running, then try again.</p><button onClick={() => void loadBoard()} className="mt-3 text-sm font-black underline">Try again</button></div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_350px] gap-5 items-start">
          <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 sm:px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div><h2 className="font-black text-lg">My rankings</h2><p className="text-xs text-slate-500 mt-0.5">Drag anywhere on a row · neighbors shift live · or press Space and use arrow keys</p></div>
              <div className="text-right"><span className="text-2xl font-black text-[#062b52]">{boardPlayers.length}</span><p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">players</p></div>
            </div>
            {movingId && (
              <div className="px-4 py-3 bg-cyan-50 border-b border-cyan-200 flex items-center justify-between gap-3 text-sm text-cyan-900">
                <span className="font-bold flex items-center gap-2"><MousePointer2 size={16} /> Click a player row to insert <strong>{playerMap.get(movingId)?.name}</strong> above it.</span>
                <div className="flex gap-2"><button onClick={() => placePlayer(movingId)} className="font-black underline">Move to end</button><button onClick={() => setMovingId(null)} aria-label="Cancel move"><X size={17} /></button></div>
              </div>
            )}
            <div className="hidden md:grid grid-cols-[62px_minmax(220px,1fr)_64px_80px_70px_98px_148px] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <span>Rank</span><span>Player</span><span>ESPN</span><span>Proj.</span><span>ADP</span><span>{liveMode ? 'Draft status' : 'Your pick'}</span><span />
            </div>
            {!loading && visibleBoard.length > 0 && <div className="px-4 py-2 bg-slate-50/70 border-b-2 border-cyan-400 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700">Tier 1</div>}
            {loading ? (
              <div className="p-5 space-y-3">{Array.from({ length: 9 }).map((_, i) => <div key={i} className="h-16 rounded-lg bg-slate-100 animate-pulse" />)}</div>
            ) : visibleBoard.length === 0 ? (
              <div className="p-14 text-center"><p className="font-black text-slate-700">No players match this view.</p><p className="text-sm text-slate-500 mt-1">Adjust the filter or add players from the available pool.</p></div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalColumn]}
                onDragStart={({ active }) => { setActiveDragId(String(active.id)); setMovingId(null); }}
                onDragCancel={() => setActiveDragId(null)}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={visibleBoard.map((player) => player.id)} strategy={verticalListSortingStrategy}>
                  {visibleBoard.map((player) => {
                    const overallIndex = boardIds.indexOf(player.id);
                    const playerMeta = meta[player.id] ?? { note: '', target: false, avoid: false };
                    const isTierBreak = overallIndex > 0 && tierBreakIds.includes(player.id);
                    const tier = tierForIndex(overallIndex);
                    const userPick = pickByOverall.get(overallIndex + 1);
                    const isDrafted = draftedSet.has(player.id);
                    const draftedAt = isDrafted ? draftLog.indexOf(player.id) + 1 : null;
                    return (
                      <SortableBoardItem key={player.id} id={player.id} disabled={liveMode || expandedId === player.id}>
                        {overallIndex > 0 && (
                          <div className={`${isTierBreak ? `border-b-4 ${tierColors[(tier - 1) % tierColors.length]} bg-slate-50 py-1.5` : 'group h-2 hover:bg-cyan-50'} relative flex items-center justify-center transition-colors`}>
                            {isTierBreak ? (
                              <div className="w-full px-4 flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">Tier {tier}</span><button onClick={() => setTierBreakIds((ids) => ids.filter((id) => id !== player.id))} className="text-[10px] font-black text-slate-400 hover:text-red-600">Remove break</button></div>
                            ) : (
                              <button onClick={() => setTierBreakIds((ids) => [...ids, player.id])} className="z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 bg-white border border-cyan-300 rounded-full px-3 py-0.5 text-[9px] font-black text-cyan-700 shadow-sm transition-opacity">+ Start new tier here</button>
                            )}
                          </div>
                        )}
                        <article
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest('button,input,textarea,select,a')) return;
                            if (liveMode) { toggleDrafted(player.id); return; }
                            if (movingId) placePlayer(movingId, player.id);
                          }}
                          className={`relative border-b border-slate-200/70 last:border-0 transition-colors ${isDrafted ? 'bg-slate-100 opacity-60' : playerMeta.avoid ? 'bg-red-50/70' : playerMeta.target ? 'bg-amber-50/80' : 'bg-slate-50/70'} ${liveMode ? 'cursor-pointer hover:bg-rose-50' : movingId && movingId !== player.id ? 'cursor-pointer hover:bg-cyan-50' : playerMeta.target ? 'hover:bg-amber-100/70' : 'hover:bg-slate-100'} ${movingId === player.id ? 'bg-cyan-50 ring-2 ring-inset ring-cyan-400' : ''}`}
                        >
                  <div className="grid grid-cols-[62px_minmax(0,1fr)] md:grid-cols-[62px_minmax(220px,1fr)_64px_80px_70px_98px_148px] gap-2 md:gap-3 items-center px-3 sm:px-4 py-1.5">
                            <div className="flex items-center">
                              <span className={`w-8 text-center text-sm font-black ${isDrafted ? 'line-through text-slate-400' : 'text-slate-700'}`}>{overallIndex + 1}</span>
                            </div>
                            <div className="flex items-center gap-3 min-w-0">
                              <PlayerImageLink player={player} />
                              <div className="min-w-0"><div className="flex items-center gap-2"><button onClick={() => togglePlayerDetails(player)} className={`font-black text-sm text-left truncate hover:text-[#0081C6] ${isDrafted ? 'line-through' : ''}`}>{player.name}</button>{!liveMode && userPick && <span className="md:hidden rounded bg-[#062b52] text-cyan-300 px-1.5 py-0.5 text-[9px] font-black">YOUR {userPick.round}.{String(userPick.slot).padStart(2, '0')}</span>}{liveMode && <button onClick={() => toggleDrafted(player.id)} className={`md:hidden rounded px-1.5 py-0.5 text-[9px] font-black ${isDrafted ? 'bg-slate-300 text-slate-600' : 'bg-rose-100 text-rose-700'}`}>{isDrafted ? `TAKEN #${draftedAt}` : 'MARK TAKEN'}</button>}</div><div className="flex items-center gap-1.5 mt-1"><span className={`border rounded px-1.5 py-0.5 text-[9px] font-black ${positionColors[player.position]}`}>{player.position}</span><span className="text-xs font-bold text-slate-500">{player.team}</span>{player.injuryStatus !== 'ACTIVE' && <span className="text-[9px] font-black text-amber-700 uppercase">{player.injuryStatus}</span>}</div></div>
                            </div>
                            <div className="hidden md:block"><span className="font-black">{playerRank(player, scoring)}</span><p className="text-[10px] text-slate-400">{scoring}</p></div>
                            <div className="hidden md:block"><span className="font-black">{formatNumber(player.projectedPoints)}</span><p className="text-[10px] text-slate-400">points</p></div>
                            <div className="hidden md:block"><span className="font-black">{formatNumber(player.adp)}</span><p className="text-[10px] text-slate-400">pick</p></div>
                            <div className="hidden md:block">{liveMode ? <button onClick={() => toggleDrafted(player.id)} className={`rounded-md px-2.5 py-1.5 text-[10px] font-black border ${isDrafted ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'}`}>{isDrafted ? `Taken #${draftedAt}` : 'Mark taken'}</button> : userPick ? <span className="inline-flex flex-col rounded-md bg-[#062b52] text-white px-2 py-1"><strong className="text-[10px]">R{userPick.round} · {userPick.round}.{String(userPick.slot).padStart(2, '0')}</strong><span className="text-[9px] text-cyan-300">Your pick</span></span> : <span className="text-xs text-slate-300">—</span>}</div>
                    <div className="col-span-2 md:col-span-1 flex items-center justify-end gap-0.5">
                      <button onClick={() => updateMeta(player.id, { target: !playerMeta.target, avoid: false })} title={playerMeta.target ? 'Remove priority target' : 'Mark priority target'} aria-label={playerMeta.target ? `Unstar ${player.name}` : `Star ${player.name}`} className={`h-7 w-7 rounded-md flex items-center justify-center transition ${playerMeta.target ? 'bg-amber-50 text-amber-500' : 'text-slate-400 hover:bg-amber-50 hover:text-amber-500'}`}><Star size={14} className={playerMeta.target ? 'fill-amber-400' : ''} /></button>
                      <button onClick={() => updateMeta(player.id, { avoid: !playerMeta.avoid, target: false })} title={playerMeta.avoid ? 'Remove do-not-draft flag' : 'Do not draft'} aria-label={playerMeta.avoid ? `Remove red flag from ${player.name}` : `Do not draft ${player.name}`} className={`h-7 w-7 rounded-md flex items-center justify-center transition ${playerMeta.avoid ? 'bg-red-100 text-red-600' : 'text-slate-400 hover:bg-red-50 hover:text-red-600'}`}><Flag size={14} className={playerMeta.avoid ? 'fill-red-500' : ''} /></button>
                              <button onClick={() => setMovingId(player.id)} disabled={liveMode} title="Move player" aria-label={`Move ${player.name}`} className="h-7 w-7 rounded-md text-slate-400 hover:bg-cyan-50 hover:text-cyan-700 flex items-center justify-center disabled:opacity-30"><MousePointer2 size={14} /></button>
                              <button onClick={() => { setBoardIds((ids) => ids.filter((id) => id !== player.id)); setTierBreakIds((ids) => ids.filter((id) => id !== player.id)); }} title="Remove from board" aria-label={`Remove ${player.name}`} className="h-7 w-7 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center"><Trash2 size={14} /></button>
                              <button onClick={() => togglePlayerDetails(player)} title="Player details" aria-label={`Show details for ${player.name}`} className="h-7 w-7 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center">{expandedId === player.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                            </div>
                          </div>
                          {expandedId === player.id && (
                            <div className="px-4 pb-4 md:pl-[69px]">
                              <div className="bg-[#f6f8fb] border border-slate-200 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                <div><span className="text-slate-400 font-bold">Last season</span><p className="font-black mt-1">{formatNumber(player.lastSeasonPoints)} pts</p></div>
                                <div><span className="text-slate-400 font-bold">Auction value</span><p className="font-black mt-1">${formatNumber(player.auctionValue, 0)}</p></div>
                                <div><span className="text-slate-400 font-bold">Rostered</span><p className="font-black mt-1">{formatNumber(player.rostered)}%</p></div>
                                <textarea value={playerMeta.note} onChange={(e) => updateMeta(player.id, { note: e.target.value })} placeholder="Add a draft note…" className="col-span-2 sm:col-span-3 resize-none border border-slate-300 rounded-md p-2 outline-none focus:border-[#0081C6]" rows={2} />
                              </div>
                              <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
                                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2.5">
                                  <div><h3 className="text-xs font-black text-slate-800">{season - 1} game log</h3><p className="mt-0.5 text-[10px] text-slate-400">Fantasy points use {scoring} scoring</p></div>
                                  <span className="text-[10px] font-bold text-slate-400">ESPN</span>
                                </div>
                                {gameLogLoading[player.id] ? (
                                  <div className="space-y-2 p-3">{[1, 2, 3].map((item) => <div key={item} className="h-9 animate-pulse rounded bg-slate-100" />)}</div>
                                ) : gameLogErrors[player.id] ? (
                                  <div className="p-4 text-center text-xs text-red-600"><p>{gameLogErrors[player.id]}</p><button onClick={() => void loadPlayerGameLog(player)} className="mt-2 font-black underline">Try again</button></div>
                                ) : !gameLogs[player.id]?.games.length ? (
                                  <p className="p-5 text-center text-xs text-slate-500">{player.position === 'D/ST' ? 'Team-defense game logs aren’t available from this player feed.' : 'No regular-season games were found.'}</p>
                                ) : (
                                  <div className="max-h-96 space-y-1 overflow-auto bg-[#f6f8fb] p-1.5">
                                    {gameLogs[player.id].games.map((game) => (
                                      <div key={game.id} className="flex min-w-[610px] items-stretch overflow-hidden rounded-md border border-slate-200 bg-white transition hover:border-slate-300">
                                        <div className="flex w-10 shrink-0 flex-col items-center justify-center border-r border-slate-100 bg-slate-50 px-1 py-1.5"><span className="text-[8px] font-black uppercase tracking-wide text-slate-400">Wk</span><strong className="text-xs text-slate-800">{game.week}</strong></div>
                                        <div className="flex w-24 shrink-0 flex-col justify-center px-2 py-1.5"><span className="text-[8px] font-black uppercase tracking-wide text-slate-400">Matchup</span>{game.boxScoreUrl ? <a href={game.boxScoreUrl} target="_blank" rel="noreferrer noopener" className="font-black text-slate-800 hover:text-[#0081C6]">{game.location} {game.opponent}</a> : <strong className="text-slate-800">{game.location} {game.opponent}</strong>}</div>
                                        <div className="flex w-20 shrink-0 flex-col justify-center border-r border-slate-100 px-1.5 py-1.5"><span className="text-[8px] font-black uppercase tracking-wide text-slate-400">Result</span><span><strong className={game.result === 'W' ? 'text-emerald-600' : game.result === 'L' ? 'text-red-500' : 'text-slate-600'}>{game.result}</strong> <span className="font-bold text-slate-500">{game.score}</span></span></div>
                                        <div className="flex flex-1 items-stretch">{gameStatCells(player, game).map((cell) => <div key={cell.label} className="flex min-w-14 flex-1 flex-col items-center justify-center border-r border-slate-100 px-1 py-1.5 text-center"><span className="whitespace-nowrap text-[8px] font-black uppercase tracking-wide text-slate-400">{cell.label}</span><strong className="mt-0.5 text-xs text-slate-700">{cell.value}</strong></div>)}</div>
                                        <div className="flex w-16 shrink-0 flex-col items-center justify-center bg-[#e7f7fc] px-1 py-1.5"><span className="text-[8px] font-black uppercase tracking-wide text-[#007ca8]">FPTS</span><strong className="text-base text-[#022A53]">{game.fantasyPoints.toFixed(1)}</strong></div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </article>
                      </SortableBoardItem>
                    );
                  })}
                </SortableContext>
                <DragOverlay adjustScale={false} modifiers={[restrictToVerticalColumn]} dropAnimation={null}>
                  {activeDragId && playerMap.get(activeDragId) ? (
                    <div className="w-full rounded-lg border-2 border-cyan-400 bg-white px-4 py-2 shadow-xl flex items-center gap-3">
                      <GripVertical size={18} className="text-cyan-600" />
                      <div className="h-9 w-9 rounded-full overflow-hidden bg-slate-100 border border-slate-200">{playerMap.get(activeDragId)?.headshot && <img src={playerMap.get(activeDragId)?.headshot ?? ''} alt="" className="h-full w-full object-cover" />}</div>
                      <div><p className="text-sm font-black">{playerMap.get(activeDragId)?.name}</p><p className="text-[10px] font-bold text-slate-500">Moving from rank {boardIds.indexOf(activeDragId) + 1}</p></div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </section>

          <div className="space-y-5 xl:sticky xl:top-20">
            {liveMode && (
              <aside className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-[#071f3b] text-white flex items-center justify-between"><div><h2 className="font-black flex items-center gap-2"><Radio size={14} className="text-rose-400" /> Taken players</h2><p className="text-[10px] text-slate-400 mt-0.5">Newest pick first</p></div><span className="rounded-full bg-rose-500 px-2.5 py-1 text-xs font-black">{draftLog.length}</span></div>
                <div className="max-h-[300px] overflow-y-auto">
                  {draftLog.length === 0 ? <div className="p-7 text-center"><p className="text-sm font-black text-slate-600">No picks recorded</p><p className="text-xs text-slate-400 mt-1">Select a player from either list to move them here.</p></div> : [...draftLog].reverse().map((id) => {
                    const player = playerMap.get(id);
                    const pick = draftLog.indexOf(id) + 1;
                    if (!player) return null;
                    const teamSlot = teamSlotForOverall(pick, leagueSize, draftOrder);
                    return <div key={id} className="flex items-center gap-2.5 px-3 py-2 border-b border-slate-100 last:border-0"><span className="h-7 w-9 rounded bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">#{pick}</span><div className="min-w-0 flex-1"><p className="text-xs font-black truncate">{player.name}</p><p className="text-[9px] font-bold text-slate-400">{player.position} · {player.team}{draftOrder !== 'Auction' ? ` · Team ${teamSlot}` : ''}</p></div><button onClick={() => toggleDrafted(id)} title="Return player to the board" className="h-7 w-7 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center"><X size={14} /></button></div>;
                  })}
                </div>
              </aside>
            )}
            <aside className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200"><h2 className="font-black">Available players</h2><p className="text-xs text-slate-500 mt-0.5">ESPN ranks · {players.length} player pool</p></div>
              <div className={`${liveMode ? 'max-h-[400px]' : 'max-h-[650px]'} overflow-y-auto`}>
                {availablePlayers.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Everyone in this view is already on your board.</p> : availablePlayers.map((player) => (
                  <div key={player.id} className="flex items-center gap-3 px-4 py-2 border-b border-slate-100 hover:bg-slate-50">
                    <span className="w-6 text-xs font-black text-slate-400">{playerRank(player, scoring)}</span>
                    <div className="min-w-0 flex-1"><p className={`text-sm font-black truncate ${draftedSet.has(player.id) ? 'line-through' : ''}`}>{player.name}</p><p className="text-[10px] font-bold text-slate-500">{player.position} · {player.team} · {formatNumber(player.projectedPoints)} pts</p></div>
                    {liveMode ? <button onClick={() => toggleDrafted(player.id)} title={draftedSet.has(player.id) ? `Mark ${player.name} available` : `Mark ${player.name} taken`} className={`h-8 rounded-md px-2 text-[9px] font-black flex items-center justify-center ${draftedSet.has(player.id) ? 'bg-slate-200 text-slate-600' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}`}>{draftedSet.has(player.id) ? `#${draftLog.indexOf(player.id) + 1}` : 'TAKEN'}</button> : <button onClick={() => setBoardIds((ids) => [...ids, player.id])} title={`Add ${player.name}`} className="h-8 w-8 rounded-md bg-[#e7f7fc] text-[#007ca8] hover:bg-[#0081C6] hover:text-white flex items-center justify-center"><Plus size={16} /></button>}
                  </div>
                ))}
              </div>
              <div className="p-3 bg-slate-50 border-t border-slate-200 text-[10px] leading-relaxed text-slate-500">Rankings, projections, and player information are supplied by ESPN’s unofficial public APIs and may change without notice. DraftBase caches results for 15 minutes.</div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
