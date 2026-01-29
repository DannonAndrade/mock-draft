import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserId } from '../hooks/useUserId';
import { createDraft, joinDraft } from '../utils/api';

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
      navigate(`/draft/${draftIdInput.trim()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join draft');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full">
        <h1 className="text-4xl font-bold mb-2 text-gray-800">Mock Draft</h1>
        <p className="text-gray-600 mb-6">Create or join a draft to get started</p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleCreateDraft}
            disabled={loading || !userId}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create New Draft'}
          </button>

          <div className="text-center text-gray-500">or</div>

          <input
            type="text"
            placeholder="Enter Draft ID"
            value={draftIdInput}
            onChange={(e) => setDraftIdInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleJoinDraft()}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={handleJoinDraft}
            disabled={loading || !userId || !draftIdInput.trim()}
            className="w-full bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Joining...' : 'Join Draft'}
          </button>
        </div>

        {userId && (
          <p className="mt-6 text-xs text-gray-400 text-center">
            Your ID: {userId}
          </p>
        )}
      </div>
    </div>
  );
}