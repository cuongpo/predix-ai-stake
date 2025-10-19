import Database from 'better-sqlite3';
import path from 'path';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export interface RoundRecord {
  id: number;
  round_id: number;
  ai_prediction: number;
  signature_hash: string;
  start_time: string;
  voting_end_time: string;
  freeze_end_time: string;
  resolution_time: string;
  start_price: string;
  end_price?: string;
  phase: string;
  resolved: number; // SQLite uses 0/1 for boolean
  winning_direction?: number;
  total_follow_stake: string;
  total_counter_stake: string;
  created_at: string;
  updated_at: string;
}

export interface UserStakeRecord {
  id: number;
  round_id: number;
  user_address: string;
  amount: string;
  direction: number;
  claimed: number; // SQLite uses 0/1 for boolean
  reward: string;
  transaction_hash: string;
  created_at: string;
}

export interface PredictionRecord {
  id: number;
  round_id: number;
  direction: number;
  confidence: number;
  features_hash: string;
  signature_hash: string;
  model_version: string;
  metadata: string; // JSON string in SQLite
  created_at: string;
}

export class DatabaseService {
  private db: Database.Database;

  constructor() {
    const dbPath = config.NODE_ENV === 'test'
      ? ':memory:'
      : path.join(process.cwd(), 'data', 'predix.db');

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing SQLite database...');

      // Create tables if they don't exist
      this.createTables();

      logger.info('Database service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database service:', error);
      throw error;
    }
  }

  private createTables(): void {
    // Create rounds table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rounds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        round_id INTEGER UNIQUE NOT NULL,
        ai_prediction INTEGER NOT NULL,
        signature_hash TEXT NOT NULL,
        start_time TEXT,
        voting_end_time TEXT,
        freeze_end_time TEXT,
        resolution_time TEXT,
        start_price TEXT,
        end_price TEXT,
        phase TEXT DEFAULT 'voting',
        resolved INTEGER DEFAULT 0,
        winning_direction INTEGER,
        total_follow_stake TEXT DEFAULT '0',
        total_counter_stake TEXT DEFAULT '0',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_stakes table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_stakes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        round_id INTEGER NOT NULL,
        user_address TEXT NOT NULL,
        amount TEXT NOT NULL,
        direction INTEGER NOT NULL,
        claimed INTEGER DEFAULT 0,
        reward TEXT DEFAULT '0',
        transaction_hash TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(round_id, user_address)
      )
    `);

    // Create predictions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        round_id INTEGER NOT NULL,
        direction INTEGER NOT NULL,
        confidence REAL NOT NULL,
        features_hash TEXT,
        signature_hash TEXT,
        model_version TEXT,
        metadata TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_rounds_round_id ON rounds(round_id);
      CREATE INDEX IF NOT EXISTS idx_user_stakes_round_user ON user_stakes(round_id, user_address);
      CREATE INDEX IF NOT EXISTS idx_predictions_round_id ON predictions(round_id);
    `);

    logger.info('Database tables created/verified');
  }

  // Round operations
  async createRound(roundData: {
    roundId: number;
    aiPrediction: number;
    signatureHash: string;
    createdAt: Date;
  }): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO rounds (
          round_id, ai_prediction, signature_hash, phase, resolved,
          total_follow_stake, total_counter_stake, created_at
        ) VALUES (?, ?, ?, 'voting', 0, '0', '0', ?)
      `);

      stmt.run(
        roundData.roundId,
        roundData.aiPrediction,
        roundData.signatureHash,
        roundData.createdAt.toISOString()
      );

      logger.info(`Round ${roundData.roundId} created in database`);
    } catch (error) {
      logger.error('Failed to create round in database:', error);
      throw error;
    }
  }

  async updateRoundPhase(roundId: number, phase: string): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        UPDATE rounds
        SET phase = ?, updated_at = CURRENT_TIMESTAMP
        WHERE round_id = ?
      `);

      stmt.run(phase, roundId);

      logger.info(`Round ${roundId} phase updated to ${phase}`);
    } catch (error) {
      logger.error(`Failed to update round ${roundId} phase:`, error);
      throw error;
    }
  }

  async updateRoundResolution(roundId: number, roundData: any): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        UPDATE rounds
        SET phase = 'resolved', resolved = 1, end_price = ?,
            winning_direction = ?, total_follow_stake = ?,
            total_counter_stake = ?, updated_at = CURRENT_TIMESTAMP
        WHERE round_id = ?
      `);

      stmt.run(
        roundData.endPrice,
        roundData.winningDirection,
        roundData.totalFollowStake,
        roundData.totalCounterStake,
        roundId
      );

      logger.info(`Round ${roundId} resolution updated in database`);
    } catch (error) {
      logger.error(`Failed to update round ${roundId} resolution:`, error);
      throw error;
    }
  }

  async getRounds(options: {
    page: number;
    limit: number;
    status?: string;
  }): Promise<{ rounds: RoundRecord[]; total: number; page: number; limit: number }> {
    try {
      let whereClause = '';
      let params: any[] = [];

      if (options.status) {
        whereClause = 'WHERE phase = ?';
        params.push(options.status);
      }

      // Get total count
      const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM rounds ${whereClause}`);
      const countResult = countStmt.get(...params) as { count: number };
      const total = countResult.count;

      // Get paginated data
      const offset = (options.page - 1) * options.limit;
      const dataStmt = this.db.prepare(`
        SELECT * FROM rounds ${whereClause}
        ORDER BY round_id DESC
        LIMIT ? OFFSET ?
      `);

      const rounds = dataStmt.all(...params, options.limit, offset) as RoundRecord[];

      return {
        rounds,
        total,
        page: options.page,
        limit: options.limit
      };
    } catch (error) {
      logger.error('Failed to get rounds from database:', error);
      throw error;
    }
  }

  async getRoundDetails(roundId: number): Promise<any> {
    try {
      const roundStmt = this.db.prepare('SELECT * FROM rounds WHERE round_id = ?');
      const round = roundStmt.get(roundId);

      const participantsStmt = this.db.prepare('SELECT * FROM user_stakes WHERE round_id = ?');
      const participants = participantsStmt.all(roundId);

      const predictionsStmt = this.db.prepare('SELECT * FROM predictions WHERE round_id = ?');
      const predictions = predictionsStmt.all(roundId);

      return {
        round,
        participants,
        predictions
      };
    } catch (error) {
      logger.error(`Failed to get round ${roundId} details:`, error);
      throw error;
    }
  }

  async getRoundStats(roundId: number): Promise<any> {
    try {
      const stmt = this.db.prepare(`
        SELECT
          COUNT(DISTINCT user_address) as totalParticipants,
          COUNT(CASE WHEN direction = 0 THEN 1 END) as followersCount,
          COUNT(CASE WHEN direction = 1 THEN 1 END) as countersCount,
          SUM(CAST(amount AS REAL)) as totalVolume,
          AVG(CAST(amount AS REAL)) as averageStake
        FROM user_stakes
        WHERE round_id = ?
      `);

      const stats = stmt.get(roundId);
      return stats;
    } catch (error) {
      logger.error(`Failed to get round ${roundId} stats:`, error);
      return null;
    }
  }

  // User stake operations
  async createUserStake(stakeData: {
    roundId: number;
    userAddress: string;
    amount: string;
    direction: number;
    transactionHash: string;
  }): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO user_stakes (
          round_id, user_address, amount, direction, claimed,
          reward, transaction_hash, created_at
        ) VALUES (?, ?, ?, ?, 0, '0', ?, CURRENT_TIMESTAMP)
      `);

      stmt.run(
        stakeData.roundId,
        stakeData.userAddress.toLowerCase(),
        stakeData.amount,
        stakeData.direction,
        stakeData.transactionHash
      );

      logger.info(`User stake created for round ${stakeData.roundId}`);
    } catch (error) {
      logger.error('Failed to create user stake:', error);
      throw error;
    }
  }

  async getUserStakes(userAddress: string, options?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<UserStakeRecord[]> {
    try {
      let query = `
        SELECT us.*, r.phase, r.resolved, r.winning_direction, r.ai_prediction
        FROM user_stakes us
        LEFT JOIN rounds r ON us.round_id = r.round_id
        WHERE us.user_address = ?
        ORDER BY us.created_at DESC
      `;

      let params = [userAddress.toLowerCase()];

      if (options?.page && options?.limit) {
        const offset = (options.page - 1) * options.limit;
        query += ` LIMIT ? OFFSET ?`;
        params.push(options.limit, offset);
      }

      const stmt = this.db.prepare(query);
      const data = stmt.all(...params) as UserStakeRecord[];

      return data;
    } catch (error) {
      logger.error('Failed to get user stakes:', error);
      throw error;
    }
  }

  // Prediction operations
  async createPrediction(predictionData: {
    roundId: number;
    direction: number;
    confidence: number;
    featuresHash: string;
    signatureHash: string;
    modelVersion: string;
    metadata: any;
  }): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO predictions (
          round_id, direction, confidence, features_hash,
          signature_hash, model_version, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      stmt.run(
        predictionData.roundId,
        predictionData.direction,
        predictionData.confidence,
        predictionData.featuresHash,
        predictionData.signatureHash,
        predictionData.modelVersion,
        JSON.stringify(predictionData.metadata)
      );

      logger.info(`Prediction created for round ${predictionData.roundId}`);
    } catch (error) {
      logger.error('Failed to create prediction:', error);
      throw error;
    }
  }

  async getPredictions(options: {
    page: number;
    limit: number;
    roundId?: number;
  }): Promise<PredictionRecord[]> {
    try {
      let query = 'SELECT * FROM predictions';
      let params: any[] = [];

      if (options.roundId) {
        query += ' WHERE round_id = ?';
        params.push(options.roundId);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      const offset = (options.page - 1) * options.limit;
      params.push(options.limit, offset);

      const stmt = this.db.prepare(query);
      const data = stmt.all(...params) as PredictionRecord[];

      return data;
    } catch (error) {
      logger.error('Failed to get predictions:', error);
      throw error;
    }
  }

  // Analytics operations
  async getSystemStats(): Promise<any> {
    try {
      const stmt = this.db.prepare(`
        SELECT
          COUNT(DISTINCT round_id) as totalRounds,
          COUNT(DISTINCT user_address) as totalUsers,
          SUM(CAST(amount AS REAL)) as totalVolume,
          AVG(CAST(amount AS REAL)) as averageStake
        FROM user_stakes
      `);

      return stmt.get();
    } catch (error) {
      logger.error('Failed to get system stats:', error);
      return null;
    }
  }

  async getUserStats(userAddress: string): Promise<any> {
    try {
      const stmt = this.db.prepare(`
        SELECT
          COUNT(*) as totalStakes,
          SUM(CAST(amount AS REAL)) as totalStaked,
          AVG(CAST(amount AS REAL)) as averageStake,
          COUNT(CASE WHEN claimed = 1 THEN 1 END) as claimedRewards
        FROM user_stakes
        WHERE user_address = ?
      `);

      return stmt.get(userAddress.toLowerCase());
    } catch (error) {
      logger.error('Failed to get user stats:', error);
      return null;
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM rounds LIMIT 1');
      stmt.get();
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  async cleanup(): Promise<void> {
    try {
      this.db.close();
      logger.info('Database service cleanup completed');
    } catch (error) {
      logger.error('Error during database service cleanup:', error);
    }
  }
}
