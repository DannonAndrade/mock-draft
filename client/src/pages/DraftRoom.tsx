import { useParams, useNavigate } from 'react-router-dom';
import { useDraftState } from '../hooks/useDraftState';
import { useUserId } from '../hooks/useUserId';

export default function DraftRoom() {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const userId = useUserId();
  const { draft, teams, picks, loading, error } = useDraftState(draftId);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading draft...</p>
        </div>
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error || 'Draft not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Find current user's team
  const myTeam = teams.find(t => t.user_id === userId);
  const currentTeam = teams.find(t => t.pick_number === ((draft.current_pick - 1) % draft.teams_count) + 1);
  const isMyTurn = myTeam && currentTeam && myTeam.id === currentTeam.id;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Mock Draft</h1>
              <p className="text-sm text-gray-500">Draft ID: {draftId}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                Status: <span className={`font-semibold ${
                  draft.status === 'WAITING' ? 'text-yellow-600' :
                  draft.status === 'IN_PROGRESS' ? 'text-green-600' :
                  'text-gray-600'
                }`}>{draft.status}</span>
              </div>
              <div className="text-sm text-gray-600">
                Pick: {draft.current_pick} / {draft.teams_count * draft.rounds}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Left: Draft Board */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">Draft Board</h2>
              
              {picks.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No picks yet</p>
              ) : (
                <div className="space-y-2">
                  {picks.map((pick) => {
                    const team = teams.find(t => t.id === pick.team_id);
                    return (
                      <div
                        key={pick.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-bold text-gray-500 w-8">
                            #{pick.pick_number}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">
                              {team?.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              Round {pick.round}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-800">
                            Player #{pick.pick_number}
                          </div>
                          <div className="text-sm text-gray-600">
                            Pick made
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Teams & Controls */}
          <div className="space-y-4">
            
            {/* Current Turn Indicator */}
            {draft.status === 'IN_PROGRESS' && currentTeam && (
              <div className={`rounded-lg shadow-lg p-4 ${
                isMyTurn ? 'bg-green-600 text-white' : 'bg-white'
              }`}>
                <h3 className="font-bold mb-2">Current Pick</h3>
                <p className="text-lg">{currentTeam.name}</p>
                {isMyTurn && (
                  <p className="text-sm mt-2">🎯 It's your turn!</p>
                )}
              </div>
            )}

            {/* My Team */}
            {myTeam && (
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h3 className="font-bold mb-2 text-gray-700">Your Team</h3>
                <p className="text-lg font-semibold text-blue-600">{myTeam.name}</p>
                <p className="text-sm text-gray-600">Pick #{myTeam.pick_number}</p>
              </div>
            )}

            {/* Teams List */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="font-bold mb-3 text-gray-700">Teams</h3>
              <div className="space-y-2">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className={`p-2 rounded ${
                      team.id === myTeam?.id ? 'bg-blue-100 border border-blue-300' :
                      team.user_id === null ? 'bg-gray-100' :
                      'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{team.name}</span>
                      <span className="text-xs text-gray-500">
                        {team.user_id === null ? '🤖 Bot' : 
                         team.user_id === userId ? '👤 You' : 
                         '👤 User'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Draft Controls */}
            {draft.status === 'WAITING' && myTeam && (
              <div className="bg-white rounded-lg shadow-lg p-4">
                <p className="text-sm text-gray-600 mb-3">
                  Waiting for draft to start...
                </p>
                <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-semibold">
                  Start Draft
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}