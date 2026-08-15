import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useDraftState } from '../hooks/useDraftState';
import { useUserId } from '../hooks/useUserId';
import { useSocket } from '../hooks/useSocket';
import PlayerList from '../components/PlayerList';
import NflTeamLogo from '../components/NflTeamLogo';
import { makePick, startDraft } from '../utils/api';
import { Draft, Team, Pick, Player } from '../../../shared';

type PickWithPlayer = Pick & { player?: Player };

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

/** "San Francisco 49ers" -> "49ers" */
function shortTeamName(name: string): string {
  const parts = name.split(' ');
  return parts[parts.length - 1];
}

export default function DraftRoom() {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const userId = useUserId();
  const { draft: initialDraft, teams: initialTeams, picks: initialPicks, loading, error } = useDraftState(draftId);
  const { connected, joinDraft, leaveDraft, onDraftUpdated, onDraftState } = useSocket();

  // Local state that updates in real-time
  const [draft, setDraft] = useState<Draft | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [picks, setPicks] = useState<PickWithPlayer[]>([]);

  const [copied, setCopied] = useState(false);

  const [submittingPick, setSubmittingPick] = useState(false);
  const [pickError, setPickError] = useState('');
  const [startingDraft, setStartingDraft] = useState(false);

  const currentTeamRef = useRef<HTMLDivElement>(null);
  const currentSlotRef = useRef<HTMLDivElement>(null);
  const boardScrollRef = useRef<HTMLDivElement>(null);

  // Save active draft ID to localStorage
  useEffect(() => {
    if (draftId) {
      localStorage.setItem('activeDraftId', draftId);
    }
  }, [draftId]);

  // Initialize state from API
  useEffect(() => {
    if (initialDraft) {
      setDraft(initialDraft);
      setTeams(initialTeams);
      setPicks(initialPicks);
    }
  }, [initialDraft, initialTeams, initialPicks]);

  // Socket connection
  useEffect(() => {
    if (!draftId || !connected) return;

    // Join the draft room
    joinDraft(draftId);

    // Listen for initial state
    onDraftState((data) => {
      console.log('📊 Received draft state:', data);
      setDraft(data.draft);
      setTeams(data.teams);
      setPicks(data.picks);
    });

    // Listen for updates
    onDraftUpdated((data) => {
      console.log('🔄 Draft updated:', data);

      if (data.draft) {
        setDraft(data.draft);
      }

      if (data.teams) {
        setTeams(data.teams);
      }

      if (data.pick && data.player) {
        // Store pick with player data
        setPicks(prev => [...prev, {
          ...data.pick!,
          player: data.player // Add player info to pick
        }]);
      }
    });

    // Cleanup
    return () => {
      leaveDraft(draftId);
    };
  }, [draftId, connected]);

  // Keep the on-the-clock team visible in the strip
  useEffect(() => {
    currentTeamRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [draft?.current_pick, draft?.status]);

  // Keep the current pick slot visible on the board (scroll the board only, not the page)
  useEffect(() => {
    const container = boardScrollRef.current;
    const slot = currentSlotRef.current;
    if (container && slot) {
      container.scrollTo({
        top: slot.offsetTop - container.clientHeight / 2 + slot.clientHeight / 2,
        behavior: 'smooth',
      });
    }
  }, [draft?.current_pick, draft?.status]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex items-center justify-center">
        <div className="text-center font-sans">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0081C6] mx-auto mb-4"></div>
          <p className="text-slate-550 font-semibold">Loading draft room...</p>
        </div>
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-xl max-w-md w-full font-sans">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-slate-650 mb-6 font-medium">{error || 'Draft not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-[#022A53] text-white py-2.5 rounded-xl font-bold hover:bg-[#011f40] transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const handleMakePick = async (playerId: string) => {
    if (!draftId || !userId) return;

    setSubmittingPick(true);
    setPickError('');

    try {
      await makePick(draftId, userId, playerId);
      // Update will come via socket
    } catch (err) {
      setPickError(err instanceof Error ? err.message : 'Failed to make pick');
      console.error(err);
    } finally {
      setSubmittingPick(false);
    }
  };

  const handleStartDraft = async () => {
    if (!draftId || !userId) return;

    setStartingDraft(true);
    setPickError('');

    try {
      await startDraft(draftId, userId);
      // Update will come via socket
    } catch (err) {
      setPickError(err instanceof Error ? err.message : 'Failed to start draft');
      console.error(err);
    } finally {
      setStartingDraft(false);
    }
  };

  const handleCopyDraftId = () => {
    if (draftId) {
      copyToClipboard(draftId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const myTeam = teams.find(t => t.user_id === userId);
  const currentTeam = teams.find(t => t.pick_number === ((draft.current_pick - 1) % draft.teams_count) + 1);
  const isMyTurn = myTeam && currentTeam && myTeam.id === currentTeam.id;
  const myPicks = myTeam ? picks.filter(p => p.team_id === myTeam.id) : [];
  const totalPicks = draft.teams_count * draft.rounds;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f8fafc] text-slate-800 flex flex-col font-sans">

      {/* ===== Sub-Header / Status Bar ===== */}
      <header className="sticky top-16 z-20 bg-white border-b border-slate-200 shadow-xs px-6 py-3.5">
        <div className="max-w-screen-2xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          {/* Draft ID Badge */}
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-full pl-3 pr-1 py-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Draft ID</span>
            <span className="text-xs font-mono font-bold text-slate-800 max-w-[160px] truncate">{draftId}</span>
            <button
              onClick={handleCopyDraftId}
              className="text-xs bg-slate-200 hover:bg-slate-250 text-slate-700 hover:text-slate-900 px-2.5 py-1 rounded-full transition font-bold border border-slate-300"
            >
              {copied ? '✓' : 'Copy'}
            </button>
          </div>

          {/* Stats Badges */}
          <div className="flex items-center gap-3 text-sm">
            {/* Status */}
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold tracking-wider ${
              draft.status === 'WAITING' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
              draft.status === 'IN_PROGRESS' ? 'bg-red-50 text-red-700 border border-red-200 font-extrabold animate-pulse' :
              'bg-slate-100 text-slate-700 border border-slate-200'
            }`}>
              {draft.status === 'IN_PROGRESS' ? 'LIVE DRAFT' : draft.status}
            </span>

            {/* Pick progress */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-55 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold">
              <span className="text-slate-505 text-slate-500">Pick</span>
              <span className="font-extrabold text-slate-850">{Math.min(draft.current_pick, totalPicks)}<span className="text-slate-400 font-normal"> / {totalPicks}</span></span>
            </div>

            {/* Round progress */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-55 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold">
              <span className="text-slate-505 text-slate-500">Round</span>
              <span className="font-extrabold text-slate-855">{Math.min(Math.ceil(draft.current_pick / draft.teams_count), draft.rounds)}<span className="text-slate-400 font-normal"> / {draft.rounds}</span></span>
            </div>

            {/* Connection badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-55 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[#0081C6]' : 'bg-red-500 animate-ping'}`}></span>
              <span className="text-slate-650 font-bold">{connected ? 'Live' : 'Offline'}</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 inset-x-0 h-1 bg-slate-100">
          <div
            className="h-full bg-[#0081C6] transition-all duration-500"
            style={{ width: `${(picks.length / totalPicks) * 100}%` }}
          />
        </div>
      </header>

      {/* ===== Teams Horizontal clock strip ===== */}
      <div className="bg-slate-100/50 border-b border-slate-200/60 py-3 px-6">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex gap-2.5 overflow-x-auto pb-1.5 [scrollbar-width:thin] [scrollbar-color:rgb(203_213_225)_transparent]">
            {teams.map((team) => {
              const isOnClock = draft.status === 'IN_PROGRESS' && currentTeam?.id === team.id;
              const isMine = team.id === myTeam?.id;
              return (
                <div
                  key={team.id}
                  ref={isOnClock ? currentTeamRef : undefined}
                  className={`shrink-0 w-24 rounded-xl px-2.5 py-2.5 text-center border transition-all ${
                    isOnClock
                      ? 'bg-[#0081C6] border-[#0081C6] text-white shadow-md'
                      : isMine
                      ? 'bg-blue-50/70 border-blue-200 text-[#022A53]'
                      : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className={`text-[10px] font-extrabold mb-1.5 ${isOnClock ? 'text-white/80' : 'text-slate-400'}`}>
                    #{team.pick_number}
                  </div>
                  <NflTeamLogo
                    teamName={team.name}
                    className={`h-9 w-9 mx-auto ${!isOnClock && !isMine && team.user_id === null ? 'opacity-70' : ''}`}
                  />
                  <div className={`text-[11px] font-bold mt-1.5 truncate ${isOnClock ? 'text-white' : 'text-slate-800'}`}>
                    {shortTeamName(team.name)}
                  </div>
                  <div className="mt-1 flex justify-center">
                    {isOnClock ? (
                      <span className="text-[9px] text-white font-black animate-pulse tracking-wider">ON CLOCK</span>
                    ) : isMine ? (
                      <span className="text-[9px] font-extrabold bg-[#022A53] text-white rounded px-1.5 py-0.5 tracking-wider">YOU</span>
                    ) : team.user_id === null ? (
                      <span className="text-[9px] font-bold bg-slate-100 text-slate-405 border border-slate-200 rounded px-1.5 py-0.5 tracking-wider">CPU</span>
                    ) : (
                      <span className="text-[9px] font-bold bg-blue-55 bg-blue-50 text-[#022A53] border border-blue-100 rounded px-1.5 py-0.5 tracking-wider">USER</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== Main Content Grid: Left Board / Right Workspace ===== */}
      <main className="max-w-screen-2xl w-full mx-auto p-6 flex-1 flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">

          {/* Left Column: Draft Board (Picks list) */}
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden h-[calc(100vh-276px)]">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900">Draft Log</h2>
              <span className="text-xs font-bold text-[#022A53] bg-blue-50 border border-blue-100 rounded-full px-2.5 py-1">
                {picks.length} pick{picks.length !== 1 ? 's' : ''} made
              </span>
            </div>

            <div ref={boardScrollRef} className="relative p-4 overflow-y-auto flex-1 space-y-2.5 bg-slate-50/20 [scrollbar-width:thin] [scrollbar-color:rgb(203_213_225)_transparent]">
              {Array.from({ length: totalPicks }, (_, i) => i + 1).map((slotNumber) => {
                const slotTeam = teams.find(t => t.pick_number === ((slotNumber - 1) % draft.teams_count) + 1);
                const pick = picks.find(p => p.pick_number === slotNumber);
                const isCurrent = draft.status === 'IN_PROGRESS' && slotNumber === draft.current_pick;
                const isFuture = slotNumber > draft.current_pick && !pick;
                const isMySlot = slotTeam?.id === myTeam?.id;
                const isRoundStart = (slotNumber - 1) % draft.teams_count === 0;
                const round = Math.ceil(slotNumber / draft.teams_count);

                return (
                  <div key={slotNumber}>
                    {isRoundStart && (
                      <div className="flex items-center gap-3 pt-3 pb-1.5">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 border border-slate-200/60 rounded px-2.5 py-0.5">
                          Round {round}
                        </span>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>
                    )}

                    <div
                      ref={isCurrent ? currentSlotRef : undefined}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-blue-50/50 border-[#0081C6] ring-1 ring-[#0081C6]/30 shadow-sm animate-pulse'
                          : isMySlot
                          ? 'bg-blue-50/10 border-blue-100 shadow-xs'
                          : isFuture
                          ? 'bg-white border-slate-100 opacity-60'
                          : 'bg-white border-slate-200 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`text-xs font-black w-8 shrink-0 ${isCurrent ? 'text-[#0081C6]' : 'text-slate-400'}`}>
                          #{slotNumber}
                        </div>
                        <NflTeamLogo teamName={slotTeam?.name} className="h-8 w-8" />
                        <div className="font-bold truncate text-sm text-slate-800">
                          {slotTeam?.name}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {pick?.player ? (
                          <>
                            <div className="font-bold text-sm text-slate-800">
                              {pick.player.name}
                            </div>
                            <div className="text-xs text-slate-550 text-slate-500 font-medium">
                              {pick.player.position} · {pick.player.team}
                            </div>
                          </>
                        ) : isCurrent ? (
                          <span className="text-[10px] font-black text-[#0081C6] bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full animate-pulse tracking-wide">
                            ON CLOCK
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Right Column: Available Players / Controls */}
          <section className="lg:col-span-7 space-y-4">

            {/* WAITING: start panel */}
            {draft.status === 'WAITING' && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center font-sans">
                <div className="flex justify-center mb-6">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-100 border-t-[#0081C6]"></div>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 mb-1">Waiting to Start</h2>
                <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                  Share the draft ID with friends, or start now and let CPU bots fill the remaining teams.
                </p>
                {pickError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-750 rounded-xl text-sm font-medium">
                    {pickError}
                  </div>
                )}
                {myTeam && (
                  <button
                    onClick={handleStartDraft}
                    disabled={startingDraft}
                    className="w-full bg-[#022A53] text-white py-3.5 rounded-xl hover:bg-[#011f40] transition font-bold shadow-md shadow-blue-500/10 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {startingDraft ? 'Starting...' : 'Start Draft'}
                  </button>
                )}
              </div>
            )}

            {/* IN_PROGRESS: on-the-clock banner + player list */}
            {draft.status === 'IN_PROGRESS' && draftId && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Turn banner */}
                {currentTeam && (
                  <div className={`px-5 py-4 flex items-center gap-3.5 border-b ${
                    isMyTurn
                      ? 'bg-[#022A53] border-[#022A53] text-white shadow-sm'
                      : 'bg-slate-50 border-slate-100 text-slate-800'
                  }`}>
                    <NflTeamLogo teamName={currentTeam.name} className="h-9 w-9 bg-white p-0.5 rounded-lg border border-slate-200" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black tracking-wide truncate">
                        {isMyTurn ? "YOU ARE ON THE CLOCK!" : `${currentTeam.name.toUpperCase()} ON THE CLOCK`}
                      </div>
                      {!isMyTurn && currentTeam.user_id === null && (
                        <div className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5 mt-0.5">
                          <span>Bot is selecting a prospect</span>
                          <span className="inline-flex gap-0.5">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                          </span>
                        </div>
                      )}
                    </div>
                    {isMyTurn && <span className="text-xl animate-bounce">🎯</span>}
                  </div>
                )}

                <div className="p-5">
                  <h2 className="text-base font-extrabold text-slate-900 mb-4">Available Prospects</h2>

                  {pickError && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                      {pickError}
                    </div>
                  )}

                  <PlayerList
                    draftId={draftId}
                    onSelectPlayer={handleMakePick}
                    disabled={!isMyTurn || submittingPick}
                    picks={picks}
                    teams={teams}
                  />
                </div>
              </div>
            )}

            {/* COMPLETED: summary */}
            {draft.status === 'COMPLETED' && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 font-sans">
                <div className="text-center mb-6">
                  <div className="text-5xl mb-3">🏆</div>
                  <h3 className="text-xl font-extrabold text-slate-900 mb-1">Draft Complete!</h3>
                  <p className="text-sm text-slate-500">
                    All {totalPicks} picks have been made.
                  </p>
                </div>

                {myPicks.length > 0 && (
                  <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <p className="text-sm font-bold text-slate-800 mb-3">
                      You drafted {myPicks.length} player{myPicks.length !== 1 ? 's' : ''}:
                    </p>
                    <div className="space-y-2">
                      {myPicks.map((pick) => (
                        <div key={pick.id} className="text-sm text-slate-600 font-semibold">
                          • {pick.player?.name || `Pick #${pick.pick_number}`}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-[#022A53] text-white py-3.5 rounded-xl hover:bg-[#011f40] transition font-bold shadow-md shadow-blue-500/10 active:scale-[0.99]"
                >
                  Start New Draft
                </button>
              </div>
            )}

            {/* My picks (during draft) */}
            {draft.status === 'IN_PROGRESS' && myTeam && myPicks.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <h3 className="font-extrabold text-sm mb-4 text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <NflTeamLogo teamName={myTeam.name} className="h-6 w-6" />
                  Your Draft Picks
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {myPicks.map((pick) => (
                    <div key={pick.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
                      {pick.player ? (
                        <>
                          <div>
                            <div className="font-bold text-sm text-slate-800">
                              {pick.player.name}
                            </div>
                            <div className="text-xs text-slate-550 text-slate-500 font-medium">
                              {pick.player.position} · {pick.player.team}
                            </div>
                          </div>
                          <div className="text-[10px] font-black text-[#022A53] text-right bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg shrink-0">
                            RD {pick.round} · #{pick.pick_number}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-slate-600 font-semibold">
                          Pick #{pick.pick_number}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}
