import { Router } from 'express';
import { DatabaseService } from '../services/database';
import { logger } from '../utils/logger';

const router = Router();

// Get user stats
router.get('/:address/stats', async (req, res) => {
  try {
    const userAddress = req.params.address;
    
    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'User address is required'
      });
    }

    const db = new DatabaseService();
    const stats = await db.getUserStats(userAddress);

    res.json({
      success: true,
      data: stats || {
        totalStakes: 0,
        totalStaked: 0,
        averageStake: 0,
        claimedRewards: 0
      }
    });
  } catch (error) {
    logger.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user stats'
    });
  }
});

// Get user stakes
router.get('/:address/stakes', async (req, res) => {
  try {
    const userAddress = req.params.address;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'User address is required'
      });
    }

    const db = new DatabaseService();
    const stakes = await db.getUserStakes(userAddress, { page, limit, status });

    res.json({
      success: true,
      data: stakes,
      pagination: {
        page,
        limit,
        total: stakes.length
      }
    });
  } catch (error) {
    logger.error('Error fetching user stakes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user stakes'
    });
  }
});

// Create user stake
router.post('/:address/stakes', async (req, res) => {
  try {
    const userAddress = req.params.address;
    const { roundId, amount, direction, transactionHash } = req.body;

    if (!userAddress || !roundId || !amount || direction === undefined || !transactionHash) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const db = new DatabaseService();
    await db.createUserStake({
      roundId,
      userAddress,
      amount,
      direction,
      transactionHash
    });

    res.json({
      success: true,
      message: 'User stake created successfully'
    });
  } catch (error) {
    logger.error('Error creating user stake:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user stake'
    });
  }
});

export default router;
