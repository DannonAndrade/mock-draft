import { 
    getBestAvailablePlayer,
    createPick,
    incrementCurrentPick,
    updateDraftStatus,
    getDraftById,
    getTeamsByDraftId
  } from '../db';
  import { getTeamIndexForPick, getRoundForPick } from './draftLogic';
  import { TOTAL_PICKS } from '../../../shared';
  import { Server } from 'socket.io';
  import { broadcastDraftUpdate } from '../sockets/draftSocket';
  
  export async function processBotPicks(
    draftId: string,
    io: Server
  ): Promise<void> {
    let shouldContinue = true;
  
    while (shouldContinue) {
      // Get current draft state
      const draft = await getDraftById(draftId);
      if (!draft) {
        console.error('Draft not found');
        return;
      }
  
      // Check if draft is complete
      if (draft.current_pick > TOTAL_PICKS) {
        await updateDraftStatus(draftId, 'COMPLETED');
        broadcastDraftUpdate(io, draftId, {
          draft: { ...draft, status: 'COMPLETED' },
          message: 'Draft completed'
        });
        return;
      }
  
      // Get all teams
      const teams = await getTeamsByDraftId(draftId);
  
      // Determine current team
      const teamIndex = getTeamIndexForPick(draft.current_pick);
      const currentTeam = teams.find(t => t.pick_number === teamIndex + 1);
  
      if (!currentTeam) {
        console.error('Could not find current team');
        return;
      }
  
      // Check if current team is a bot
      if (currentTeam.user_id !== null) {
        // Human's turn
        shouldContinue = false;
        return;
      }
  
      // Bot makes pick
      console.log(`🤖 Bot picking for ${currentTeam.name} (Pick ${draft.current_pick})`);
  
      // Get best available player
      const player = await getBestAvailablePlayer(draftId);
      if (!player) {
        console.error('No available players');
        return;
      }
  
      // Calculate round
      const round = getRoundForPick(draft.current_pick);
  
      // Create the pick
      const pick = await createPick(
        draftId,
        currentTeam.id,
        player.id,
        draft.current_pick,
        round
      );
  
      console.log(`✅ Bot picked: ${player.name} (${player.position})`);
  
      // Increment current pick
      const updatedDraft = await incrementCurrentPick(draftId);
  
      // Broadcast update
      broadcastDraftUpdate(io, draftId, {
        pick,
        draft: updatedDraft,
        player,
        isBot: true
      });
  
      // Small delay for realism
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }