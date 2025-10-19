import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

import { config } from './config/config';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { logger } from './utils/logger';

// Import routes
import roundRoutes from './api/rounds';
import predictionRoutes from './api/predictions';
import userRoutes from './api/users';
import statsRoutes from './api/stats';
import healthRoutes from './api/health';

// Import services
import { BlockchainService } from './services/blockchain';
import { DatabaseService } from './services/database';
import { WebSocketService } from './services/websocket';
import { AIEngineService } from './services/aiEngine';

dotenv.config();

class PredixServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private blockchainService: BlockchainService;
  private databaseService: DatabaseService;
  private websocketService: WebSocketService;
  private aiEngineService: AIEngineService | null;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.FRONTEND_URL,
        methods: ['GET', 'POST']
      }
    });

    this.initializeServices();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private initializeServices() {
    this.blockchainService = new BlockchainService();
    this.databaseService = new DatabaseService();
    this.websocketService = new WebSocketService(this.io);
    this.aiEngineService = null; // Initialize as null, will be set if available
  }

  private setupMiddleware() {
    // Security middleware
    this.app.use(helmet());
    
    // CORS
    this.app.use(cors({
      origin: config.FRONTEND_URL,
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP'
    });
    this.app.use('/api/', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Logging
    this.app.use(morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) }
    }));

    // Add services to request object
    this.app.use((req: any, res, next) => {
      req.services = {
        blockchain: this.blockchainService,
        database: this.databaseService,
        websocket: this.websocketService,
        aiEngine: this.aiEngineService
      };
      next();
    });
  }

  private setupRoutes() {
    // Health check
    this.app.use('/api/health', healthRoutes);

    // API routes
    this.app.use('/api/rounds', roundRoutes);
    this.app.use('/api/predictions', predictionRoutes);
    this.app.use('/api/users', authMiddleware, userRoutes);
    this.app.use('/api/stats', statsRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'PREDIX AI API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString()
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl
      });
    });
  }

  private setupErrorHandling() {
    this.app.use(errorHandler);
  }

  public async start() {
    try {
      // Initialize services
      await this.initializeAllServices();

      // Start server
      this.server.listen(config.PORT, () => {
        logger.info(`PREDIX AI Server running on port ${config.PORT}`);
        logger.info(`Environment: ${config.NODE_ENV}`);
        logger.info(`Frontend URL: ${config.FRONTEND_URL}`);
      });

      // Setup WebSocket handlers
      this.setupWebSocketHandlers();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async initializeAllServices() {
    logger.info('Initializing services...');

    try {
      await this.databaseService.initialize();
      logger.info('Database service initialized');

      await this.blockchainService.initialize();
      logger.info('Blockchain service initialized');

      // Try to initialize AI Engine service (optional)
      try {
        this.aiEngineService = new AIEngineService();
        await this.aiEngineService.initialize();
        logger.info('AI Engine service initialized');
      } catch (error) {
        logger.warn('AI Engine service not available, continuing without it:', (error as Error).message);
        this.aiEngineService = null;
      }

      logger.info('All services initialized successfully');
    } catch (error) {
      logger.error('Service initialization failed:', error);
      throw error;
    }
  }

  private setupWebSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      socket.on('subscribe_rounds', (data) => {
        this.websocketService.handleRoundSubscription(socket, data);
      });

      socket.on('subscribe_predictions', (data) => {
        this.websocketService.handlePredictionSubscription(socket, data);
      });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  private setupGracefulShutdown() {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      this.server.close(() => {
        logger.info('HTTP server closed');
      });

      try {
        await this.blockchainService.cleanup();
        await this.databaseService.cleanup();
        if (this.aiEngineService) {
          await this.aiEngineService.cleanup();
        }
        logger.info('Services cleaned up successfully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during cleanup:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// Start server
const server = new PredixServer();
server.start().catch((error) => {
  logger.error('Failed to start PREDIX AI server:', error);
  process.exit(1);
});

export default PredixServer;
