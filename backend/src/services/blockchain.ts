import { ethers } from 'ethers';
import { config } from '../config/config';
import { logger } from '../utils/logger';

// Import contract ABIs (these would be generated from the smart contracts)
import RoundManagerABI from '../abis/RoundManager.json';
import PredictionPoolABI from '../abis/PredictionPool.json';
import OracleHandlerABI from '../abis/OracleHandler.json';
import RewardManagerABI from '../abis/RewardManager.json';
import AIOracleAdapterABI from '../abis/AIOracleAdapter.json';

export interface RoundData {
  id: number;
  startTime: number;
  votingEndTime: number;
  freezeEndTime: number;
  resolutionTime: number;
  aiPrediction: number;
  aiSignatureHash: string;
  startPrice: string;
  endPrice: string;
  phase: number;
  resolved: boolean;
  winningDirection: number;
  totalFollowStake: string;
  totalCounterStake: string;
}

export interface UserStake {
  amount: string;
  direction: number;
  claimed: boolean;
  reward: string;
}

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contracts: {
    roundManager?: ethers.Contract;
    predictionPool?: ethers.Contract;
    oracleHandler?: ethers.Contract;
    rewardManager?: ethers.Contract;
    aiOracleAdapter?: ethers.Contract;
  } = {};

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.POLYGON_RPC_URL);
    
    if (!config.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY environment variable is required');
    }
    
    this.wallet = new ethers.Wallet(config.PRIVATE_KEY, this.provider);
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing blockchain service...');

      // Test connection
      const network = await this.provider.getNetwork();
      logger.info(`Connected to network: ${network.name} (${network.chainId})`);

      // Initialize contracts
      await this.initializeContracts();

      // Verify wallet balance
      const balance = await this.provider.getBalance(this.wallet.address);
      logger.info(`Wallet balance: ${ethers.formatEther(balance)} POL`);

      if (balance === 0n) {
        logger.warn('Wallet has zero balance - may not be able to send transactions');
      }

      logger.info('Blockchain service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  private async initializeContracts(): Promise<void> {
    try {
      // Round Manager Contract
      if (config.CONTRACT_ADDRESSES.ROUND_MANAGER) {
        this.contracts.roundManager = new ethers.Contract(
          config.CONTRACT_ADDRESSES.ROUND_MANAGER,
          RoundManagerABI,
          this.wallet
        );
        logger.info('Round Manager contract initialized');
      }

      // Prediction Pool Contract
      if (config.CONTRACT_ADDRESSES.PREDICTION_POOL) {
        this.contracts.predictionPool = new ethers.Contract(
          config.CONTRACT_ADDRESSES.PREDICTION_POOL,
          PredictionPoolABI,
          this.wallet
        );
        logger.info('Prediction Pool contract initialized');
      }

      // Oracle Handler Contract
      if (config.CONTRACT_ADDRESSES.ORACLE_HANDLER) {
        this.contracts.oracleHandler = new ethers.Contract(
          config.CONTRACT_ADDRESSES.ORACLE_HANDLER,
          OracleHandlerABI,
          this.wallet
        );
        logger.info('Oracle Handler contract initialized');
      }

      // Reward Manager Contract
      if (config.CONTRACT_ADDRESSES.REWARD_MANAGER) {
        this.contracts.rewardManager = new ethers.Contract(
          config.CONTRACT_ADDRESSES.REWARD_MANAGER,
          RewardManagerABI,
          this.wallet
        );
        logger.info('Reward Manager contract initialized');
      }

      // AI Oracle Adapter Contract
      if (config.CONTRACT_ADDRESSES.AI_ORACLE_ADAPTER) {
        this.contracts.aiOracleAdapter = new ethers.Contract(
          config.CONTRACT_ADDRESSES.AI_ORACLE_ADAPTER,
          AIOracleAdapterABI,
          this.wallet
        );
        logger.info('AI Oracle Adapter contract initialized');
      }

    } catch (error) {
      logger.error('Failed to initialize contracts:', error);
      throw error;
    }
  }

  async createRound(aiPrediction: number, signatureHash: string): Promise<number> {
    try {
      if (!this.contracts.roundManager) {
        throw new Error('Round Manager contract not initialized');
      }

      logger.info(`Creating new round with AI prediction: ${aiPrediction === 0 ? 'UP' : 'DOWN'}`);

      const tx = await this.contracts.roundManager.createRound(aiPrediction, signatureHash);
      const receipt = await tx.wait();

      // Extract round ID from events
      const roundCreatedEvent = receipt.logs.find((log: any) => 
        log.topics[0] === ethers.id('RoundCreated(uint256,uint256,uint8,bytes32,uint256)')
      );

      if (roundCreatedEvent) {
        const roundId = parseInt(roundCreatedEvent.topics[1], 16);
        logger.info(`Round ${roundId} created successfully. Tx: ${receipt.hash}`);
        return roundId;
      } else {
        throw new Error('RoundCreated event not found in transaction receipt');
      }

    } catch (error) {
      logger.error('Failed to create round:', error);
      throw error;
    }
  }

  async getRound(roundId: number): Promise<RoundData | null> {
    try {
      if (!this.contracts.roundManager) {
        throw new Error('Round Manager contract not initialized');
      }

      const roundData = await this.contracts.roundManager.getRound(roundId);
      
      return {
        id: Number(roundData.id),
        startTime: Number(roundData.startTime),
        votingEndTime: Number(roundData.votingEndTime),
        freezeEndTime: Number(roundData.freezeEndTime),
        resolutionTime: Number(roundData.resolutionTime),
        aiPrediction: Number(roundData.aiPrediction),
        aiSignatureHash: roundData.aiSignatureHash,
        startPrice: ethers.formatEther(roundData.startPrice),
        endPrice: ethers.formatEther(roundData.endPrice),
        phase: Number(roundData.phase),
        resolved: roundData.resolved,
        winningDirection: Number(roundData.winningDirection),
        totalFollowStake: ethers.formatEther(roundData.totalFollowStake),
        totalCounterStake: ethers.formatEther(roundData.totalCounterStake)
      };

    } catch (error) {
      logger.error(`Failed to get round ${roundId}:`, error);
      return null;
    }
  }

  async getCurrentRoundId(): Promise<number> {
    try {
      if (!this.contracts.roundManager) {
        throw new Error('Round Manager contract not initialized');
      }

      const currentRoundId = await this.contracts.roundManager.currentRoundId();
      return Number(currentRoundId);

    } catch (error) {
      logger.error('Failed to get current round ID:', error);
      throw error;
    }
  }

  async freezeRound(roundId: number): Promise<string> {
    try {
      if (!this.contracts.roundManager) {
        throw new Error('Round Manager contract not initialized');
      }

      logger.info(`Freezing round ${roundId}`);

      const tx = await this.contracts.roundManager.freezeRound(roundId);
      const receipt = await tx.wait();

      logger.info(`Round ${roundId} frozen successfully. Tx: ${receipt.hash}`);
      return receipt.hash;

    } catch (error) {
      logger.error(`Failed to freeze round ${roundId}:`, error);
      throw error;
    }
  }

  async resolveRound(roundId: number): Promise<string> {
    try {
      if (!this.contracts.roundManager) {
        throw new Error('Round Manager contract not initialized');
      }

      logger.info(`Resolving round ${roundId}`);

      const tx = await this.contracts.roundManager.resolveRound(roundId);
      const receipt = await tx.wait();

      logger.info(`Round ${roundId} resolved successfully. Tx: ${receipt.hash}`);
      return receipt.hash;

    } catch (error) {
      logger.error(`Failed to resolve round ${roundId}:`, error);
      throw error;
    }
  }

  async getUserStake(roundId: number, userAddress: string): Promise<UserStake | null> {
    try {
      if (!this.contracts.predictionPool) {
        throw new Error('Prediction Pool contract not initialized');
      }

      const stakeData = await this.contracts.predictionPool.getUserStake(roundId, userAddress);
      
      return {
        amount: ethers.formatEther(stakeData.amount),
        direction: Number(stakeData.direction),
        claimed: stakeData.claimed,
        reward: ethers.formatEther(stakeData.reward)
      };

    } catch (error) {
      logger.error(`Failed to get user stake for round ${roundId}:`, error);
      return null;
    }
  }

  async getLatestPrice(): Promise<string> {
    try {
      if (!this.contracts.oracleHandler) {
        throw new Error('Oracle Handler contract not initialized');
      }

      const price = await this.contracts.oracleHandler.getLatestPrice();
      return ethers.formatEther(price);

    } catch (error) {
      logger.error('Failed to get latest price:', error);
      throw error;
    }
  }

  async signMessage(message: string): Promise<string> {
    try {
      const signature = await this.wallet.signMessage(message);
      return signature;
    } catch (error) {
      logger.error('Failed to sign message:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Check provider connection
      const blockNumber = await this.provider.getBlockNumber();
      if (!blockNumber || blockNumber === 0) {
        return false;
      }

      // Check wallet balance
      const balance = await this.provider.getBalance(this.wallet.address);
      if (balance === 0n) {
        logger.warn('Wallet has zero balance');
      }

      // Check contract connections
      if (this.contracts.roundManager) {
        await this.contracts.roundManager.currentRoundId();
      }

      return true;

    } catch (error) {
      logger.error('Blockchain health check failed:', error);
      return false;
    }
  }

  async cleanup(): Promise<void> {
    try {
      // Close provider connections if needed
      logger.info('Blockchain service cleanup completed');
    } catch (error) {
      logger.error('Error during blockchain service cleanup:', error);
    }
  }

  // Utility methods
  getWalletAddress(): string {
    return this.wallet.address;
  }

  async getGasPrice(): Promise<string> {
    const gasPrice = await this.provider.getFeeData();
    return ethers.formatUnits(gasPrice.gasPrice || 0n, 'gwei');
  }

  async estimateGas(to: string, data: string): Promise<string> {
    const gasEstimate = await this.provider.estimateGas({ to, data });
    return gasEstimate.toString();
  }
}
