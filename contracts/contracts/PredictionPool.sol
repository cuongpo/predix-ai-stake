// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IPredictionPool.sol";

/**
 * @title PredictionPool
 * @dev Handles POL staking and reward distribution for PREDIX AI
 */
contract PredictionPool is IPredictionPool, Ownable, ReentrancyGuard, Pausable {
    // Constants
    uint256 public constant PLATFORM_FEE_RATE = 200; // 2% (200/10000)
    uint256 public constant CASHBACK_RATE = 2000; // 20% (2000/10000)
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MIN_STAKE = 0.01 ether; // Minimum stake amount

    // State variables
    address public roundManager;
    address public treasury;
    
    // Round ID => direction => total stake
    mapping(uint256 => mapping(PredictionDirection => uint256)) public roundStakes;
    
    // Round ID => user => stake info
    mapping(uint256 => mapping(address => UserStake)) public userStakes;
    
    // Round ID => resolved status
    mapping(uint256 => bool) public roundResolved;
    
    // Round ID => winning direction
    mapping(uint256 => PredictionDirection) public roundWinners;
    
    // Round ID => cancelled status
    mapping(uint256 => bool) public roundCancelled;

    modifier onlyRoundManager() {
        require(msg.sender == roundManager, "Only round manager can call");
        _;
    }

    modifier validRound(uint256 roundId) {
        require(roundId > 0, "Invalid round ID");
        _;
    }

    modifier notResolved(uint256 roundId) {
        require(!roundResolved[roundId], "Round already resolved");
        require(!roundCancelled[roundId], "Round cancelled");
        _;
    }

    constructor(address _roundManager, address _treasury) Ownable(msg.sender) {
        roundManager = _roundManager;
        treasury = _treasury;
    }

    /**
     * @dev Stake POL to follow AI prediction
     */
    function stakeFollow(uint256 roundId) 
        external 
        payable 
        validRound(roundId) 
        notResolved(roundId) 
        whenNotPaused 
        nonReentrant 
    {
        require(msg.value >= MIN_STAKE, "Stake below minimum");
        require(userStakes[roundId][msg.sender].amount == 0, "Already staked in this round");

        userStakes[roundId][msg.sender] = UserStake({
            amount: msg.value,
            direction: PredictionDirection.UP, // Follow AI (assuming AI predicts UP for this example)
            claimed: false,
            reward: 0
        });

        roundStakes[roundId][PredictionDirection.UP] += msg.value;

        emit StakePlaced(roundId, msg.sender, msg.value, PredictionDirection.UP);
    }

    /**
     * @dev Stake POL to counter AI prediction
     */
    function stakeCounter(uint256 roundId) 
        external 
        payable 
        validRound(roundId) 
        notResolved(roundId) 
        whenNotPaused 
        nonReentrant 
    {
        require(msg.value >= MIN_STAKE, "Stake below minimum");
        require(userStakes[roundId][msg.sender].amount == 0, "Already staked in this round");

        userStakes[roundId][msg.sender] = UserStake({
            amount: msg.value,
            direction: PredictionDirection.DOWN, // Counter AI (assuming AI predicts UP)
            claimed: false,
            reward: 0
        });

        roundStakes[roundId][PredictionDirection.DOWN] += msg.value;

        emit StakePlaced(roundId, msg.sender, msg.value, PredictionDirection.DOWN);
    }

    /**
     * @dev Claim reward for winning prediction
     */
    function claimReward(uint256 roundId) 
        external 
        validRound(roundId) 
        whenNotPaused 
        nonReentrant 
    {
        require(roundResolved[roundId], "Round not resolved");
        
        UserStake storage stake = userStakes[roundId][msg.sender];
        require(stake.amount > 0, "No stake found");
        require(!stake.claimed, "Already claimed");
        require(stake.direction == roundWinners[roundId], "Not a winner");

        uint256 reward = calculateReward(roundId, msg.sender);
        require(reward > 0, "No reward to claim");

        stake.claimed = true;
        stake.reward = reward;

        (bool success, ) = payable(msg.sender).call{value: reward}("");
        require(success, "Reward transfer failed");

        emit RewardClaimed(roundId, msg.sender, reward);
    }

    /**
     * @dev Claim cashback for losing prediction
     */
    function claimCashback(uint256 roundId) 
        external 
        validRound(roundId) 
        whenNotPaused 
        nonReentrant 
    {
        require(roundResolved[roundId], "Round not resolved");
        
        UserStake storage stake = userStakes[roundId][msg.sender];
        require(stake.amount > 0, "No stake found");
        require(!stake.claimed, "Already claimed");
        require(stake.direction != roundWinners[roundId], "Winner cannot claim cashback");

        uint256 cashback = calculateCashback(roundId, msg.sender);
        require(cashback > 0, "No cashback to claim");

        stake.claimed = true;

        (bool success, ) = payable(msg.sender).call{value: cashback}("");
        require(success, "Cashback transfer failed");

        emit CashbackClaimed(roundId, msg.sender, cashback);
    }

    /**
     * @dev Resolve round (called by RoundManager)
     */
    function resolveRound(uint256 roundId, PredictionDirection winningDirection) 
        external 
        onlyRoundManager 
        validRound(roundId) 
        notResolved(roundId) 
    {
        roundResolved[roundId] = true;
        roundWinners[roundId] = winningDirection;

        // Transfer platform fee to treasury
        uint256 totalPool = getTotalStake(roundId);
        uint256 platformFee = (totalPool * PLATFORM_FEE_RATE) / BASIS_POINTS;
        
        if (platformFee > 0) {
            (bool success, ) = payable(treasury).call{value: platformFee}("");
            require(success, "Platform fee transfer failed");
        }
    }

    /**
     * @dev Cancel round and refund stakes
     */
    function cancelRound(uint256 roundId) 
        external 
        onlyRoundManager 
        validRound(roundId) 
        notResolved(roundId) 
    {
        roundCancelled[roundId] = true;
        // Users can claim full refund when round is cancelled
    }

    /**
     * @dev Calculate reward for a user
     */
    function calculateReward(uint256 roundId, address user) 
        public 
        view 
        returns (uint256) 
    {
        if (!roundResolved[roundId]) return 0;
        
        UserStake memory stake = userStakes[roundId][user];
        if (stake.amount == 0 || stake.direction != roundWinners[roundId]) return 0;

        uint256 totalPool = getTotalStake(roundId);
        uint256 winningPool = roundStakes[roundId][roundWinners[roundId]];
        
        if (winningPool == 0) return 0;

        // userReward = (userStake / totalWinningPool) × (totalPool × 0.98)
        uint256 rewardPool = (totalPool * (BASIS_POINTS - PLATFORM_FEE_RATE)) / BASIS_POINTS;
        return (stake.amount * rewardPool) / winningPool;
    }

    /**
     * @dev Calculate cashback for a losing user
     */
    function calculateCashback(uint256 roundId, address user) 
        public 
        view 
        returns (uint256) 
    {
        if (!roundResolved[roundId]) return 0;
        
        UserStake memory stake = userStakes[roundId][user];
        if (stake.amount == 0 || stake.direction == roundWinners[roundId]) return 0;

        return (stake.amount * CASHBACK_RATE) / BASIS_POINTS;
    }

    /**
     * @dev Get total stake for a round
     */
    function getTotalStake(uint256 roundId) public view returns (uint256) {
        return roundStakes[roundId][PredictionDirection.UP] + 
               roundStakes[roundId][PredictionDirection.DOWN];
    }

    /**
     * @dev Get round stakes
     */
    function getRoundStakes(uint256 roundId) 
        external 
        view 
        returns (uint256 followStake, uint256 counterStake) 
    {
        return (
            roundStakes[roundId][PredictionDirection.UP],
            roundStakes[roundId][PredictionDirection.DOWN]
        );
    }

    /**
     * @dev Get user stake info
     */
    function getUserStake(uint256 roundId, address user) 
        external 
        view 
        returns (UserStake memory) 
    {
        return userStakes[roundId][user];
    }

    /**
     * @dev Update round manager address
     */
    function updateRoundManager(address _roundManager) external onlyOwner {
        require(_roundManager != address(0), "Invalid address");
        roundManager = _roundManager;
    }

    /**
     * @dev Update treasury address
     */
    function updateTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid address");
        treasury = _treasury;
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

    /**
     * @dev Emergency withdrawal (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}
