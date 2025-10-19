import express from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../types/api';
import { logger } from '../utils/logger';

const router = express.Router();

// Basic health check
router.get('/', asyncHandler(async (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  };

  res.json(ApiResponse.success(healthCheck));
}));

// Detailed health check
router.get('/detailed', asyncHandler(async (req: any, res) => {
  const { blockchain, database, aiEngine, websocket } = req.services;

  try {
    const [
      blockchainHealth,
      databaseHealth,
      aiEngineHealth
    ] = await Promise.allSettled([
      blockchain.healthCheck(),
      database.healthCheck(),
      aiEngine.healthCheck()
    ]);

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        blockchain: {
          status: blockchainHealth.status === 'fulfilled' && blockchainHealth.value ? 'healthy' : 'unhealthy',
          details: blockchainHealth.status === 'fulfilled' ? blockchainHealth.value : blockchainHealth.reason
        },
        database: {
          status: databaseHealth.status === 'fulfilled' && databaseHealth.value ? 'healthy' : 'unhealthy',
          details: databaseHealth.status === 'fulfilled' ? databaseHealth.value : databaseHealth.reason
        },
        aiEngine: {
          status: aiEngineHealth.status === 'fulfilled' && aiEngineHealth.value ? 'healthy' : 'unhealthy',
          details: aiEngineHealth.status === 'fulfilled' ? aiEngineHealth.value : aiEngineHealth.reason
        },
        websocket: {
          status: 'healthy',
          connectedClients: websocket.getConnectedClientsCount()
        }
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      }
    };

    // Determine overall status
    const allServicesHealthy = Object.values(healthStatus.services).every(
      service => service.status === 'healthy'
    );

    if (!allServicesHealthy) {
      healthStatus.status = 'degraded';
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(ApiResponse.success(healthStatus));

  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json(ApiResponse.error('Health check failed', 503));
  }
}));

// Readiness check
router.get('/ready', asyncHandler(async (req: any, res) => {
  const { blockchain, database, aiEngine } = req.services;

  try {
    const [blockchainReady, databaseReady, aiEngineReady] = await Promise.all([
      blockchain.healthCheck(),
      database.healthCheck(),
      aiEngine.healthCheck()
    ]);

    const isReady = blockchainReady && databaseReady && aiEngineReady;

    if (isReady) {
      res.json(ApiResponse.success({ ready: true }, 'Service is ready'));
    } else {
      res.status(503).json(ApiResponse.error('Service not ready', 503));
    }

  } catch (error) {
    logger.error('Readiness check error:', error);
    res.status(503).json(ApiResponse.error('Readiness check failed', 503));
  }
}));

// Liveness check
router.get('/live', asyncHandler(async (req, res) => {
  res.json(ApiResponse.success({ alive: true }, 'Service is alive'));
}));

export default router;
