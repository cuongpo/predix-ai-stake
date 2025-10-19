import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { config } from '../config/config';

export interface SocketData {
  userId?: string;
  subscriptions: Set<string>;
  connectedAt: Date;
}

export class WebSocketService {
  private io: SocketIOServer;
  private connectedClients: Map<string, SocketData> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupHeartbeat();
  }

  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.io.emit('heartbeat', { timestamp: Date.now() });
    }, config.WS_HEARTBEAT_INTERVAL);
  }

  handleRoundSubscription(socket: Socket, data: any): void {
    try {
      const { roundId } = data;
      const room = `round_${roundId}`;
      
      socket.join(room);
      
      const socketData = this.connectedClients.get(socket.id);
      if (socketData) {
        socketData.subscriptions.add(room);
      }

      logger.debug(`Client ${socket.id} subscribed to round ${roundId}`);
      
      socket.emit('subscription_confirmed', {
        type: 'round',
        roundId,
        room
      });

    } catch (error) {
      logger.error('Error handling round subscription:', error);
      socket.emit('subscription_error', {
        type: 'round',
        error: 'Failed to subscribe to round updates'
      });
    }
  }

  handlePredictionSubscription(socket: Socket, data: any): void {
    try {
      const room = 'predictions';
      
      socket.join(room);
      
      const socketData = this.connectedClients.get(socket.id);
      if (socketData) {
        socketData.subscriptions.add(room);
      }

      logger.debug(`Client ${socket.id} subscribed to predictions`);
      
      socket.emit('subscription_confirmed', {
        type: 'predictions',
        room
      });

    } catch (error) {
      logger.error('Error handling prediction subscription:', error);
      socket.emit('subscription_error', {
        type: 'predictions',
        error: 'Failed to subscribe to prediction updates'
      });
    }
  }

  broadcastRoundCreated(roundId: number, aiPrediction: number): void {
    try {
      const data = {
        type: 'round_created',
        roundId,
        aiPrediction: aiPrediction === 0 ? 'UP' : 'DOWN',
        timestamp: Date.now()
      };

      this.io.emit('round_created', data);
      this.io.to(`round_${roundId}`).emit('round_update', data);

      logger.info(`Broadcasted round created: ${roundId}`);
    } catch (error) {
      logger.error('Error broadcasting round created:', error);
    }
  }

  broadcastRoundFrozen(roundId: number): void {
    try {
      const data = {
        type: 'round_frozen',
        roundId,
        timestamp: Date.now()
      };

      this.io.to(`round_${roundId}`).emit('round_update', data);
      this.io.emit('round_frozen', data);

      logger.info(`Broadcasted round frozen: ${roundId}`);
    } catch (error) {
      logger.error('Error broadcasting round frozen:', error);
    }
  }

  broadcastRoundResolved(roundId: number, roundData: any): void {
    try {
      const data = {
        type: 'round_resolved',
        roundId,
        winningDirection: roundData.winningDirection === 0 ? 'UP' : 'DOWN',
        endPrice: roundData.endPrice,
        totalFollowStake: roundData.totalFollowStake,
        totalCounterStake: roundData.totalCounterStake,
        timestamp: Date.now()
      };

      this.io.to(`round_${roundId}`).emit('round_update', data);
      this.io.emit('round_resolved', data);

      logger.info(`Broadcasted round resolved: ${roundId}`);
    } catch (error) {
      logger.error('Error broadcasting round resolved:', error);
    }
  }

  broadcastPredictionMade(prediction: any): void {
    try {
      const data = {
        type: 'prediction_made',
        direction: prediction.direction === 0 ? 'UP' : 'DOWN',
        confidence: prediction.confidence,
        roundId: prediction.roundId,
        timestamp: Date.now()
      };

      this.io.to('predictions').emit('prediction_update', data);
      this.io.emit('prediction_made', data);

      logger.info(`Broadcasted prediction made for round ${prediction.roundId}`);
    } catch (error) {
      logger.error('Error broadcasting prediction made:', error);
    }
  }

  broadcastUserStake(roundId: number, userAddress: string, amount: string, direction: number): void {
    try {
      const data = {
        type: 'user_stake',
        roundId,
        userAddress: userAddress.slice(0, 6) + '...' + userAddress.slice(-4), // Anonymize
        amount,
        direction: direction === 0 ? 'FOLLOW' : 'COUNTER',
        timestamp: Date.now()
      };

      this.io.to(`round_${roundId}`).emit('round_update', data);
      this.io.emit('user_staked', data);

      logger.info(`Broadcasted user stake for round ${roundId}`);
    } catch (error) {
      logger.error('Error broadcasting user stake:', error);
    }
  }

  broadcastPriceUpdate(price: string): void {
    try {
      const data = {
        type: 'price_update',
        price,
        timestamp: Date.now()
      };

      this.io.emit('price_update', data);

      logger.debug(`Broadcasted price update: ${price}`);
    } catch (error) {
      logger.error('Error broadcasting price update:', error);
    }
  }

  broadcastEmergencyStop(reason: string): void {
    try {
      const data = {
        type: 'emergency_stop',
        reason,
        timestamp: Date.now()
      };

      this.io.emit('emergency_stop', data);

      logger.warn(`Broadcasted emergency stop: ${reason}`);
    } catch (error) {
      logger.error('Error broadcasting emergency stop:', error);
    }
  }

  broadcastSystemStatus(status: any): void {
    try {
      const data = {
        type: 'system_status',
        status,
        timestamp: Date.now()
      };

      this.io.emit('system_status', data);

      logger.debug('Broadcasted system status update');
    } catch (error) {
      logger.error('Error broadcasting system status:', error);
    }
  }

  sendToUser(userId: string, event: string, data: any): void {
    try {
      // Find socket by user ID
      for (const [socketId, socketData] of this.connectedClients.entries()) {
        if (socketData.userId === userId) {
          this.io.to(socketId).emit(event, data);
          logger.debug(`Sent ${event} to user ${userId}`);
          return;
        }
      }

      logger.warn(`User ${userId} not found for direct message`);
    } catch (error) {
      logger.error('Error sending message to user:', error);
    }
  }

  onConnection(socket: Socket): void {
    try {
      const socketData: SocketData = {
        subscriptions: new Set(),
        connectedAt: new Date()
      };

      this.connectedClients.set(socket.id, socketData);

      logger.info(`Client connected: ${socket.id} (Total: ${this.connectedClients.size})`);

      // Send welcome message
      socket.emit('connected', {
        socketId: socket.id,
        timestamp: Date.now(),
        message: 'Connected to PREDIX AI'
      });

      // Handle authentication
      socket.on('authenticate', (data) => {
        this.handleAuthentication(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.onDisconnection(socket);
      });

      // Handle subscription requests
      socket.on('subscribe_rounds', (data) => {
        this.handleRoundSubscription(socket, data);
      });

      socket.on('subscribe_predictions', (data) => {
        this.handlePredictionSubscription(socket, data);
      });

      // Handle unsubscription
      socket.on('unsubscribe', (data) => {
        this.handleUnsubscription(socket, data);
      });

      // Handle heartbeat response
      socket.on('heartbeat_response', (data) => {
        logger.debug(`Heartbeat response from ${socket.id}`);
      });

    } catch (error) {
      logger.error('Error handling connection:', error);
    }
  }

  private handleAuthentication(socket: Socket, data: any): void {
    try {
      const { userId, signature } = data;

      // Verify signature (implement your authentication logic)
      if (this.verifyUserSignature(userId, signature)) {
        const socketData = this.connectedClients.get(socket.id);
        if (socketData) {
          socketData.userId = userId;
        }

        socket.emit('authenticated', { userId });
        logger.info(`Client ${socket.id} authenticated as user ${userId}`);
      } else {
        socket.emit('authentication_failed', { error: 'Invalid signature' });
        logger.warn(`Authentication failed for client ${socket.id}`);
      }

    } catch (error) {
      logger.error('Error handling authentication:', error);
      socket.emit('authentication_failed', { error: 'Authentication error' });
    }
  }

  private handleUnsubscription(socket: Socket, data: any): void {
    try {
      const { type, roundId } = data;
      let room: string;

      if (type === 'round' && roundId) {
        room = `round_${roundId}`;
      } else if (type === 'predictions') {
        room = 'predictions';
      } else {
        socket.emit('unsubscription_error', { error: 'Invalid subscription type' });
        return;
      }

      socket.leave(room);

      const socketData = this.connectedClients.get(socket.id);
      if (socketData) {
        socketData.subscriptions.delete(room);
      }

      socket.emit('unsubscription_confirmed', { type, room });
      logger.debug(`Client ${socket.id} unsubscribed from ${room}`);

    } catch (error) {
      logger.error('Error handling unsubscription:', error);
      socket.emit('unsubscription_error', { error: 'Failed to unsubscribe' });
    }
  }

  private onDisconnection(socket: Socket): void {
    try {
      this.connectedClients.delete(socket.id);
      logger.info(`Client disconnected: ${socket.id} (Total: ${this.connectedClients.size})`);
    } catch (error) {
      logger.error('Error handling disconnection:', error);
    }
  }

  private verifyUserSignature(userId: string, signature: string): boolean {
    // Implement signature verification logic
    // This is a placeholder - implement proper signature verification
    return signature && signature.length > 0;
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  getClientSubscriptions(socketId: string): string[] {
    const socketData = this.connectedClients.get(socketId);
    return socketData ? Array.from(socketData.subscriptions) : [];
  }

  cleanup(): void {
    try {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      this.connectedClients.clear();
      logger.info('WebSocket service cleanup completed');
    } catch (error) {
      logger.error('Error during WebSocket service cleanup:', error);
    }
  }
}
