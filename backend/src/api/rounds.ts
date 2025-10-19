import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { logger } from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../types/api';

const router = express.Router();

// Get current active round
router.get('/current', asyncHandler(async (req: any, res) => {
  const { blockchain, database } = req.services;

  try {
    const currentRoundId = await blockchain.getCurrentRoundId();
    
    if (currentRoundId === 0) {
      return res.json(ApiResponse.success(null, 'No active round'));
    }

    const roundData = await blockchain.getRound(currentRoundId);
    
    if (!roundData) {
      return res.json(ApiResponse.error('Round not found', 404));
    }

    // Get additional round statistics
    const stats = await database.getRoundStats(currentRoundId);
    
    const response = {
      ...roundData,
      stats: {
        totalParticipants: stats?.totalParticipants || 0,
        followersCount: stats?.followersCount || 0,
        countersCount: stats?.countersCount || 0,
        totalVolume: stats?.totalVolume || '0'
      }
    };

    res.json(ApiResponse.success(response));
  } catch (error) {
    logger.error('Error getting current round:', error);
    res.status(500).json(ApiResponse.error('Failed to get current round'));
  }
}));

// Get round by ID
router.get('/:roundId', 
  param('roundId').isInt({ min: 1 }),
  asyncHandler(async (req: any, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(ApiResponse.error('Invalid round ID', 400, errors.array()));
    }

    const { blockchain, database } = req.services;
    const roundId = parseInt(req.params.roundId);

    try {
      const roundData = await blockchain.getRound(roundId);
      
      if (!roundData) {
        return res.status(404).json(ApiResponse.error('Round not found', 404));
      }

      // Get additional round data from database
      const roundDetails = await database.getRoundDetails(roundId);
      
      const response = {
        ...roundData,
        participants: roundDetails?.participants || [],
        predictions: roundDetails?.predictions || [],
        timeline: roundDetails?.timeline || []
      };

      res.json(ApiResponse.success(response));
    } catch (error) {
      logger.error(`Error getting round ${roundId}:`, error);
      res.status(500).json(ApiResponse.error('Failed to get round'));
    }
  })
);

// Get rounds list with pagination
router.get('/',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['active', 'resolved', 'cancelled']),
  asyncHandler(async (req: any, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(ApiResponse.error('Invalid query parameters', 400, errors.array()));
    }

    const { database } = req.services;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    try {
      const rounds = await database.getRounds({
        page,
        limit,
        status
      });

      res.json(ApiResponse.success(rounds));
    } catch (error) {
      logger.error('Error getting rounds list:', error);
      res.status(500).json(ApiResponse.error('Failed to get rounds'));
    }
  })
);

// Get round statistics
router.get('/:roundId/stats',
  param('roundId').isInt({ min: 1 }),
  asyncHandler(async (req: any, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(ApiResponse.error('Invalid round ID', 400, errors.array()));
    }

    const { blockchain, database } = req.services;
    const roundId = parseInt(req.params.roundId);

    try {
      const [roundData, dbStats] = await Promise.all([
        blockchain.getRound(roundId),
        database.getRoundStats(roundId)
      ]);

      if (!roundData) {
        return res.status(404).json(ApiResponse.error('Round not found', 404));
      }

      const stats = {
        roundId,
        phase: roundData.phase,
        totalStaked: (parseFloat(roundData.totalFollowStake) + parseFloat(roundData.totalCounterStake)).toString(),
        followStake: roundData.totalFollowStake,
        counterStake: roundData.totalCounterStake,
        followPercentage: dbStats?.followPercentage || 0,
        counterPercentage: dbStats?.counterPercentage || 0,
        totalParticipants: dbStats?.totalParticipants || 0,
        averageStake: dbStats?.averageStake || '0',
        priceMovement: dbStats?.priceMovement || 0,
        aiPrediction: roundData.aiPrediction === 0 ? 'UP' : 'DOWN',
        startPrice: roundData.startPrice,
        currentPrice: roundData.endPrice || await blockchain.getLatestPrice(),
        timeRemaining: this.calculateTimeRemaining(roundData)
      };

      res.json(ApiResponse.success(stats));
    } catch (error) {
      logger.error(`Error getting round ${roundId} stats:`, error);
      res.status(500).json(ApiResponse.error('Failed to get round statistics'));
    }
  })
);

// Get user's stake in a round
router.get('/:roundId/stake/:userAddress',
  param('roundId').isInt({ min: 1 }),
  param('userAddress').isEthereumAddress(),
  asyncHandler(async (req: any, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(ApiResponse.error('Invalid parameters', 400, errors.array()));
    }

    const { blockchain } = req.services;
    const roundId = parseInt(req.params.roundId);
    const userAddress = req.params.userAddress;

    try {
      const userStake = await blockchain.getUserStake(roundId, userAddress);
      
      if (!userStake || userStake.amount === '0') {
        return res.json(ApiResponse.success(null, 'No stake found'));
      }

      res.json(ApiResponse.success(userStake));
    } catch (error) {
      logger.error(`Error getting user stake for round ${roundId}:`, error);
      res.status(500).json(ApiResponse.error('Failed to get user stake'));
    }
  })
);

// Create new round (AI Engine only)
router.post('/create',
  body('aiPrediction').isInt({ min: 0, max: 1 }),
  body('signatureHash').isLength({ min: 64, max: 66 }),
  body('apiKey').notEmpty(),
  asyncHandler(async (req: any, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(ApiResponse.error('Invalid request data', 400, errors.array()));
    }

    const { blockchain, database, websocket, aiEngine } = req.services;
    const { aiPrediction, signatureHash, apiKey } = req.body;

    try {
      // Verify API key
      if (!aiEngine.verifyApiKey(apiKey)) {
        return res.status(401).json(ApiResponse.error('Invalid API key', 401));
      }

      // Create round on blockchain
      const roundId = await blockchain.createRound(aiPrediction, signatureHash);

      // Store round data in database
      await database.createRound({
        roundId,
        aiPrediction,
        signatureHash,
        createdAt: new Date()
      });

      // Notify connected clients
      websocket.broadcastRoundCreated(roundId, aiPrediction);

      logger.info(`New round ${roundId} created by AI engine`);
      
      res.json(ApiResponse.success({ roundId }, 'Round created successfully'));
    } catch (error) {
      logger.error('Error creating round:', error);
      res.status(500).json(ApiResponse.error('Failed to create round'));
    }
  })
);

// Freeze round (internal endpoint)
router.post('/:roundId/freeze',
  param('roundId').isInt({ min: 1 }),
  asyncHandler(async (req: any, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(ApiResponse.error('Invalid round ID', 400, errors.array()));
    }

    const { blockchain, database, websocket } = req.services;
    const roundId = parseInt(req.params.roundId);

    try {
      const txHash = await blockchain.freezeRound(roundId);
      
      // Update database
      await database.updateRoundPhase(roundId, 'frozen');
      
      // Notify clients
      websocket.broadcastRoundFrozen(roundId);

      res.json(ApiResponse.success({ txHash }, 'Round frozen successfully'));
    } catch (error) {
      logger.error(`Error freezing round ${roundId}:`, error);
      res.status(500).json(ApiResponse.error('Failed to freeze round'));
    }
  })
);

// Resolve round (internal endpoint)
router.post('/:roundId/resolve',
  param('roundId').isInt({ min: 1 }),
  asyncHandler(async (req: any, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(ApiResponse.error('Invalid round ID', 400, errors.array()));
    }

    const { blockchain, database, websocket } = req.services;
    const roundId = parseInt(req.params.roundId);

    try {
      const txHash = await blockchain.resolveRound(roundId);
      
      // Get final round data
      const roundData = await blockchain.getRound(roundId);
      
      // Update database
      await database.updateRoundResolution(roundId, roundData);
      
      // Notify clients
      websocket.broadcastRoundResolved(roundId, roundData);

      res.json(ApiResponse.success({ txHash, roundData }, 'Round resolved successfully'));
    } catch (error) {
      logger.error(`Error resolving round ${roundId}:`, error);
      res.status(500).json(ApiResponse.error('Failed to resolve round'));
    }
  })
);

// Helper function to calculate time remaining
function calculateTimeRemaining(roundData: any): number {
  const now = Math.floor(Date.now() / 1000);
  
  switch (roundData.phase) {
    case 1: // Voting
      return Math.max(0, roundData.votingEndTime - now);
    case 2: // Frozen
      return Math.max(0, roundData.resolutionTime - now);
    default:
      return 0;
  }
}

export default router;
