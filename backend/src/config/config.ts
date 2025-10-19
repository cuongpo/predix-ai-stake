import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001'),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/predix_ai',
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,

  // Blockchain Configuration
  POLYGON_RPC_URL: process.env.POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology',
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  CONTRACT_ADDRESSES: {
    ROUND_MANAGER: process.env.ROUND_MANAGER_ADDRESS,
    PREDICTION_POOL: process.env.PREDICTION_POOL_ADDRESS,
    ORACLE_HANDLER: process.env.ORACLE_HANDLER_ADDRESS,
    REWARD_MANAGER: process.env.REWARD_MANAGER_ADDRESS,
    AI_ORACLE_ADAPTER: process.env.AI_ORACLE_ADAPTER_ADDRESS,
  },

  // AI Engine Configuration
  AI_ENGINE_URL: process.env.AI_ENGINE_URL || 'http://localhost:8000',
  AI_ENGINE_API_KEY: process.env.AI_ENGINE_API_KEY,

  // Chainlink Oracle Configuration
  CHAINLINK_POL_USD_FEED: process.env.CHAINLINK_POL_USD_FEED || '0x...',

  // API Keys
  COINGECKO_API_KEY: process.env.COINGECKO_API_KEY,
  TWITTER_API_KEY: process.env.TWITTER_API_KEY,
  REDDIT_API_KEY: process.env.REDDIT_API_KEY,

  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  // Redis Configuration (for caching)
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // Round Configuration
  ROUND_DURATION: {
    VOTING_PHASE: 5 * 60 * 1000, // 5 minutes in milliseconds
    FREEZE_PHASE: 5 * 60 * 1000, // 5 minutes in milliseconds
    RESOLUTION_PHASE: 1 * 60 * 1000, // 1 minute in milliseconds
    TOTAL_CYCLE: 10 * 60 * 1000, // 10 minutes in milliseconds
  },

  // Prediction Configuration
  MIN_CONFIDENCE_THRESHOLD: parseFloat(process.env.MIN_CONFIDENCE_THRESHOLD || '0.6'),
  MAX_CONSECUTIVE_LOSSES: parseInt(process.env.MAX_CONSECUTIVE_LOSSES || '5'),
  EMERGENCY_STOP_THRESHOLD: parseFloat(process.env.EMERGENCY_STOP_THRESHOLD || '0.3'),

  // Staking Configuration
  MIN_STAKE_AMOUNT: process.env.MIN_STAKE_AMOUNT || '0.01', // 0.01 POL
  MAX_STAKE_AMOUNT: process.env.MAX_STAKE_AMOUNT || '1000', // 1000 POL

  // Fee Configuration
  PLATFORM_FEE_RATE: 0.02, // 2%
  CASHBACK_RATE: 0.20, // 20%

  // WebSocket Configuration
  WS_HEARTBEAT_INTERVAL: 30000, // 30 seconds
  WS_MAX_CONNECTIONS: 1000,

  // Rate Limiting
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,

  // Logging Configuration
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE: process.env.LOG_FILE || 'logs/predix-api.log',

  // Security Configuration
  CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  HELMET_CONFIG: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  },

  // Health Check Configuration
  HEALTH_CHECK_INTERVAL: 60000, // 1 minute
  HEALTH_CHECK_TIMEOUT: 5000, // 5 seconds

  // Cache Configuration
  CACHE_TTL: {
    ROUND_DATA: 30, // 30 seconds
    PREDICTION_DATA: 60, // 1 minute
    PRICE_DATA: 10, // 10 seconds
    USER_DATA: 300, // 5 minutes
  },

  // Notification Configuration
  NOTIFICATION_SETTINGS: {
    ROUND_CREATED: true,
    ROUND_RESOLVED: true,
    PREDICTION_MADE: true,
    EMERGENCY_STOP: true,
  },

  // Development Configuration
  MOCK_DATA: process.env.NODE_ENV === 'development',
  DEBUG_MODE: process.env.DEBUG === 'true',
  VERBOSE_LOGGING: process.env.VERBOSE_LOGGING === 'true',

  // Monitoring Configuration
  METRICS_ENABLED: process.env.METRICS_ENABLED === 'true',
  METRICS_PORT: parseInt(process.env.METRICS_PORT || '9090'),

  // Backup Configuration
  BACKUP_ENABLED: process.env.BACKUP_ENABLED === 'true',
  BACKUP_INTERVAL: process.env.BACKUP_INTERVAL || '0 2 * * *', // Daily at 2 AM
  BACKUP_RETENTION_DAYS: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
};

// Validation
export const validateConfig = () => {
  const requiredEnvVars = [
    'POLYGON_RPC_URL',
    'PRIVATE_KEY',
    'DATABASE_URL',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate contract addresses in production
  if (config.NODE_ENV === 'production') {
    const requiredContracts = Object.entries(config.CONTRACT_ADDRESSES);
    const missingContracts = requiredContracts.filter(([, address]) => !address);

    if (missingContracts.length > 0) {
      throw new Error(`Missing contract addresses: ${missingContracts.map(([name]) => name).join(', ')}`);
    }
  }
};

// Export types
export type Config = typeof config;
export type ContractAddresses = typeof config.CONTRACT_ADDRESSES;
