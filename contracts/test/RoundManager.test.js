const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("RoundManager", function () {
  let roundManager, predictionPool, oracleHandler, aiOracleAdapter;
  let owner, aiOperator, user1, user2, treasury;
  let mockPriceFeed;

  const VOTING_DURATION = 5 * 60; // 5 minutes
  const FREEZE_DURATION = 5 * 60; // 5 minutes
  const RESOLUTION_DURATION = 1 * 60; // 1 minute

  beforeEach(async function () {
    [owner, aiOperator, user1, user2, treasury] = await ethers.getSigners();

    // Deploy mock price feed
    const MockPriceFeed = await ethers.getContractFactory("MockV3Aggregator");
    mockPriceFeed = await MockPriceFeed.deploy(8, ethers.utils.parseUnits("1.5", 8)); // $1.50 POL
    await mockPriceFeed.deployed();

    // Deploy OracleHandler
    const OracleHandler = await ethers.getContractFactory("OracleHandler");
    oracleHandler = await OracleHandler.deploy(mockPriceFeed.address);
    await oracleHandler.deployed();

    // Deploy PredictionPool
    const PredictionPool = await ethers.getContractFactory("PredictionPool");
    predictionPool = await PredictionPool.deploy(
      ethers.constants.AddressZero, // Will be updated
      treasury.address
    );
    await predictionPool.deployed();

    // Deploy AIOracleAdapter
    const AIOracleAdapter = await ethers.getContractFactory("AIOracleAdapter");
    aiOracleAdapter = await AIOracleAdapter.deploy(
      aiOperator.address,
      ethers.constants.AddressZero // Will be updated
    );
    await aiOracleAdapter.deployed();

    // Deploy RoundManager
    const RoundManager = await ethers.getContractFactory("RoundManager");
    roundManager = await RoundManager.deploy(
      predictionPool.address,
      oracleHandler.address,
      aiOracleAdapter.address
    );
    await roundManager.deployed();

    // Update addresses
    await predictionPool.updateRoundManager(roundManager.address);
    await aiOracleAdapter.updateRoundManager(roundManager.address);
  });

  describe("Round Creation", function () {
    it("Should create a new round with AI prediction", async function () {
      const aiPrediction = 0; // UP
      const signatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));

      await expect(
        aiOracleAdapter.connect(aiOperator).submitPrediction(1, aiPrediction, signatureHash)
      ).to.emit(aiOracleAdapter, "PredictionSubmitted");

      await expect(
        roundManager.connect(aiOperator).createRound(aiPrediction, signatureHash)
      ).to.emit(roundManager, "RoundCreated");

      const round = await roundManager.getRound(1);
      expect(round.id).to.equal(1);
      expect(round.aiPrediction).to.equal(aiPrediction);
      expect(round.phase).to.equal(1); // Voting phase
    });

    it("Should not allow non-AI operator to create rounds", async function () {
      const aiPrediction = 0;
      const signatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));

      await expect(
        roundManager.connect(user1).createRound(aiPrediction, signatureHash)
      ).to.be.revertedWith("Only AI oracle can call");
    });

    it("Should not create round too early", async function () {
      const aiPrediction = 0;
      const signatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));

      // Create first round
      await aiOracleAdapter.connect(aiOperator).submitPrediction(1, aiPrediction, signatureHash);
      await roundManager.connect(aiOperator).createRound(aiPrediction, signatureHash);

      // Try to create second round immediately
      await expect(
        roundManager.connect(aiOperator).createRound(aiPrediction, signatureHash)
      ).to.be.revertedWith("Cannot create round yet");
    });
  });

  describe("Round Phases", function () {
    beforeEach(async function () {
      const aiPrediction = 0;
      const signatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));
      
      await aiOracleAdapter.connect(aiOperator).submitPrediction(1, aiPrediction, signatureHash);
      await roundManager.connect(aiOperator).createRound(aiPrediction, signatureHash);
    });

    it("Should transition from voting to frozen phase", async function () {
      // Fast forward to end of voting period
      await time.increase(VOTING_DURATION + 1);

      await expect(roundManager.freezeRound(1))
        .to.emit(roundManager, "RoundPhaseChanged")
        .withArgs(1, 1, 2); // Voting to Frozen

      const round = await roundManager.getRound(1);
      expect(round.phase).to.equal(2); // Frozen
    });

    it("Should resolve round after freeze period", async function () {
      // Fast forward through voting and freeze periods
      await time.increase(VOTING_DURATION + FREEZE_DURATION + RESOLUTION_DURATION + 1);

      // Update price to simulate price movement
      await mockPriceFeed.updateAnswer(ethers.utils.parseUnits("1.6", 8)); // Price went up

      await expect(roundManager.resolveRound(1))
        .to.emit(roundManager, "RoundResolved");

      const round = await roundManager.getRound(1);
      expect(round.resolved).to.be.true;
      expect(round.phase).to.equal(3); // Resolved
    });

    it("Should not resolve round before resolution time", async function () {
      await expect(roundManager.resolveRound(1))
        .to.be.revertedWith("Resolution time not reached");
    });
  });

  describe("Round Cancellation", function () {
    beforeEach(async function () {
      const aiPrediction = 0;
      const signatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));
      
      await aiOracleAdapter.connect(aiOperator).submitPrediction(1, aiPrediction, signatureHash);
      await roundManager.connect(aiOperator).createRound(aiPrediction, signatureHash);
    });

    it("Should allow owner to cancel round", async function () {
      await expect(roundManager.cancelRound(1, "Emergency cancellation"))
        .to.emit(roundManager, "RoundCancelled")
        .withArgs(1, "Emergency cancellation");

      const round = await roundManager.getRound(1);
      expect(round.phase).to.equal(4); // Cancelled
    });

    it("Should not allow non-owner to cancel round", async function () {
      await expect(
        roundManager.connect(user1).cancelRound(1, "Unauthorized")
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Price Validation", function () {
    it("Should handle invalid price from oracle", async function () {
      // Set price to 0 (invalid)
      await mockPriceFeed.updateAnswer(0);

      const aiPrediction = 0;
      const signatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));

      await expect(
        roundManager.connect(aiOperator).createRound(aiPrediction, signatureHash)
      ).to.be.revertedWith("Invalid start price");
    });
  });

  describe("Contract Updates", function () {
    it("Should allow owner to update contract addresses", async function () {
      const newPredictionPool = ethers.Wallet.createRandom().address;
      
      await roundManager.updateContracts(
        newPredictionPool,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero
      );

      expect(await roundManager.predictionPool()).to.equal(newPredictionPool);
    });

    it("Should not allow non-owner to update contracts", async function () {
      await expect(
        roundManager.connect(user1).updateContracts(
          ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          ethers.constants.AddressZero
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to pause and unpause", async function () {
      await roundManager.pause();
      expect(await roundManager.paused()).to.be.true;

      const aiPrediction = 0;
      const signatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));

      await expect(
        roundManager.connect(aiOperator).createRound(aiPrediction, signatureHash)
      ).to.be.revertedWith("Pausable: paused");

      await roundManager.unpause();
      expect(await roundManager.paused()).to.be.false;
    });
  });
});
