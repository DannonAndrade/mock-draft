import { useState, useEffect } from 'react';
import { Player, Team, Pick } from '../../../shared';
import { getAvailablePlayers } from '../utils/api';
import NflTeamLogo from './NflTeamLogo';

interface PlayerListProps {
  draftId: string;
  onSelectPlayer: (playerId: string) => void;
  disabled: boolean;
  picks: Pick[];
  teams: Team[];
}

const matchesPositionTab = (playerPos: string, tab: string): boolean => {
  if (tab === 'All') return true;
  const pos = playerPos.trim().toUpperCase();
  if (tab === 'Offense') return ['QB', 'RB', 'WR', 'TE', 'OT', 'IOL'].includes(pos);
  if (tab === 'Defense') return ['EDGE', 'DL', 'LB', 'S', 'CB', 'LB/EDGE'].includes(pos);
  if (tab === 'QB') return pos === 'QB';
  if (tab === 'Skill') return ['RB', 'WR', 'TE'].includes(pos);
  if (tab === 'OL') return ['OT', 'IOL'].includes(pos);
  if (tab === 'DL/EDGE') return ['DL', 'EDGE', 'LB/EDGE'].includes(pos);
  if (tab === 'LB') return pos === 'LB';
  if (tab === 'DB') return ['CB', 'S'].includes(pos);
  return false;
};

export default function PlayerList({ draftId, onSelectPlayer, disabled, picks, teams }: PlayerListProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [hideDrafted, setHideDrafted] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    loadPlayers();
  }, [draftId]);

  useEffect(() => {
    if (selectedPlayerId && picks.some(p => p.player_id === selectedPlayerId)) {
      setSelectedPlayerId(null);
    }
  }, [picks, selectedPlayerId]);

  async function loadPlayers() {
    try {
      setLoading(true);
      const data = await getAvailablePlayers(draftId);
      setPlayers(data.players || []);
      setError('');
    } catch (err) {
      setError('Failed to load players');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const draftedPlayerIds = new Set(picks.map(p => p.player_id));

  const filteredPlayers = players.filter(player => {
    const isDrafted = draftedPlayerIds.has(player.id);
    if (hideDrafted && isDrafted) {
      return false;
    }
    
    // Position group tab filter
    if (!matchesPositionTab(player.position, activeTab)) {
      return false;
    }

    const searchLower = searchTerm.toLowerCase();
    return (
      player.name.toLowerCase().includes(searchLower) ||
      player.position.toLowerCase().includes(searchLower) ||
      player.team.toLowerCase().includes(searchLower)
    );
  });

  const undraftedPlayers = players.filter(player => !draftedPlayerIds.has(player.id));

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayerId(playerId);
  };

  const handleConfirmPick = () => {
    if (selectedPlayerId) {
      onSelectPlayer(selectedPlayerId);
      setSelectedPlayerId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#022A53] mx-auto mb-2"></div>
        <p className="text-slate-500 text-sm">Loading prospects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-650 mb-2 font-medium">{error}</p>
        <button
          onClick={loadPlayers}
          className="text-[#022A53] text-sm hover:underline font-semibold"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans">
      {/* Search */}
      <input
        type="text"
        placeholder="Search players, positions, schools..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full bg-white border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#022A53] focus:border-[#022A53] transition shadow-xs"
      />

      {/* Position Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:rgb(226_232_240)_transparent] border-b border-slate-100 px-1">
        {['All', 'Offense', 'Defense', 'QB', 'Skill', 'OL', 'DL/EDGE', 'LB', 'DB'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === tab
                ? 'bg-[#022A53] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Player Count & Filter */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div>
          <span className="font-bold text-slate-700">{undraftedPlayers.length}</span> player{undraftedPlayers.length !== 1 ? 's' : ''} available
          {searchTerm && ` (${filteredPlayers.length} filtered)`}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={hideDrafted}
          onClick={() => setHideDrafted(!hideDrafted)}
          className="flex items-center gap-2 cursor-pointer select-none text-slate-650 hover:text-slate-900 font-semibold transition focus:outline-none"
        >
          <span>Hide drafted</span>
          <div
            className={`relative w-9 h-5 rounded-full transition-colors duration-200 ease-in-out ${
              hideDrafted ? 'bg-[#022A53]' : 'bg-slate-300'
            }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                hideDrafted ? 'transform translate-x-4' : ''
              }`}
            />
          </div>
        </button>
      </div>

      {/* Players List */}
      <div className="space-y-2 max-h-[calc(100vh-524px)] min-h-64 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgb(203_213_225)_transparent]">
        {filteredPlayers.length === 0 ? (
          <p className="text-center text-slate-400 py-8">No players found</p>
        ) : (
          filteredPlayers.map((player) => {
            const playerPick = picks.find(p => p.player_id === player.id);
            const isDrafted = !!playerPick;
            const draftingTeam = isDrafted ? teams.find(t => t.id === playerPick.team_id) : null;
            const shortTeam = draftingTeam ? (draftingTeam.name.split(' ').pop() || draftingTeam.name) : '';

            return (
              <div
                key={player.id}
                onClick={() => !disabled && !isDrafted && handleSelectPlayer(player.id)}
                className={`p-3 rounded-xl border transition ${
                  isDrafted
                    ? 'border-slate-100 bg-slate-55 bg-slate-50/70 opacity-60 cursor-not-allowed'
                    : selectedPlayerId === player.id
                    ? 'border-[#022A53] bg-blue-50/20 ring-1 ring-[#022A53] cursor-pointer shadow-sm'
                    : disabled
                    ? 'border-slate-200 bg-white/60 cursor-not-allowed opacity-50'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 cursor-pointer shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm truncate ${isDrafted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {player.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {player.position} · {player.team}
                    </div>
                    {isDrafted && draftingTeam && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200/50 rounded-lg py-1 px-2.5 w-fit">
                        <NflTeamLogo teamName={draftingTeam.name} className="h-4 w-4" />
                        <span>Drafted: {shortTeam} (Pick #{playerPick.pick_number})</span>
                      </div>
                    )}
                  </div>
                  <div className={`text-xs font-bold shrink-0 ${
                    isDrafted
                      ? 'text-slate-400 bg-slate-100/50 border border-slate-200/50 rounded-full px-2 py-0.5'
                      : selectedPlayerId === player.id
                      ? 'text-[#022A53] bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5'
                      : 'text-slate-655 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5'
                  }`}>
                    #{player.rank}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirm Pick Button */}
      {selectedPlayerId && (
        <button
          onClick={handleConfirmPick}
          disabled={disabled}
          className="w-full bg-[#022A53] text-white py-3.5 rounded-xl font-bold hover:bg-[#011f40] shadow-md shadow-blue-500/10 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirm Pick
        </button>
      )}
    </div>
  );
}
