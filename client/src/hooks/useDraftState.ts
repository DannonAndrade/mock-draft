import { useEffect, useState } from 'react';
import { Draft, Team, Pick } from '../../../shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface DraftState {
  draft: Draft | null;
  teams: Team[];
  picks: Pick[];
  loading: boolean;
  error: string | null;
}

export function useDraftState(draftId: string | undefined) {
  const [state, setState] = useState<DraftState>({
    draft: null,
    teams: [],
    picks: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!draftId) {
      setState(prev => ({ ...prev, loading: false, error: 'No draft ID provided' }));
      return;
    }

    async function fetchDraft() {
      try {
        const response = await fetch(`${API_URL}/drafts/${draftId}`, { credentials: 'include' });
        
        if (!response.ok) {
          throw new Error('Draft not found');
        }

        const data = await response.json();
        
        setState({
          draft: data.draft,
          teams: data.teams,
          picks: data.picks,
          loading: false,
          error: null,
        });
      } catch (err) {
        setState({
          draft: null,
          teams: [],
          picks: [],
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load draft',
        });
      }
    }

    fetchDraft();
  }, [draftId]);

  return state;
}
