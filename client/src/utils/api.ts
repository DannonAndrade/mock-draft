const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function createDraft(userId: string) {
  const response = await fetch(`${API_URL}/drafts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    throw new Error('Failed to create draft');
  }

  return response.json();
}

export async function joinDraft(draftId: string, userId: string) {
  const response = await fetch(`${API_URL}/drafts/${draftId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to join draft');
  }

  return response.json();
}