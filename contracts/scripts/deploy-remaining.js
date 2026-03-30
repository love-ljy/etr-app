const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("=".repeat(60));
  console.log("🚀 补充部署 DividendPool + SlippageController");
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\n📝 部署账户:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 账户余额:", ethers.formatEther(balance), "BNB");

  // 读取已部署的合约地址
  const deploymentInfo = require("../deployment-v2.json");
  const { ETRToken, StakingPoolV2, ReferralSystem } = deploymentInfo.contracts;
  
  console.log("\n✅ 已部署合约:");
  console.log("   ETRToken:", ETRToken);
  console.log("   StakingPoolV2:", StakingPoolV2);
  console.log("   ReferralSystem:", ReferralSystem);

  // ========== 1. 部署 DividendPool ==========
  console.log("\n" + "=".repeat(60));
  console.log("1️⃣  部署 DividendPool...");
  console.log("=".repeat(60));
  
  const DividendPool = await ethers.getContractFactory("DividendPool");
  const dividendPool = await DividendPool.deploy(ETRToken, StakingPoolV2, ReferralSystem);
  await dividendPool.waitForDeployment();
  const dividendPoolAddress = await dividendPool.getAddress();
  
  console.log("✅ DividendPool 部署成功!");
  console.log("   地址:", dividendPoolAddress);

  // ========== 2. 部署 SlippageController ==========
  console.log("\n" + "=".repeat(60));
  console.log("2️⃣  部署 SlippageController...");
  console.log("=".repeat(60));
  
  const SlippageController = await ethers.getContractFactory("SlippageController");
  const slippageController = await SlippageController.deploy(ETRToken, deployer.address, deployer.address);
  await slippageController.waitForDeployment();
  const slippageControllerAddress = await slippageController.getAddress();
  
  console.log("✅ SlippageController 部署成功!");
  console.log("   地址:", slippageControllerAddress);

  // ========== 3. 更新部署信息 ==========
  console.log("\n" + "=".repeat(60));
  console.log("📝 更新部署信息...");
  console.log("=".repeat(60));

  const fs = require("fs");
  const updatedInfo = {
    ...deploymentInfo,
    contracts: {
      ...deploymentInfo.contracts,
      DividendPool: dividendPoolAddress,
      SlippageController: slippageControllerAddress,
    },
    completedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    "deployment-v2.json",
    JSON.stringify(updatedInfo, null, 2)
  );

  console.log("✅ deployment-v2.json 已更新");

  // ========== 4. 输出前端配置 ==========
  console.log("\n" + "=".repeat(60));
  console.log("📋 前端配置更新");
  console.log("=".repeat(60));

  console.log("\n请更新 frontend-v2/src/lib/web3/contracts.ts:");
  console.log(`
  bscTestnet: {
    ETRToken: '${ETRToken}',
    StakingPool: '${StakingPoolV2}',
    CompoundPool: '${deploymentInfo.contracts.CompoundPoolV2}',
    ReferralSystem: '${ReferralSystem}',
    DividendPool: '${dividendPoolAddress}',
    SlippageController: '${slippageControllerAddress}',
    PriceOracle: '${deployer.address}',
    Router: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1',
  }
  `);

  // ========== 5. 合约验证提示 ==========
  console.log("\n" + "=".repeat(60));
  console.log("🔍 合约验证 (可选)");
  console.log("=".repeat(60));
  console.log(`
npx hardhat verify --network bscTestnet ${dividendPoolAddress} ${ETRToken} ${StakingPoolV2} ${ReferralSystem}
npx hardhat verify --network bscTestnet ${slippageControllerAddress} ${ETRToken} ${deployer.address} ${deployer.address}
  `);

  console.log("\n🎉 所有合约部署完成！");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
