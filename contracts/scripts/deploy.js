const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying PREDIX AI contracts...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Contract deployment parameters
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || deployer.address;
  const AI_OPERATOR_ADDRESS = process.env.AI_OPERATOR_ADDRESS || deployer.address;
  
  // Chainlink POL/USD price feed addresses
  const PRICE_FEEDS = {
    // Polygon Amoy Testnet
    80002: "0x001382149eBa3441043c1c66972b4772963f5D43", // POL/USD
    // Polygon Mainnet  
    137: "0x001382149eBa3441043c1c66972b4772963f5D43" // POL/USD
  };

  const network = await deployer.provider.getNetwork();
  const chainId = network.chainId;
  const priceFeedAddress = PRICE_FEEDS[chainId];
  
  if (!priceFeedAddress) {
    throw new Error(`No price feed configured for chain ID: ${chainId}`);
  }

  console.log("Using price feed address:", priceFeedAddress);

  // Deploy OracleHandler
  console.log("\n1. Deploying OracleHandler...");
  const OracleHandler = await ethers.getContractFactory("OracleHandler");
  const oracleHandler = await OracleHandler.deploy(priceFeedAddress);
  await oracleHandler.waitForDeployment();
  console.log("OracleHandler deployed to:", await oracleHandler.getAddress());

  // Deploy AIOracleAdapter with deployer as temporary round manager
  console.log("\n2. Deploying AIOracleAdapter...");
  const AIOracleAdapter = await ethers.getContractFactory("AIOracleAdapter");
  const aiOracleAdapter = await AIOracleAdapter.deploy(
    AI_OPERATOR_ADDRESS,
    deployer.address // Temporary address, will be updated after RoundManager deployment
  );
  await aiOracleAdapter.waitForDeployment();
  console.log("AIOracleAdapter deployed to:", await aiOracleAdapter.getAddress());

  // Deploy RewardManager with deployer as temporary prediction pool
  console.log("\n3. Deploying RewardManager...");
  const RewardManager = await ethers.getContractFactory("RewardManager");
  const rewardManager = await RewardManager.deploy(
    deployer.address, // Temporary address, will be updated after PredictionPool deployment
    TREASURY_ADDRESS
  );
  await rewardManager.waitForDeployment();
  console.log("RewardManager deployed to:", await rewardManager.getAddress());

  // Deploy PredictionPool with deployer as temporary round manager
  console.log("\n4. Deploying PredictionPool...");
  const PredictionPool = await ethers.getContractFactory("PredictionPool");
  const predictionPool = await PredictionPool.deploy(
    deployer.address, // Temporary address, will be updated after RoundManager deployment
    TREASURY_ADDRESS
  );
  await predictionPool.waitForDeployment();
  console.log("PredictionPool deployed to:", await predictionPool.getAddress());

  // Deploy RoundManager
  console.log("\n5. Deploying RoundManager...");
  const RoundManager = await ethers.getContractFactory("RoundManager");
  const roundManager = await RoundManager.deploy(
    await predictionPool.getAddress(),
    await oracleHandler.getAddress(),
    await aiOracleAdapter.getAddress()
  );
  await roundManager.waitForDeployment();
  console.log("RoundManager deployed to:", await roundManager.getAddress());

  // Update contract addresses
  console.log("\n6. Updating contract addresses...");

  // Update PredictionPool with RoundManager address
  await predictionPool.updateRoundManager(await roundManager.getAddress());
  console.log("Updated PredictionPool with RoundManager address");

  // Update AIOracleAdapter with RoundManager address
  await aiOracleAdapter.updateRoundManager(await roundManager.getAddress());
  console.log("Updated AIOracleAdapter with RoundManager address");

  // Update RewardManager with PredictionPool address
  await rewardManager.updatePredictionPool(await predictionPool.getAddress());
  console.log("Updated RewardManager with PredictionPool address");

  // Verify price feed is working
  console.log("\n7. Verifying price feed...");
  try {
    const latestPrice = await oracleHandler.getLatestPrice();
    console.log("Latest POL/USD price:", ethers.formatEther(latestPrice));
  } catch (error) {
    console.log("Warning: Could not fetch latest price:", error.message);
  }

  // Save deployment addresses
  const deploymentInfo = {
    network: chainId.toString(),
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      RoundManager: await roundManager.getAddress(),
      PredictionPool: await predictionPool.getAddress(),
      OracleHandler: await oracleHandler.getAddress(),
      RewardManager: await rewardManager.getAddress(),
      AIOracleAdapter: await aiOracleAdapter.getAddress()
    },
    configuration: {
      treasury: TREASURY_ADDRESS,
      aiOperator: AI_OPERATOR_ADDRESS,
      priceFeed: priceFeedAddress
    }
  };

  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Save to file
  const fs = require('fs');
  const deploymentPath = `deployments/${chainId}-deployment.json`;
  
  // Create deployments directory if it doesn't exist
  if (!fs.existsSync('deployments')) {
    fs.mkdirSync('deployments');
  }
  
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info saved to: ${deploymentPath}`);

  // Generate environment variables for frontend
  console.log("\n=== ENVIRONMENT VARIABLES FOR FRONTEND ===");
  console.log(`NEXT_PUBLIC_ROUND_MANAGER_ADDRESS=${await roundManager.getAddress()}`);
  console.log(`NEXT_PUBLIC_PREDICTION_POOL_ADDRESS=${await predictionPool.getAddress()}`);
  console.log(`NEXT_PUBLIC_ORACLE_HANDLER_ADDRESS=${await oracleHandler.getAddress()}`);
  console.log(`NEXT_PUBLIC_REWARD_MANAGER_ADDRESS=${await rewardManager.getAddress()}`);
  console.log(`NEXT_PUBLIC_AI_ORACLE_ADAPTER_ADDRESS=${await aiOracleAdapter.getAddress()}`);
  console.log(`NEXT_PUBLIC_CHAIN_ID=${chainId}`);

  return deploymentInfo;
}

// Handle deployment errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
