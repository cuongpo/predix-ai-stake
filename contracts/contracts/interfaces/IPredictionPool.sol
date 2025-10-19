// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPredictionPool {
    enum PredictionDirection {
        UP,
        DOWN
    }

    struct UserStake {
        uint256 amount;
        PredictionDirection direction;
        bool claimed;
        uint256 reward;
    }

    event StakePlaced(
        uint256 indexed roundId,
        address indexed user,
        uint256 amount,
        PredictionDirection direction
    );

    event RewardClaimed(
        uint256 indexed roundId,
        address indexed user,
        uint256 reward
    );

    event CashbackClaimed(
        uint256 indexed roundId,
        address indexed user,
        uint256 cashback
    );

    function stakeFollow(uint256 roundId) external payable;
    function stakeCounter(uint256 roundId) external payable;
    function claimReward(uint256 roundId) external;
    function claimCashback(uint256 roundId) external;
    function resolveRound(uint256 roundId, PredictionDirection winningDirection) external;
    function cancelRound(uint256 roundId) external;
    function getRoundStakes(uint256 roundId) external view returns (uint256 followStake, uint256 counterStake);
    function getUserStake(uint256 roundId, address user) external view returns (UserStake memory);
    function calculateReward(uint256 roundId, address user) external view returns (uint256);
    function calculateCashback(uint256 roundId, address user) external view returns (uint256);
}
