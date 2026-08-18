import { Router } from 'express';
import { NFL_TEAM_NAMES, TEAM_COUNT } from '../../../shared';
import {
    updateDraftStatus,
    createDraft,
    createTeam,
    getTeamsByDraftId,
    getDraftById,
    getTeamByUserId,
    getNextAvailableTeam,
    assignUserToTeam,
    getPicksByDraftId
} from '../db';
import { io } from '../index';
import { broadcastDraftUpdate } from '../sockets/draftSocket';
import { processBotPicks } from '../services/botService';
import { requireAuth } from '../auth/middleware';

const router = Router();

// POST /drafts - Create a new draft
router.post('/', requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id;

        // Create the draft
        const draft = await createDraft(userId);

        // Create all teams
        const teamPromises = [];
        for (let i = 1; i <= TEAM_COUNT; i++) {
            const isCreator = i === 1;
            const teamUserId = isCreator ? userId : null;

            teamPromises.push(
                createTeam(draft.id, NFL_TEAM_NAMES[i - 1], i, teamUserId)
            );
        }

        await Promise.all(teamPromises);

        // Get all teams to return
        const teams = await getTeamsByDraftId(draft.id);

        res.status(201).json({
            draft,
            teams,
            message: 'Draft created successfully'
        });

    } catch (error) {
        console.error('Error creating draft:', error);
        res.status(500).json({
            error: 'Failed to create draft',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// GET /drafts/:id - Get full draft state
router.get('/:id', async (req, res) => {
    try {
        const draftId = String(req.params.id);

        // Get draft
        const draft = await getDraftById(draftId);
        if (!draft) {
            return res.status(404).json({ error: 'Draft not found' });
        }

        // Get teams
        const teams = await getTeamsByDraftId(draftId);

        // Get picks
        const picks = await getPicksByDraftId(draftId);

        res.json({
            draft,
            teams,
            picks
        });

    } catch (error) {
        console.error('Error getting draft:', error);
        res.status(500).json({
            error: 'Failed to get draft',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// POST /drafts/:id/join - Join an existing draft
router.post('/:id/join', requireAuth, async (req, res) => {
    try {
        const draftId = String(req.params.id);
        const userId = req.user!.id;

        // Check if draft exists
        const draft = await getDraftById(draftId);
        if (!draft) {
            return res.status(404).json({ error: 'Draft not found' });
        }

        // Can't join a draft that's already in progress or completed
        if (draft.status !== 'WAITING') {
            return res.status(400).json({
                error: 'Cannot join - draft has already started'
            });
        }

        // Check if user already joined
        const existingTeam = await getTeamByUserId(draftId, userId);
        if (existingTeam) {
            return res.status(200).json({
                draft,
                team: existingTeam,
                message: 'Already joined this draft'
            });
        }

        // Find next available team
        const availableTeam = await getNextAvailableTeam(draftId);
        if (!availableTeam) {
            return res.status(403).json({
                error: 'Draft is full',
                message: 'All teams have been claimed'
            });
        }

        // Assign user to team
        const assignedTeam = await assignUserToTeam(availableTeam.id, userId);

        // Get updated teams list
        const teams = await getTeamsByDraftId(draftId);

        res.status(200).json({
            draft,
            team: assignedTeam,
            teams,
            message: 'Joined draft successfully'
        });

    } catch (error) {
        console.error('Error joining draft:', error);
        res.status(500).json({
            error: 'Failed to join draft',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// POST /drafts/:id/start - Start the draft
router.post('/:id/start', requireAuth, async (req, res) => {
    try {
        const draftId = String(req.params.id);
        const userId = req.user!.id;

        // Get draft
        const draft = await getDraftById(draftId);
        if (!draft) {
            return res.status(404).json({ error: 'Draft not found' });
        }

        // Check if already started
        if (draft.status !== 'WAITING') {
            return res.status(400).json({
                error: 'Draft already started or completed'
            });
        }

        if (draft.created_by_user_id && draft.created_by_user_id !== userId) {
            return res.status(403).json({ error: 'Only the draft creator can start the draft' });
        }

        // Verify user is in the draft
        const userTeam = await getTeamByUserId(draftId, userId);
        if (!userTeam) {
            return res.status(403).json({
                error: 'You must join the draft before starting it'
            });
        }

        // Start the draft
        const updatedDraft = await updateDraftStatus(draftId, 'IN_PROGRESS');
        const teams = await getTeamsByDraftId(draftId);

        // Broadcast update to all connected clients
        broadcastDraftUpdate(io, draftId, {
            draft: updatedDraft,
            teams,
            message: 'Draft started'
        });
        
        // If first team is a bot, start auto-picking
        const firstTeam = teams.find(t => t.pick_number === 1);
        if (firstTeam && firstTeam.user_id === null) {
            setTimeout(() => {
                processBotPicks(draftId, io).catch(error => {
                    console.error('Error processing bot picks:', error);
                });
            }, 1000);
        }
        res.status(200).json({
            draft: updatedDraft,
            teams,
            message: 'Draft started successfully'
        });

    } catch (error) {
        console.error('Error starting draft:', error);
        res.status(500).json({
            error: 'Failed to start draft',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});



export default router;
