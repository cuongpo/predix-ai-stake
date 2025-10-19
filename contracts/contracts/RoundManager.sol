// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IPredictionPool.sol";
import "./interfaces/IOracleHandler.sol";
import "./interfaces/IAIOracleAdapter.sol";

/**
 * @title RoundManager
 * @dev Manages prediction rounds for PREDIX AI
 */
contract RoundManager is Ownable, ReentrancyGuard, Pausable {
    enum RoundPhase {
        Created,
        Voting,
        Frozen,
        Resolved,
        Cancelled
    }

    enum PredictionDirection {
        UP,
        DOWN
    }

    struct Round {
        uint256 id;
        uint256 startTime;
        uint256 votingEndTime;
        uint256 freezeEndTime;
        uint256 resolutionTime;
        PredictionDirection aiPrediction;
        bytes32 aiSignatureHash;
        uint256 startPrice;
        uint256 endPrice;
        RoundPhase phase;
        bool resolved;
        PredictionDirection winningDirection;
        uint256 totalFollowStake;
        uint256 totalCounterStake;
    }

    // Constants
    uint256 public constant VOTING_DURATION = 5 minutes;
    uint256 public constant FREEZE_DURATION = 5 minutes;
    uint256 public constant RESOLUTION_DURATION = 1 minutes;
    uint256 public constant ROUND_INTERVAL = 10 minutes;

    // State variables
    uint256 public currentRoundId;
    mapping(uint256 => Round) public rounds;
    mapping(uint256 => bool) public roundExists;

    // Contract interfaces
    IPredictionPool public predictionPool;
    IOracleHandler public oracleHandler;
    IAIOracleAdapter public aiOracleAdapter;

    // Events
    event RoundCreated(
        uint256 indexed roundId,
        uint256 startTime,
        PredictionDirection aiPrediction,
        bytes32 aiSignatureHash,
        uint256 startPrice
    );
    
    event RoundPhaseChanged(
        uint256 indexed roundId,
        RoundPhase oldPhase,
        RoundPhase newPhase
    );
    
    event RoundResolved(
        uint256 indexed roundId,
        PredictionDirection winningDirection,
        uint256 endPrice,
        uint256 totalFollowStake,
        uint256 totalCounterStake
    );

    event RoundCancelled(uint256 indexed roundId, string reason);

    modifier onlyValidRound(uint256 roundId) {
        require(roundExists[roundId], "Round does not exist");
        _;
    }

    modifier onlyAIOracle() {
        require(msg.sender == address(aiOracleAdapter), "Only AI oracle can call");
        _;
    }

    constructor(
        address _predictionPool,
        address _oracleHandler,
        address _aiOracleAdapter
    ) Ownable(msg.sender) {
        predictionPool = IPredictionPool(_predictionPool);
        oracleHandler = IOracleHandler(_oracleHandler);
        aiOracleAdapter = IAIOracleAdapter(_aiOracleAdapter);
        currentRoundId = 0;
    }

    /**
     * @dev Creates a new prediction round
     * @param aiPrediction The AI's prediction (UP or DOWN)
     * @param aiSignatureHash Hash of the AI's prediction signature
     */
    function createRound(
        PredictionDirection aiPrediction,
        bytes32 aiSignatureHash
    ) external onlyAIOracle whenNotPaused nonReentrant {
        require(
            currentRoundId == 0 || 
            block.timestamp >= rounds[currentRoundId].startTime + ROUND_INTERVAL,
            "Cannot create round yet"
        );

        uint256 startPrice = oracleHandler.getLatestPrice();
        require(startPrice > 0, "Invalid start price");

        currentRoundId++;
        uint256 roundId = currentRoundId;

        rounds[roundId] = Round({
            id: roundId,
            startTime: block.timestamp,
            votingEndTime: block.timestamp + VOTING_DURATION,
            freezeEndTime: block.timestamp + VOTING_DURATION + FREEZE_DURATION,
            resolutionTime: block.timestamp + VOTING_DURATION + FREEZE_DURATION + RESOLUTION_DURATION,
            aiPrediction: aiPrediction,
            aiSignatureHash: aiSignatureHash,
            startPrice: startPrice,
            endPrice: 0,
            phase: RoundPhase.Voting,
            resolved: false,
            winningDirection: PredictionDirection.UP, // Default, will be set on resolution
            totalFollowStake: 0,
            totalCounterStake: 0
        });

        roundExists[roundId] = true;

        emit RoundCreated(roundId, block.timestamp, aiPrediction, aiSignatureHash, startPrice);
        emit RoundPhaseChanged(roundId, RoundPhase.Created, RoundPhase.Voting);
    }

    /**
     * @dev Advances round to freeze phase
     */
    function freezeRound(uint256 roundId) external onlyValidRound(roundId) {
        Round storage round = rounds[roundId];
        require(round.phase == RoundPhase.Voting, "Round not in voting phase");
        require(block.timestamp >= round.votingEndTime, "Voting period not ended");

        round.phase = RoundPhase.Frozen;
        emit RoundPhaseChanged(roundId, RoundPhase.Voting, RoundPhase.Frozen);
    }

    /**
     * @dev Resolves a round by determining the winner
     */
    function resolveRound(uint256 roundId) external onlyValidRound(roundId) nonReentrant {
        Round storage round = rounds[roundId];
        require(round.phase == RoundPhase.Frozen, "Round not in frozen phase");
        require(block.timestamp >= round.resolutionTime, "Resolution time not reached");
        require(!round.resolved, "Round already resolved");

        uint256 endPrice = oracleHandler.getLatestPrice();
        require(endPrice > 0, "Invalid end price");

        round.endPrice = endPrice;
        round.resolved = true;
        round.phase = RoundPhase.Resolved;

        // Determine winning direction
        bool priceWentUp = endPrice > round.startPrice;
        bool aiWasCorrect = (priceWentUp && round.aiPrediction == PredictionDirection.UP) ||
                           (!priceWentUp && round.aiPrediction == PredictionDirection.DOWN);

        round.winningDirection = aiWasCorrect ? round.aiPrediction : 
            (round.aiPrediction == PredictionDirection.UP ? PredictionDirection.DOWN : PredictionDirection.UP);

        // Get final stake amounts from prediction pool
        (uint256 followStake, uint256 counterStake) = predictionPool.getRoundStakes(roundId);
        round.totalFollowStake = followStake;
        round.totalCounterStake = counterStake;

        // Notify prediction pool of resolution
        IPredictionPool.PredictionDirection poolDirection = round.winningDirection == PredictionDirection.UP ?
            IPredictionPool.PredictionDirection.UP : IPredictionPool.PredictionDirection.DOWN;
        predictionPool.resolveRound(roundId, poolDirection);

        emit RoundResolved(roundId, round.winningDirection, endPrice, followStake, counterStake);
        emit RoundPhaseChanged(roundId, RoundPhase.Frozen, RoundPhase.Resolved);
    }

    /**
     * @dev Cancels a round (emergency function)
     */
    function cancelRound(uint256 roundId, string calldata reason) 
        external 
        onlyOwner 
        onlyValidRound(roundId) 
    {
        Round storage round = rounds[roundId];
        require(!round.resolved, "Cannot cancel resolved round");

        round.phase = RoundPhase.Cancelled;
        predictionPool.cancelRound(roundId);

        emit RoundCancelled(roundId, reason);
        emit RoundPhaseChanged(roundId, round.phase, RoundPhase.Cancelled);
    }

    /**
     * @dev Gets round information
     */
    function getRound(uint256 roundId) external view returns (Round memory) {
        require(roundExists[roundId], "Round does not exist");
        return rounds[roundId];
    }

    /**
     * @dev Gets current round phase
     */
    function getCurrentPhase(uint256 roundId) external view returns (RoundPhase) {
        require(roundExists[roundId], "Round does not exist");
        Round memory round = rounds[roundId];
        
        if (round.phase == RoundPhase.Cancelled || round.phase == RoundPhase.Resolved) {
            return round.phase;
        }

        if (block.timestamp < round.votingEndTime) {
            return RoundPhase.Voting;
        } else if (block.timestamp < round.resolutionTime) {
            return RoundPhase.Frozen;
        } else {
            return RoundPhase.Resolved;
        }
    }

    /**
     * @dev Updates contract addresses (only owner)
     */
    function updateContracts(
        address _predictionPool,
        address _oracleHandler,
        address _aiOracleAdapter
    ) external onlyOwner {
        if (_predictionPool != address(0)) predictionPool = IPredictionPool(_predictionPool);
        if (_oracleHandler != address(0)) oracleHandler = IOracleHandler(_oracleHandler);
        if (_aiOracleAdapter != address(0)) aiOracleAdapter = IAIOracleAdapter(_aiOracleAdapter);
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
