// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./interfaces/IAIOracleAdapter.sol";

/**
 * @title AIOracleAdapter
 * @dev Handles AI prediction verification and on-chain storage for PREDIX AI
 */
contract AIOracleAdapter is IAIOracleAdapter, Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // AI operator address (authorized to submit predictions)
    address public aiOperator;
    
    // Round manager contract
    address public roundManager;
    
    // Storage for AI predictions
    mapping(uint256 => AIPrediction) public predictions;
    mapping(uint256 => bool) public predictionExists;
    
    // Nonce for replay protection
    mapping(address => uint256) public nonces;
    
    // Prediction verification settings
    uint256 public constant PREDICTION_VALIDITY_PERIOD = 15 minutes;
    
    modifier onlyAIOperator() {
        require(msg.sender == aiOperator, "Only AI operator can call");
        _;
    }
    
    modifier onlyRoundManager() {
        require(msg.sender == roundManager, "Only round manager can call");
        _;
    }
    
    modifier validRound(uint256 roundId) {
        require(roundId > 0, "Invalid round ID");
        _;
    }

    constructor(address _aiOperator, address _roundManager) Ownable(msg.sender) {
        require(_aiOperator != address(0), "Invalid AI operator address");
        require(_roundManager != address(0), "Invalid round manager address");
        
        aiOperator = _aiOperator;
        roundManager = _roundManager;
    }

    /**
     * @dev Submit AI prediction for a round
     * @param roundId The round ID
     * @param direction The predicted direction (UP or DOWN)
     * @param signatureHash Hash of the prediction signature for verification
     */
    function submitPrediction(
        uint256 roundId,
        PredictionDirection direction,
        bytes32 signatureHash
    ) external override onlyAIOperator validRound(roundId) {
        require(!predictionExists[roundId], "Prediction already exists for this round");
        require(signatureHash != bytes32(0), "Invalid signature hash");

        predictions[roundId] = AIPrediction({
            roundId: roundId,
            direction: direction,
            signatureHash: signatureHash,
            timestamp: block.timestamp,
            verified: false
        });
        
        predictionExists[roundId] = true;

        emit PredictionSubmitted(roundId, direction, signatureHash, block.timestamp);
    }

    /**
     * @dev Verify AI prediction using cryptographic signature
     * @param roundId The round ID to verify
     * @param signature The signature to verify
     * @param predictionData The original prediction data
     * @return isValid True if prediction is valid
     */
    function verifyPrediction(
        uint256 roundId,
        bytes calldata signature,
        bytes calldata predictionData
    ) external override validRound(roundId) returns (bool) {
        require(predictionExists[roundId], "Prediction does not exist");
        
        AIPrediction storage prediction = predictions[roundId];
        require(!prediction.verified, "Prediction already verified");
        require(
            block.timestamp <= prediction.timestamp + PREDICTION_VALIDITY_PERIOD,
            "Prediction verification period expired"
        );

        // Reconstruct the message hash
        bytes32 messageHash = keccak256(abi.encodePacked(
            roundId,
            uint8(prediction.direction),
            prediction.timestamp,
            nonces[aiOperator]++
        ));
        
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        
        // Verify signature
        address signer = ethSignedMessageHash.recover(signature);
        bool isValid = (signer == aiOperator);
        
        if (isValid) {
            // Verify the signature hash matches
            bytes32 computedHash = keccak256(signature);
            isValid = (computedHash == prediction.signatureHash);
        }
        
        prediction.verified = isValid;
        
        emit PredictionVerified(roundId, prediction.signatureHash, isValid);
        
        return isValid;
    }

    /**
     * @dev Get AI prediction for a round
     * @param roundId The round ID
     * @return prediction The AI prediction data
     */
    function getPrediction(uint256 roundId) 
        external 
        view 
        override 
        validRound(roundId) 
        returns (AIPrediction memory) 
    {
        require(predictionExists[roundId], "Prediction does not exist");
        return predictions[roundId];
    }

    /**
     * @dev Update AI operator address
     * @param newOperator The new AI operator address
     */
    function updateAIOperator(address newOperator) external override onlyOwner {
        require(newOperator != address(0), "Invalid operator address");
        
        address oldOperator = aiOperator;
        aiOperator = newOperator;
        
        emit AIOperatorUpdated(oldOperator, newOperator);
    }

    /**
     * @dev Update round manager address
     * @param newRoundManager The new round manager address
     */
    function updateRoundManager(address newRoundManager) external onlyOwner {
        require(newRoundManager != address(0), "Invalid round manager address");
        
        address oldRoundManager = roundManager;
        roundManager = newRoundManager;
        
        emit RoundManagerUpdated(oldRoundManager, newRoundManager);
    }

    /**
     * @dev Create prediction hash for off-chain verification
     * @param roundId The round ID
     * @param direction The prediction direction
     * @param timestamp The prediction timestamp
     * @param nonce The nonce for replay protection
     * @return hash The prediction hash
     */
    function createPredictionHash(
        uint256 roundId,
        PredictionDirection direction,
        uint256 timestamp,
        uint256 nonce
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(roundId, uint8(direction), timestamp, nonce));
    }

    /**
     * @dev Batch verify multiple predictions
     * @param roundIds Array of round IDs
     * @param signatures Array of signatures
     * @param predictionDataArray Array of prediction data
     * @return results Array of verification results
     */
    function batchVerifyPredictions(
        uint256[] calldata roundIds,
        bytes[] calldata signatures,
        bytes[] calldata predictionDataArray
    ) external returns (bool[] memory results) {
        require(
            roundIds.length == signatures.length && 
            signatures.length == predictionDataArray.length,
            "Array length mismatch"
        );
        
        results = new bool[](roundIds.length);
        
        for (uint256 i = 0; i < roundIds.length; i++) {
            results[i] = this.verifyPrediction(
                roundIds[i], 
                signatures[i], 
                predictionDataArray[i]
            );
        }
        
        return results;
    }

    /**
     * @dev Get prediction statistics
     * @param fromRound Starting round ID
     * @param toRound Ending round ID
     * @return totalPredictions Total number of predictions
     * @return verifiedPredictions Number of verified predictions
     * @return upPredictions Number of UP predictions
     * @return downPredictions Number of DOWN predictions
     */
    function getPredictionStats(uint256 fromRound, uint256 toRound) 
        external 
        view 
        returns (
            uint256 totalPredictions,
            uint256 verifiedPredictions,
            uint256 upPredictions,
            uint256 downPredictions
        ) 
    {
        require(fromRound <= toRound, "Invalid range");
        
        for (uint256 i = fromRound; i <= toRound; i++) {
            if (predictionExists[i]) {
                totalPredictions++;
                
                AIPrediction memory prediction = predictions[i];
                
                if (prediction.verified) {
                    verifiedPredictions++;
                }
                
                if (prediction.direction == PredictionDirection.UP) {
                    upPredictions++;
                } else {
                    downPredictions++;
                }
            }
        }
    }

    /**
     * @dev Check if prediction is expired
     * @param roundId The round ID to check
     * @return isExpired True if prediction verification period has expired
     */
    function isPredictionExpired(uint256 roundId) external view returns (bool) {
        if (!predictionExists[roundId]) return false;
        
        AIPrediction memory prediction = predictions[roundId];
        return block.timestamp > prediction.timestamp + PREDICTION_VALIDITY_PERIOD;
    }

    /**
     * @dev Get current nonce for an address
     * @param account The account to get nonce for
     * @return nonce The current nonce
     */
    function getNonce(address account) external view returns (uint256) {
        return nonces[account];
    }

    // Events
    event AIOperatorUpdated(address indexed oldOperator, address indexed newOperator);
    event RoundManagerUpdated(address indexed oldManager, address indexed newManager);
}
