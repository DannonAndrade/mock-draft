import { Router } from 'express';
import {
  getDraftById,
  getTeamsByDraftId,
  createPick,
  isPlayerDrafted,
  getPlayerById,
  incrementCurrentPick,
  updateDraftStatus,
  getAvailablePlayers
} from '../db';
import { getTeamIndexForPick, getRoundForPick } from '../services/draftLogic';
import { TOTAL_PICKS } from '../../../shared';
import { io } from '../index';
import { broadcastDraftUpdate } from '../sockets/draftSocket';
import { processBotPicks } from '../services/botService';

const router = Router();

// POST /picks - Make a pick
router.post('/', async (req, res) => {
  try {
    const { draftId, userId, playerId } = req.body;

    // Validate required fields
    if (!draftId || !userId || !playerId) {
      return res.status(400).json({
        error: 'draftId, userId, and playerId are required'
      });
    }

    // Get draft
    const draft = await getDraftById(draftId);
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    // Check draft is in progress
    if (draft.status !== 'IN_PROGRESS') {
      return res.status(400).json({
        error: 'Draft is not in progress',
        status: draft.status
      });
    }

    // Check if draft is already complete
    if (draft.current_pick > TOTAL_PICKS) {
      return res.status(400).json({
        error: 'Draft is already complete'
      });
    }


    // Get all teams
    const teams = await getTeamsByDraftId(draftId);

    // Determine whose turn it is
    const teamIndex = getTeamIndexForPick(draft.current_pick);
    const currentTeam = teams.find(t => t.pick_number === teamIndex + 1);

    if (!currentTeam) {
      return res.status(500).json({ error: 'Could not determine current team' });
    }

    // Verify it's this user's turn
    if (currentTeam.user_id !== userId) {
      return res.status(403).json({
        error: 'Not your turn',
        currentTeam: currentTeam.name,
        currentUser: currentTeam.user_id
      });
    }

    // Check if player exists
    const player = await getPlayerById(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Check if player already drafted
    const alreadyDrafted = await isPlayerDrafted(draftId, playerId);
    if (alreadyDrafted) {
      return res.status(400).json({
        error: 'Player already drafted',
        player: player.name
      });
    }

    // Calculate round
    const round = getRoundForPick(draft.current_pick);

    // Create the pick
    const pick = await createPick(
      draftId,
      currentTeam.id,
      playerId,
      draft.current_pick,
      round
    );

    // Increment current pick
    const updatedDraft = await incrementCurrentPick(draftId);

    // Check if draft is complete
    if (updatedDraft.current_pick > TOTAL_PICKS) {
      await updateDraftStatus(draftId, 'COMPLETED');
    }

    // Broadcast update to all connected clients
    broadcastDraftUpdate(io, draftId, {
      pick,
      draft: updatedDraft,
      player
    });

    // Process bot picks if next team(s) are bots
    setTimeout(() => {
      processBotPicks(draftId, io).catch(error => {
        console.error('Error processing bot picks:', error);
      });
    }, 1000);

    res.status(201).json({
      pick,
      draft: updatedDraft,
      player,
      message: 'Pick successful'
    });

  } catch (error) {
    console.error('Error making pick:', error);
    res.status(500).json({
      error: 'Failed to make pick',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /picks/players/:draftId - Get available players
router.get('/players/:draftId', async (req, res) => {
  try {
    const { draftId } = req.params;
    const players = await getAvailablePlayers(draftId);
    res.json({ players });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get players' });
  }
});

export default router;