import { Router } from 'express';
import { DatabaseService } from '../services/database';
import { logger } from '../utils/logger';

const router = Router();

// Get system stats
router.get('/system', async (req, res) => {
  try {
    const db = new DatabaseService();
    const stats = await db.getSystemStats();

    res.json({
      success: true,
      data: stats || {
        totalRounds: 0,
        totalUsers: 0,
        totalVolume: 0,
        averageStake: 0
      }
    });
  } catch (error) {
    logger.error('Error fetching system stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system stats'
    });
  }
});

// Get round stats
router.get('/rounds/:roundId', async (req, res) => {
  try {
    const roundId = parseInt(req.params.roundId);
    
    if (!roundId) {
      return res.status(400).json({
        success: false,
        error: 'Valid round ID is required'
      });
    }

    const db = new DatabaseService();
    const stats = await db.getRoundStats(roundId);

    res.json({
      success: true,
      data: stats || {
        totalParticipants: 0,
        followersCount: 0,
        countersCount: 0,
        totalVolume: 0,
        averageStake: 0
      }
    });
  } catch (error) {
    logger.error('Error fetching round stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch round stats'
    });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const db = new DatabaseService();
    const isHealthy = await db.healthCheck();

    res.json({
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        database: isHealthy ? 'connected' : 'disconnected'
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

export default router;
