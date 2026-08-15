import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Draft, Team, Pick, Player } from '../../../shared';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

interface DraftUpdateData {
  pick?: Pick;
  draft?: Draft;
  player?: Player;
  teams?: Team[];
  message?: string;
  isBot?: boolean;
}

interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
  joinDraft: (draftId: string) => void;
  leaveDraft: (draftId: string) => void;
  onDraftUpdated: (callback: (data: DraftUpdateData) => void) => void;
  onDraftState: (callback: (data: { draft: Draft; teams: Team[]; picks: Pick[] }) => void) => void;
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Create socket connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setConnected(false);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  const joinDraft = (draftId: string) => {
    if (socketRef.current) {
      console.log('📥 Joining draft:', draftId);
      socketRef.current.emit('joinDraft', draftId);
    }
  };

  const leaveDraft = (draftId: string) => {
    if (socketRef.current) {
      console.log('📤 Leaving draft:', draftId);
      socketRef.current.emit('leaveDraft', draftId);
    }
  };

  const onDraftUpdated = (callback: (data: DraftUpdateData) => void) => {
    if (socketRef.current) {
      socketRef.current.on('draftUpdated', callback);
    }
  };

  const onDraftState = (callback: (data: { draft: Draft; teams: Team[]; picks: Pick[] }) => void) => {
    if (socketRef.current) {
      socketRef.current.on('draftState', callback);
    }
  };

  return {
    socket: socketRef.current,
    connected,
    joinDraft,
    leaveDraft,
    onDraftUpdated,
    onDraftState,
  };
}