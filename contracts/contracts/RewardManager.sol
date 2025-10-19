// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title RewardManager
 * @dev Advanced reward calculation and distribution system for PREDIX AI
 */
contract RewardManager is Ownable, ReentrancyGuard, Pausable {
    // Constants
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant DEFAULT_PLATFORM_FEE = 200; // 2%
    uint256 public constant DEFAULT_CASHBACK_RATE = 2000; // 20%
    uint256 public constant MAX_PLATFORM_FEE = 500; // 5% maximum
    uint256 public constant MIN_CASHBACK_RATE = 1000; // 10% minimum

    // Dynamic fee structure
    struct FeeStructure {
        uint256 platformFeeRate;
        uint256 cashbackRate;
        uint256 bonusMultiplier; // For streak bonuses
        bool isActive;
    }

    // User statistics for bonus calculations
    struct UserStats {
        uint256 totalStaked;
        uint256 totalWon;
        uint256 winStreak;
        uint256 lastRoundParticipated;
        uint256 totalRounds;
    }

    // Reward pool information
    struct RewardPool {
        uint256 totalPool;
        uint256 winnerPool;
        uint256 loserPool;
        uint256 platformFee;
        uint256 bonusPool;
        bool distributed;
    }

    // State variables
    mapping(uint256 => FeeStructure) public roundFeeStructures;
    mapping(address => UserStats) public userStats;
    mapping(uint256 => RewardPool) public rewardPools;
    mapping(uint256 => mapping(address => bool)) public hasClaimedReward;
    mapping(uint256 => mapping(address => bool)) public hasClaimedCashback;

    address public predictionPool;
    address public treasury;
    uint256 public totalFeesCollected;
    uint256 public totalRewardsDistributed;

    // Bonus system
    uint256 public streakBonusThreshold = 3; // Bonus starts after 3 wins
    uint256 public maxStreakBonus = 500; // 5% maximum bonus

    // Events
    event RewardCalculated(
        uint256 indexed roundId,
        address indexed user,
        uint256 baseReward,
        uint256 bonusReward,
        uint256 totalReward
    );

    event CashbackCalculated(
        uint256 indexed roundId,
        address indexed user,
        uint256 cashbackAmount
    );

    event FeeStructureUpdated(
        uint256 indexed roundId,
        uint256 platformFeeRate,
        uint256 cashbackRate
    );

    event BonusParametersUpdated(
        uint256 streakThreshold,
        uint256 maxBonus
    );

    modifier onlyPredictionPool() {
        require(msg.sender == predictionPool, "Only prediction pool can call");
        _;
    }

    constructor(address _predictionPool, address _treasury) Ownable(msg.sender) {
        require(_predictionPool != address(0), "Invalid prediction pool");
        require(_treasury != address(0), "Invalid treasury");
        
        predictionPool = _predictionPool;
        treasury = _treasury;
    }

    /**
     * @dev Calculate reward for a winning user with bonuses
     * @param roundId The round ID
     * @param user The user address
     * @param userStake The user's stake amount
     * @param totalWinningPool Total winning pool amount
     * @param totalPool Total pool amount for the round
     * @return totalReward The calculated total reward including bonuses
     */
    function calculateRewardWithBonus(
        uint256 roundId,
        address user,
        uint256 userStake,
        uint256 totalWinningPool,
        uint256 totalPool
    ) external view returns (uint256 totalReward) {
        if (userStake == 0 || totalWinningPool == 0) return 0;

        // Get fee structure for this round
        FeeStructure memory feeStructure = getRoundFeeStructure(roundId);
        
        // Calculate base reward: (userStake / totalWinningPool) × (totalPool × (1 - platformFee))
        uint256 rewardPool = (totalPool * (BASIS_POINTS - feeStructure.platformFeeRate)) / BASIS_POINTS;
        uint256 baseReward = (userStake * rewardPool) / totalWinningPool;

        // Calculate streak bonus
        uint256 bonusReward = calculateStreakBonus(user, baseReward);
        
        totalReward = baseReward + bonusReward;
    }

    /**
     * @dev Calculate cashback for a losing user
     * @param roundId The round ID
     * @param user The user address
     * @param userStake The user's stake amount
     * @return cashbackAmount The calculated cashback amount
     */
    function calculateCashbackAmount(
        uint256 roundId,
        address user,
        uint256 userStake
    ) external view returns (uint256 cashbackAmount) {
        if (userStake == 0) return 0;

        FeeStructure memory feeStructure = getRoundFeeStructure(roundId);
        cashbackAmount = (userStake * feeStructure.cashbackRate) / BASIS_POINTS;
    }

    /**
     * @dev Calculate streak bonus based on user's winning streak
     * @param user The user address
     * @param baseReward The base reward amount
     * @return bonusAmount The calculated bonus amount
     */
    function calculateStreakBonus(address user, uint256 baseReward) 
        public 
        view 
        returns (uint256 bonusAmount) 
    {
        UserStats memory stats = userStats[user];
        
        if (stats.winStreak < streakBonusThreshold) return 0;
        
        // Bonus percentage increases with streak, capped at maxStreakBonus
        uint256 bonusPercentage = (stats.winStreak - streakBonusThreshold + 1) * 50; // 0.5% per streak
        if (bonusPercentage > maxStreakBonus) {
            bonusPercentage = maxStreakBonus;
        }
        
        bonusAmount = (baseReward * bonusPercentage) / BASIS_POINTS;
    }

    /**
     * @dev Update user statistics after round participation
     * @param user The user address
     * @param roundId The round ID
     * @param stakeAmount The stake amount
     * @param won Whether the user won
     */
    function updateUserStats(
        address user,
        uint256 roundId,
        uint256 stakeAmount,
        bool won
    ) external onlyPredictionPool {
        UserStats storage stats = userStats[user];
        
        stats.totalStaked += stakeAmount;
        stats.lastRoundParticipated = roundId;
        stats.totalRounds++;
        
        if (won) {
            stats.totalWon += stakeAmount;
            stats.winStreak++;
        } else {
            stats.winStreak = 0; // Reset streak on loss
        }
    }

    /**
     * @dev Initialize reward pool for a round
     * @param roundId The round ID
     * @param totalPool Total pool amount
     * @param winnerPool Winning side pool amount
     * @param loserPool Losing side pool amount
     */
    function initializeRewardPool(
        uint256 roundId,
        uint256 totalPool,
        uint256 winnerPool,
        uint256 loserPool
    ) external onlyPredictionPool {
        require(!rewardPools[roundId].distributed, "Pool already initialized");
        
        FeeStructure memory feeStructure = getRoundFeeStructure(roundId);
        uint256 platformFee = (totalPool * feeStructure.platformFeeRate) / BASIS_POINTS;
        uint256 bonusPool = (totalPool * 50) / BASIS_POINTS; // 0.5% for bonus pool
        
        rewardPools[roundId] = RewardPool({
            totalPool: totalPool,
            winnerPool: winnerPool,
            loserPool: loserPool,
            platformFee: platformFee,
            bonusPool: bonusPool,
            distributed: false
        });
        
        totalFeesCollected += platformFee;
    }

    /**
     * @dev Set fee structure for a specific round
     * @param roundId The round ID
     * @param platformFeeRate Platform fee rate in basis points
     * @param cashbackRate Cashback rate in basis points
     */
    function setRoundFeeStructure(
        uint256 roundId,
        uint256 platformFeeRate,
        uint256 cashbackRate
    ) external onlyOwner {
        require(platformFeeRate <= MAX_PLATFORM_FEE, "Platform fee too high");
        require(cashbackRate >= MIN_CASHBACK_RATE, "Cashback rate too low");
        
        roundFeeStructures[roundId] = FeeStructure({
            platformFeeRate: platformFeeRate,
            cashbackRate: cashbackRate,
            bonusMultiplier: BASIS_POINTS, // Default 1x multiplier
            isActive: true
        });
        
        emit FeeStructureUpdated(roundId, platformFeeRate, cashbackRate);
    }

    /**
     * @dev Get fee structure for a round (with fallback to defaults)
     * @param roundId The round ID
     * @return feeStructure The fee structure
     */
    function getRoundFeeStructure(uint256 roundId) 
        public 
        view 
        returns (FeeStructure memory feeStructure) 
    {
        if (roundFeeStructures[roundId].isActive) {
            return roundFeeStructures[roundId];
        }
        
        // Return default fee structure
        return FeeStructure({
            platformFeeRate: DEFAULT_PLATFORM_FEE,
            cashbackRate: DEFAULT_CASHBACK_RATE,
            bonusMultiplier: BASIS_POINTS,
            isActive: true
        });
    }

    /**
     * @dev Update bonus system parameters
     * @param newStreakThreshold New streak threshold for bonuses
     * @param newMaxBonus New maximum bonus percentage
     */
    function updateBonusParameters(
        uint256 newStreakThreshold,
        uint256 newMaxBonus
    ) external onlyOwner {
        require(newStreakThreshold > 0, "Invalid streak threshold");
        require(newMaxBonus <= 1000, "Max bonus too high"); // 10% maximum
        
        streakBonusThreshold = newStreakThreshold;
        maxStreakBonus = newMaxBonus;
        
        emit BonusParametersUpdated(newStreakThreshold, newMaxBonus);
    }

    /**
     * @dev Get user statistics
     * @param user The user address
     * @return stats The user statistics
     */
    function getUserStats(address user) external view returns (UserStats memory) {
        return userStats[user];
    }

    /**
     * @dev Get reward pool information
     * @param roundId The round ID
     * @return pool The reward pool information
     */
    function getRewardPool(uint256 roundId) external view returns (RewardPool memory) {
        return rewardPools[roundId];
    }

    /**
     * @dev Update prediction pool address
     * @param newPredictionPool New prediction pool address
     */
    function updatePredictionPool(address newPredictionPool) external onlyOwner {
        require(newPredictionPool != address(0), "Invalid address");
        predictionPool = newPredictionPool;
    }

    /**
     * @dev Update treasury address
     * @param newTreasury New treasury address
     */
    function updateTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid address");
        treasury = newTreasury;
    }

    /**
     * @dev Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
