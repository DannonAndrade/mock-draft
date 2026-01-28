import { Server, Socket } from 'socket.io';
import { getDraftById, getTeamsByDraftId, getPicksByDraftId } from '../db';

export function setupDraftSocket(io: Server) {
  
  io.on('connection', (socket: Socket) => {
    console.log('👤 User connected:', socket.id);
    
    // Join a draft room
    socket.on('joinDraft', async (draftId: string) => {
      try {
        // Verify draft exists
        const draft = await getDraftById(draftId);
        if (!draft) {
          socket.emit('error', { message: 'Draft not found' });
          return;
        }
        
        // Join the room
        socket.join(draftId);
        console.log(`📥 Socket ${socket.id} joined draft ${draftId}`);
        
        // Send current state to the joining user
        const teams = await getTeamsByDraftId(draftId);
        const picks = await getPicksByDraftId(draftId);
        
        socket.emit('draftState', {
          draft,
          teams,
          picks
        });
        
      } catch (error) {
        console.error('Error joining draft:', error);
        socket.emit('error', { message: 'Failed to join draft' });
      }
    });
    
    // Leave a draft room
    socket.on('leaveDraft', (draftId: string) => {
      socket.leave(draftId);
      console.log(`📤 Socket ${socket.id} left draft ${draftId}`);
    });
    
    socket.on('disconnect', () => {
      console.log('👋 User disconnected:', socket.id);
    });
  });
}

// Helper function to broadcast draft updates
export function broadcastDraftUpdate(
  io: Server, 
  draftId: string, 
  data: any
) {
  io.to(draftId).emit('draftUpdated', data);
}