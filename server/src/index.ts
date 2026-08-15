import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import http from 'http';
import pool from './db/connection';
import { Draft, Team, Pick, Player, TEAM_COUNT, ROUND_COUNT } from '../../shared';
import { createDraft, getDraftById } from './db';
import draftsRouter from './routes/drafts';
import picksRouter from './routes/picks';
import fantasyRouter from './routes/fantasy';
import { setupDraftSocket } from './sockets/draftSocket';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';

// Test log
//console.log('📦 Shared types loaded:', { TEAM_COUNT, ROUND_COUNT });



dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for development
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.use('/drafts', draftsRouter);
app.use('/picks', picksRouter);
app.use('/fantasy', fantasyRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.path 
  });
});

app.use(errorHandler);

// Test route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Test database connection
app.get('/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: result.rows[0].now 
    });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


//test draft db service
app.get('/test-draft', async (req, res) => {
  try {
    // Create a draft
    const draft = await createDraft();
    
    // Retrieve it
    const retrieved = await getDraftById(draft.id);
    
    res.json({ 
      message: 'Draft service working!',
      created: draft,
      retrieved
    });
  } catch (error) {
    console.error('Draft test error:', error);
    res.status(500).json({ 
      error: 'Failed to test draft service',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Socket.IO setup
setupDraftSocket(io);

// Export io so routes can use it
export { io };


// Start server only after database connects
async function startServer() {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    //console.log('✅ Database connected');
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:4000`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
}

startServer();
