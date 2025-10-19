// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IOracleHandler {
    event PriceUpdated(uint256 newPrice, uint256 timestamp);

    function getLatestPrice() external view returns (uint256);
    function getPriceAtTimestamp(uint256 timestamp) external view returns (uint256);
    function updatePriceFeed(address newPriceFeed) external;
    function validatePrice(uint256 price) external view returns (bool);
}
