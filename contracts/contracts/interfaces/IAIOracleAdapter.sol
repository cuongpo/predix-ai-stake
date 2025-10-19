// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAIOracleAdapter {
    enum PredictionDirection {
        UP,
        DOWN
    }

    struct AIPrediction {
        uint256 roundId;
        PredictionDirection direction;
        bytes32 signatureHash;
        uint256 timestamp;
        bool verified;
    }

    event PredictionSubmitted(
        uint256 indexed roundId,
        PredictionDirection direction,
        bytes32 signatureHash,
        uint256 timestamp
    );

    event PredictionVerified(
        uint256 indexed roundId,
        bytes32 signatureHash,
        bool isValid
    );

    function submitPrediction(
        uint256 roundId,
        PredictionDirection direction,
        bytes32 signatureHash
    ) external;

    function verifyPrediction(
        uint256 roundId,
        bytes calldata signature,
        bytes calldata predictionData
    ) external returns (bool);

    function getPrediction(uint256 roundId) external view returns (AIPrediction memory);
    function updateAIOperator(address newOperator) external;
}
