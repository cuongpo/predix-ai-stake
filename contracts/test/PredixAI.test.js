const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("PREDIX AI System", function () {
  let roundManager, predictionPool, oracleHandler, rewardManager, aiOracleAdapter;
  let owner, aiOperator, user1, user2, treasury;
  let mockPriceFeed;

  const VOTING_DURATION = 5 * 60; // 5 minutes
  const FREEZE_DURATION = 5 * 60; // 5 minutes
  const RESOLUTION_DURATION = 1 * 60; // 1 minute

  beforeEach(async function () {
    [owner, aiOperator, user1, user2, treasury] = await ethers.getSigners();

    // Deploy Mock Price Feed
    const MockPriceFeed = await ethers.getContractFactory("MockV3Aggregator");
    mockPriceFeed = await MockPriceFeed.deploy(8, ethers.utils.parseUnits("1.5", 8)); // $1.50 POL
    await mockPriceFeed.deployed();

    // Deploy OracleHandler
    const OracleHandler = await ethers.getContractFactory("OracleHandler");
    oracleHandler = await OracleHandler.deploy(mockPriceFeed.address);
    await oracleHandler.deployed();

    // Deploy AIOracleAdapter
    const AIOracleAdapter = await ethers.getContractFactory("AIOracleAdapter");
    aiOracleAdapter = await AIOracleAdapter.deploy(
      aiOperator.address,
      ethers.constants.AddressZero
    );
    await aiOracleAdapter.deployed();

    // Deploy RewardManager
    const RewardManager = await ethers.getContractFactory("RewardManager");
    rewardManager = await RewardManager.deploy(
      ethers.constants.AddressZero,
      treasury.address
    );
    await rewardManager.deployed();

    // Deploy PredictionPool
    const PredictionPool = await ethers.getContractFactory("PredictionPool");
    predictionPool = await PredictionPool.deploy(
      ethers.constants.AddressZero,
      treasury.address
    );
    await predictionPool.deployed();

    // Deploy RoundManager
    const RoundManager = await ethers.getContractFactory("RoundManager");
    roundManager = await RoundManager.deploy(
      predictionPool.address,
      oracleHandler.address,
      aiOracleAdapter.address
    );
    await roundManager.deployed();

    // Update contract addresses
    await predictionPool.updateRoundManager(roundManager.address);
    await aiOracleAdapter.updateRoundManager(roundManager.address);
    await rewardManager.updatePredictionPool(predictionPool.address);
  });

  describe("Oracle Integration", function () {
    it("Should get latest price from Chainlink feed", async function () {
      const price = await oracleHandler.getLatestPrice();
      expect(price).to.equal(ethers.utils.parseEther("1.5"));
    });

    it("Should validate price changes", async function () {
      const currentPrice = ethers.utils.parseEther("1.5");
      const validPrice = ethers.utils.parseEther("1.6"); // 6.67% increase
      const invalidPrice = ethers.utils.parseEther("2.0"); // 33% increase

      // Store current price first
      await oracleHandler.storeHistoricalPrice(await time.latest(), currentPrice);

      expect(await oracleHandler.validatePrice(validPrice)).to.be.true;
      expect(await oracleHandler.validatePrice(invalidPrice)).to.be.false;
    });

    it("Should handle price feed updates", async function () {
      const newMockFeed = await ethers.getContractFactory("MockV3Aggregator");
      const newFeed = await newMockFeed.deploy(8, ethers.utils.parseUnits("1.6", 8));
      await newFeed.deployed();

      await oracleHandler.updatePriceFeed(newFeed.address);
      const newPrice = await oracleHandler.getLatestPrice();
      expect(newPrice).to.equal(ethers.utils.parseEther("1.6"));
    });
  });

  describe("Round Management", function () {
    it("Should create a new round", async function () {
      const aiPrediction = 0; // UP
      const signatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));

      await aiOracleAdapter.connect(aiOperator).createRound(aiPrediction, signatureHash);

      const currentRoundId = await roundManager.currentRoundId();
      expect(currentRoundId).to.equal(1);

      const round = await roundManager.getRound(1);
      expect(round.aiPrediction).to.equal(aiPrediction);
      expect(round.aiSignatureHash).to.equal(signatureHash);
    });

    it("Should allow users to stake POL", async function () {
      // Create round
      await aiOracleAdapter.connect(aiOperator).createRound(0, ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test")));

      // User stakes to follow AI
      const stakeAmount = ethers.utils.parseEther("1.0");
      await predictionPool.connect(user1).stakeFollow(1, { value: stakeAmount });

      const userStake = await predictionPool.getUserStake(1, user1.address);
      expect(userStake.amount).to.equal(stakeAmount);
      expect(userStake.direction).to.equal(0); // UP/Follow
    });

    it("Should complete full round cycle", async function () {
      // Create round
      await aiOracleAdapter.connect(aiOperator).createRound(0, ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test")));

      // Users stake
      await predictionPool.connect(user1).stakeFollow(1, { value: ethers.utils.parseEther("1.0") });
      await predictionPool.connect(user2).stakeCounter(1, { value: ethers.utils.parseEther("0.5") });

      // Advance time to freeze phase
      await time.increase(VOTING_DURATION + 1);
      await roundManager.freezeRound(1);

      // Update price to simulate movement
      await mockPriceFeed.updateAnswer(ethers.utils.parseUnits("1.6", 8)); // Price went UP

      // Advance time to resolution
      await time.increase(FREEZE_DURATION + RESOLUTION_DURATION + 1);
      await roundManager.resolveRound(1);

      const round = await roundManager.getRound(1);
      expect(round.resolved).to.be.true;
      expect(round.winningDirection).to.equal(0); // UP won
    });

    it("Should calculate rewards correctly", async function () {
      // Create round and stake
      await aiOracleAdapter.connect(aiOperator).createRound(0, ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test")));
      await predictionPool.connect(user1).stakeFollow(1, { value: ethers.utils.parseEther("1.0") });
      await predictionPool.connect(user2).stakeCounter(1, { value: ethers.utils.parseEther("1.0") });

      // Complete round (AI prediction UP wins)
      await time.increase(VOTING_DURATION + 1);
      await roundManager.freezeRound(1);
      await mockPriceFeed.updateAnswer(ethers.utils.parseUnits("1.6", 8));
      await time.increase(FREEZE_DURATION + RESOLUTION_DURATION + 1);
      await roundManager.resolveRound(1);

      // Check reward calculation
      const reward = await predictionPool.calculateReward(1, user1.address);
      const totalPool = ethers.utils.parseEther("2.0");
      const expectedReward = totalPool.mul(98).div(100); // 98% of total pool (2% fee)
      
      expect(reward).to.equal(expectedReward);
    });

    it("Should handle cashback for losers", async function () {
      // Create round and stake
      await aiOracleAdapter.connect(aiOperator).createRound(0, ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test")));
      await predictionPool.connect(user1).stakeFollow(1, { value: ethers.utils.parseEther("1.0") });
      await predictionPool.connect(user2).stakeCounter(1, { value: ethers.utils.parseEther("1.0") });

      // Complete round (AI prediction UP wins, so counter loses)
      await time.increase(VOTING_DURATION + 1);
      await roundManager.freezeRound(1);
      await mockPriceFeed.updateAnswer(ethers.utils.parseUnits("1.6", 8));
      await time.increase(FREEZE_DURATION + RESOLUTION_DURATION + 1);
      await roundManager.resolveRound(1);

      // Check cashback for loser
      const cashback = await predictionPool.calculateCashback(1, user2.address);
      const expectedCashback = ethers.utils.parseEther("1.0").mul(20).div(100); // 20% cashback
      
      expect(cashback).to.equal(expectedCashback);
    });
  });

  describe("Security Tests", function () {
    it("Should prevent unauthorized round creation", async function () {
      await expect(
        aiOracleAdapter.connect(user1).createRound(0, ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test")))
      ).to.be.revertedWith("Only AI operator can call");
    });

    it("Should prevent double staking in same round", async function () {
      await aiOracleAdapter.connect(aiOperator).createRound(0, ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test")));
      
      await predictionPool.connect(user1).stakeFollow(1, { value: ethers.utils.parseEther("1.0") });
      
      await expect(
        predictionPool.connect(user1).stakeFollow(1, { value: ethers.utils.parseEther("1.0") })
      ).to.be.revertedWith("Already staked in this round");
    });

    it("Should prevent staking below minimum", async function () {
      await aiOracleAdapter.connect(aiOperator).createRound(0, ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test")));
      
      await expect(
        predictionPool.connect(user1).stakeFollow(1, { value: ethers.utils.parseEther("0.005") })
      ).to.be.revertedWith("Stake below minimum");
    });

    it("Should prevent claiming rewards twice", async function () {
      // Setup and complete winning round
      await aiOracleAdapter.connect(aiOperator).createRound(0, ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test")));
      await predictionPool.connect(user1).stakeFollow(1, { value: ethers.utils.parseEther("1.0") });
      
      await time.increase(VOTING_DURATION + 1);
      await roundManager.freezeRound(1);
      await mockPriceFeed.updateAnswer(ethers.utils.parseUnits("1.6", 8));
      await time.increase(FREEZE_DURATION + RESOLUTION_DURATION + 1);
      await roundManager.resolveRound(1);

      // Claim reward first time
      await predictionPool.connect(user1).claimReward(1);

      // Try to claim again
      await expect(
        predictionPool.connect(user1).claimReward(1)
      ).to.be.revertedWith("Already claimed");
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to pause contracts", async function () {
      await roundManager.pause();
      
      await expect(
        aiOracleAdapter.connect(aiOperator).createRound(0, ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test")))
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should allow emergency price updates", async function () {
      const emergencyPrice = ethers.utils.parseEther("1.8");
      await oracleHandler.emergencyPriceUpdate(emergencyPrice);
      
      // Note: This doesn't change the mock feed, but updates internal tracking
      const lastPrice = await oracleHandler.lastPrice();
      expect(lastPrice).to.equal(emergencyPrice);
    });

    it("Should allow round cancellation", async function () {
      await aiOracleAdapter.connect(aiOperator).createRound(0, ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test")));
      
      await roundManager.cancelRound(1, "Emergency cancellation");
      
      const round = await roundManager.getRound(1);
      expect(round.phase).to.equal(4); // Cancelled phase
    });
  });
});
