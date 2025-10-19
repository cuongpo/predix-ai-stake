// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./interfaces/IOracleHandler.sol";

/**
 * @title OracleHandler
 * @dev Handles Chainlink POL/USD price feed integration for PREDIX AI
 */
contract OracleHandler is IOracleHandler, Ownable {
    AggregatorV3Interface public priceFeed;
    
    // Price validation parameters
    uint256 public constant MAX_PRICE_DEVIATION = 1000; // 10% (1000/10000)
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant PRICE_FRESHNESS_THRESHOLD = 3600; // 1 hour in seconds
    
    // Historical price storage
    struct PriceData {
        uint256 price;
        uint256 timestamp;
        uint80 roundId;
    }
    
    mapping(uint256 => PriceData) public historicalPrices;
    uint256 public lastUpdateTimestamp;
    uint256 public lastPrice;
    
    event PriceFeedUpdated(address indexed oldFeed, address indexed newFeed);
    event PriceValidationFailed(uint256 price, uint256 timestamp, string reason);

    modifier validPriceFeed() {
        require(address(priceFeed) != address(0), "Price feed not set");
        _;
    }

    constructor(address _priceFeed) Ownable(msg.sender) {
        require(_priceFeed != address(0), "Invalid price feed address");
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    /**
     * @dev Get the latest POL/USD price from Chainlink
     * @return price The latest price scaled to 18 decimals
     */
    function getLatestPrice() external view override validPriceFeed returns (uint256) {
        (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();

        require(price > 0, "Invalid price from oracle");
        require(updatedAt > 0, "Price data not available");
        require(block.timestamp - updatedAt <= PRICE_FRESHNESS_THRESHOLD, "Price data too old");
        require(answeredInRound >= roundId, "Stale price data");

        // Convert price to 18 decimals
        uint8 decimals = priceFeed.decimals();
        uint256 scaledPrice = uint256(price);
        
        if (decimals < 18) {
            scaledPrice = scaledPrice * (10 ** (18 - decimals));
        } else if (decimals > 18) {
            scaledPrice = scaledPrice / (10 ** (decimals - 18));
        }

        return scaledPrice;
    }

    /**
     * @dev Get price at a specific timestamp (approximation using historical data)
     * @param timestamp The timestamp to get price for
     * @return price The price at the given timestamp
     */
    function getPriceAtTimestamp(uint256 timestamp) external view override returns (uint256) {
        require(timestamp <= block.timestamp, "Cannot get future price");
        
        // If we have exact historical data, return it
        if (historicalPrices[timestamp].timestamp == timestamp) {
            return historicalPrices[timestamp].price;
        }
        
        // Otherwise, return the latest price as approximation
        // In production, this would use more sophisticated historical data lookup
        return this.getLatestPrice();
    }

    /**
     * @dev Update the Chainlink price feed address
     * @param newPriceFeed The new price feed contract address
     */
    function updatePriceFeed(address newPriceFeed) external override onlyOwner {
        require(newPriceFeed != address(0), "Invalid price feed address");
        
        address oldFeed = address(priceFeed);
        priceFeed = AggregatorV3Interface(newPriceFeed);
        
        emit PriceFeedUpdated(oldFeed, newPriceFeed);
    }

    /**
     * @dev Validate if a price is reasonable
     * @param price The price to validate
     * @return isValid True if price is valid
     */
    function validatePrice(uint256 price) external view override returns (bool) {
        if (price == 0) return false;
        
        // If we have a previous price, check deviation
        if (lastPrice > 0) {
            uint256 deviation;
            if (price > lastPrice) {
                deviation = ((price - lastPrice) * BASIS_POINTS) / lastPrice;
            } else {
                deviation = ((lastPrice - price) * BASIS_POINTS) / lastPrice;
            }
            
            if (deviation > MAX_PRICE_DEVIATION) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * @dev Store historical price data (called by authorized contracts)
     * @param timestamp The timestamp of the price
     * @param price The price to store
     */
    function storeHistoricalPrice(uint256 timestamp, uint256 price) external onlyOwner {
        require(timestamp <= block.timestamp, "Cannot store future price");
        require(price > 0, "Invalid price");
        
        historicalPrices[timestamp] = PriceData({
            price: price,
            timestamp: timestamp,
            roundId: 0 // Could be populated with actual round ID if needed
        });
        
        lastUpdateTimestamp = timestamp;
        lastPrice = price;
        
        emit PriceUpdated(price, timestamp);
    }

    /**
     * @dev Get price feed information
     * @return feedAddress The address of the current price feed
     * @return decimals The number of decimals in the price feed
     * @return description The description of the price feed
     */
    function getPriceFeedInfo() external view validPriceFeed returns (
        address feedAddress,
        uint8 decimals,
        string memory description
    ) {
        return (
            address(priceFeed),
            priceFeed.decimals(),
            priceFeed.description()
        );
    }

    /**
     * @dev Get the latest round data from Chainlink
     * @return roundId The round ID
     * @return price The price
     * @return startedAt When the round started
     * @return updatedAt When the round was updated
     * @return answeredInRound The round ID when the answer was computed
     */
    function getLatestRoundData() external view validPriceFeed returns (
        uint80 roundId,
        int256 price,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return priceFeed.latestRoundData();
    }

    /**
     * @dev Get historical round data from Chainlink
     * @param _roundId The round ID to get data for
     * @return roundId The round ID
     * @return price The price
     * @return startedAt When the round started
     * @return updatedAt When the round was updated
     * @return answeredInRound The round ID when the answer was computed
     */
    function getRoundData(uint80 _roundId) external view validPriceFeed returns (
        uint80 roundId,
        int256 price,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return priceFeed.getRoundData(_roundId);
    }

    /**
     * @dev Emergency function to validate and update price manually
     * @param price The price to validate and potentially store
     */
    function emergencyPriceUpdate(uint256 price) external onlyOwner {
        require(price > 0, "Invalid price");
        
        if (!this.validatePrice(price)) {
            emit PriceValidationFailed(price, block.timestamp, "Price deviation too high");
            return;
        }
        
        lastPrice = price;
        lastUpdateTimestamp = block.timestamp;
        
        emit PriceUpdated(price, block.timestamp);
    }

    /**
     * @dev Check if price feed is healthy
     * @return isHealthy True if price feed is responding correctly
     */
    function isPriceFeedHealthy() external view validPriceFeed returns (bool) {
        try priceFeed.latestRoundData() returns (
            uint80,
            int256 price,
            uint256,
            uint256 updatedAt,
            uint80
        ) {
            return (
                price > 0 && 
                updatedAt > 0 && 
                block.timestamp - updatedAt <= PRICE_FRESHNESS_THRESHOLD
            );
        } catch {
            return false;
        }
    }
}
