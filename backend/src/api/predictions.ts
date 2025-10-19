import { Router } from 'express';
import { DatabaseService } from '../services/database';
import { logger } from '../utils/logger';

const router = Router();

// Get predictions with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const roundId = req.query.roundId ? parseInt(req.query.roundId as string) : undefined;

    const db = new DatabaseService();
    const predictions = await db.getPredictions({ page, limit, roundId });

    res.json({
      success: true,
      data: predictions,
      pagination: {
        page,
        limit,
        total: predictions.length
      }
    });
  } catch (error) {
    logger.error('Error fetching predictions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch predictions'
    });
  }
});

// Get prediction by round ID
router.get('/round/:roundId', async (req, res) => {
  try {
    const roundId = parseInt(req.params.roundId);
    
    const db = new DatabaseService();
    const predictions = await db.getPredictions({ page: 1, limit: 100, roundId });

    res.json({
      success: true,
      data: predictions
    });
  } catch (error) {
    logger.error('Error fetching round predictions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch round predictions'
    });
  }
});

// Create new prediction (internal use)
router.post('/', async (req, res) => {
  try {
    const {
      roundId,
      direction,
      confidence,
      featuresHash,
      signatureHash,
      modelVersion,
      metadata
    } = req.body;

    const db = new DatabaseService();
    await db.createPrediction({
      roundId,
      direction,
      confidence,
      featuresHash,
      signatureHash,
      modelVersion,
      metadata
    });

    res.json({
      success: true,
      message: 'Prediction created successfully'
    });
  } catch (error) {
    logger.error('Error creating prediction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create prediction'
    });
  }
});

export default router;
