import axios, { AxiosInstance } from 'axios';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export interface PredictionRequest {
  features: number[][];
  timestamp: string;
}

export interface PredictionResponse {
  direction: number;
  confidence: number;
  signature_hash: string;
  model_version: string;
  metadata: {
    total_predictions: number;
    accuracy: number;
    emergency_stop: boolean;
  };
}

export interface AIEngineStats {
  status: string;
  total_predictions: number;
  correct_predictions: number;
  accuracy: number;
  consecutive_losses: number;
  emergency_stop: boolean;
  last_prediction_time: string | null;
  model_version: string;
}

export class AIEngineService {
  private client: AxiosInstance;
  private apiKey: string;
  private isConnected: boolean = false;

  constructor() {
    this.apiKey = config.AI_ENGINE_API_KEY || 'default-api-key';
    
    this.client = axios.create({
      baseURL: config.AI_ENGINE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`AI Engine Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('AI Engine Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`AI Engine Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('AI Engine Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing AI Engine service...');

      // Test connection
      const healthCheck = await this.healthCheck();
      if (!healthCheck) {
        throw new Error('AI Engine health check failed');
      }

      this.isConnected = true;
      logger.info('AI Engine service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AI Engine service:', error);
      throw error;
    }
  }

  async generatePrediction(): Promise<PredictionResponse | null> {
    try {
      if (!this.isConnected) {
        throw new Error('AI Engine not connected');
      }

      logger.info('Requesting prediction from AI Engine...');

      const response = await this.client.post('/predict', {
        timestamp: new Date().toISOString()
      });

      if (response.data.success) {
        const prediction = response.data.data;
        
        logger.info(`AI prediction received: ${prediction.direction === 0 ? 'UP' : 'DOWN'} (confidence: ${prediction.confidence})`);
        
        return {
          direction: prediction.direction,
          confidence: prediction.confidence,
          signature_hash: prediction.signature_hash,
          model_version: prediction.model_version,
          metadata: prediction.metadata
        };
      } else {
        logger.warning('AI Engine returned unsuccessful prediction');
        return null;
      }

    } catch (error) {
      logger.error('Failed to generate prediction:', error);
      return null;
    }
  }

  async getPredictionStats(): Promise<AIEngineStats | null> {
    try {
      const response = await this.client.get('/stats');

      if (response.data.success) {
        return response.data.data;
      } else {
        logger.warning('Failed to get AI Engine stats');
        return null;
      }

    } catch (error) {
      logger.error('Failed to get prediction stats:', error);
      return null;
    }
  }

  async getRecentPredictions(limit: number = 10): Promise<any[] | null> {
    try {
      const response = await this.client.get(`/predictions/recent?limit=${limit}`);

      if (response.data.success) {
        return response.data.data;
      } else {
        logger.warning('Failed to get recent predictions');
        return null;
      }

    } catch (error) {
      logger.error('Failed to get recent predictions:', error);
      return null;
    }
  }

  async updatePredictionResult(roundId: number, actualOutcome: number): Promise<boolean> {
    try {
      const response = await this.client.post('/prediction/update', {
        round_id: roundId,
        actual_outcome: actualOutcome
      });

      if (response.data.success) {
        logger.info(`Prediction result updated for round ${roundId}: ${actualOutcome === 0 ? 'UP' : 'DOWN'}`);
        return true;
      } else {
        logger.warning(`Failed to update prediction result for round ${roundId}`);
        return false;
      }

    } catch (error) {
      logger.error('Failed to update prediction result:', error);
      return false;
    }
  }

  async manualOverride(direction: number, confidence: number = 0.9): Promise<PredictionResponse | null> {
    try {
      logger.warning(`Manual prediction override requested: ${direction === 0 ? 'UP' : 'DOWN'}`);

      const response = await this.client.post('/predict/override', {
        direction,
        confidence,
        timestamp: new Date().toISOString()
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        logger.error('Manual override failed');
        return null;
      }

    } catch (error) {
      logger.error('Failed to execute manual override:', error);
      return null;
    }
  }

  async resetEmergencyStop(): Promise<boolean> {
    try {
      const response = await this.client.post('/emergency/reset');

      if (response.data.success) {
        logger.info('Emergency stop reset successfully');
        return true;
      } else {
        logger.warning('Failed to reset emergency stop');
        return false;
      }

    } catch (error) {
      logger.error('Failed to reset emergency stop:', error);
      return false;
    }
  }

  async retrainModel(): Promise<boolean> {
    try {
      logger.info('Requesting model retraining...');

      const response = await this.client.post('/model/retrain');

      if (response.data.success) {
        logger.info('Model retraining initiated successfully');
        return true;
      } else {
        logger.warning('Failed to initiate model retraining');
        return false;
      }

    } catch (error) {
      logger.error('Failed to retrain model:', error);
      return false;
    }
  }

  async getModelInfo(): Promise<any | null> {
    try {
      const response = await this.client.get('/model/info');

      if (response.data.success) {
        return response.data.data;
      } else {
        logger.warning('Failed to get model info');
        return null;
      }

    } catch (error) {
      logger.error('Failed to get model info:', error);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', {
        timeout: 5000
      });

      return response.status === 200 && response.data.status === 'healthy';

    } catch (error) {
      logger.error('AI Engine health check failed:', error);
      return false;
    }
  }

  verifyApiKey(apiKey: string): boolean {
    return apiKey === this.apiKey;
  }

  async cleanup(): Promise<void> {
    try {
      this.isConnected = false;
      logger.info('AI Engine service cleanup completed');
    } catch (error) {
      logger.error('Error during AI Engine service cleanup:', error);
    }
  }

  // Utility methods
  isEmergencyStopActive(): boolean {
    // This would typically check the current AI engine status
    // For now, return false as a placeholder
    return false;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  async testConnection(): Promise<{ connected: boolean; latency?: number; error?: string }> {
    try {
      const startTime = Date.now();
      const isHealthy = await this.healthCheck();
      const latency = Date.now() - startTime;

      return {
        connected: isHealthy,
        latency: isHealthy ? latency : undefined,
        error: isHealthy ? undefined : 'Health check failed'
      };

    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Configuration methods
  updateApiKey(newApiKey: string): void {
    this.apiKey = newApiKey;
    this.client.defaults.headers['Authorization'] = `Bearer ${newApiKey}`;
    logger.info('AI Engine API key updated');
  }

  updateBaseURL(newBaseURL: string): void {
    this.client.defaults.baseURL = newBaseURL;
    logger.info(`AI Engine base URL updated to: ${newBaseURL}`);
  }
}
