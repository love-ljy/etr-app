// ETR DAPP 完整部署脚本 - 测试网
// 部署所有合约到 BSC Testnet

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", (await deployer.provider.getBalance(deployer.address)).toString());

  const network = await ethers.provider.getNetwork();
  console.log("部署网络:", network.name, "ChainID:", network.chainId);

  const deployments = {};

  // 1. 部署 ETRToken
  console.log("\n📝 部署 ETRToken...");
  const ETRToken = await ethers.getContractFactory("ETRToken");
  // 黑洞地址：以太坊标准销毁地址
  const blackHole = "0x000000000000000000000000000000000000dEaD";
  // LP池地址：先用部署者地址，后续可通过setLpPool更新
  const lpPool = deployer.address;
  const etrToken = await ETRToken.deploy(blackHole, lpPool);
  await etrToken.waitForDeployment();
  deployments.ETRToken = await etrToken.getAddress();
  console.log("✅ ETRToken 部署成功:", deployments.ETRToken);
  console.log("   黑洞地址:", blackHole);
  console.log("   LP池地址:", lpPool, "(临时，后续可更新)");

  // 2. 部署 PriceOracle
  console.log("\n📝 部署 PriceOracle...");
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  // 临时使用 deployer 地址作为 LP Pair，后续需要通过 setLPPair 更新为真实 LP 地址
  const tempLPPair = deployer.address;
  const isToken0ETR = true; // 假设 ETR 是 token0
  const priceOracle = await PriceOracle.deploy(tempLPPair, isToken0ETR);
  await priceOracle.waitForDeployment();
  deployments.PriceOracle = await priceOracle.getAddress();
  console.log("✅ PriceOracle 部署成功:", deployments.PriceOracle);
  console.log("   ⚠️  临时LP地址:", tempLPPair, "(需要后续更新)");

  // 3. 部署 StakingPool
  console.log("\n📝 部署 StakingPool...");
  const StakingPool = await ethers.getContractFactory("StakingPool");
  const stakingPool = await StakingPool.deploy(
    deployments.ETRToken,
    deployments.PriceOracle
  );
  await stakingPool.waitForDeployment();
  deployments.StakingPool = await stakingPool.getAddress();
  console.log("✅ StakingPool 部署成功:", deployments.StakingPool);

  // 4. 部署 ReferralSystemV2 (修正版 - 30封顶)
  console.log("\n📝 部署 ReferralSystemV2 (30封顶修正版)...");
  const ReferralSystemV2 = await ethers.getContractFactory("ReferralSystemV2");
  const referralSystem = await ReferralSystemV2.deploy(
    deployments.StakingPool,
    deployments.PriceOracle
  );
  await referralSystem.waitForDeployment();
  deployments.ReferralSystemV2 = await referralSystem.getAddress();
  console.log("✅ ReferralSystemV2 部署成功:", deployments.ReferralSystemV2);

  // 5. 部署 CompoundPool
  console.log("\n📝 部署 CompoundPool...");
  const CompoundPool = await ethers.getContractFactory("CompoundPool");
  const compoundPool = await CompoundPool.deploy(
    deployments.ETRToken
  );
  await compoundPool.waitForDeployment();
  deployments.CompoundPool = await compoundPool.getAddress();
  console.log("✅ CompoundPool 部署成功:", deployments.CompoundPool);

  // 6. 部署 DividendPool
  console.log("\n📝 部署 DividendPool...");
  const DividendPool = await ethers.getContractFactory("DividendPool");
  // 临时使用 deployer 地址作为治理地址和预售地址，后续可通过管理函数更新
  const tempGovernance = deployer.address;
  const tempPresale = deployer.address;
  const dividendPool = await DividendPool.deploy(
    deployments.ETRToken,
    tempGovernance,
    tempPresale
  );
  await dividendPool.waitForDeployment();
  deployments.DividendPool = await dividendPool.getAddress();
  console.log("✅ DividendPool 部署成功:", deployments.DividendPool);
  console.log("   ⚠️  临时治理地址:", tempGovernance, "(需要后续更新)");
  console.log("   ⚠️  临时预售地址:", tempPresale, "(需要后续更新)");

  // 7. 部署 SlippageController
  console.log("\n📝 部署 SlippageController...");
  const SlippageController = await ethers.getContractFactory("SlippageController");
  // 临时使用 deployer 地址作为 LP 池地址，后续可更新
  const tempLpPool = deployer.address;
  const slippageController = await SlippageController.deploy(
    deployments.ETRToken,
    deployments.PriceOracle,
    tempLpPool
  );
  await slippageController.waitForDeployment();
  deployments.SlippageController = await slippageController.getAddress();
  console.log("✅ SlippageController 部署成功:", deployments.SlippageController);
  console.log("   ⚠️  临时LP池地址:", tempLpPool, "(需要后续更新)");

  // 配置合约关联
  console.log("\n🔧 配置合约关联...");

  // 设置 StakingPool 的关联合约
  await (await stakingPool.setContracts(
    deployments.ReferralSystemV2,
    deployments.CompoundPool
  )).wait();
  console.log("✅ StakingPool 关联合约配置完成");

  // 配置 ReferralSystemV2 的 StakingPool（如果需要双向引用）
  // await (await referralSystem.setStakingPool(deployments.StakingPool)).wait();
  // console.log("✅ ReferralSystemV2 StakingPool 配置完成");

  // 输出部署信息
  console.log("\n" + "=".repeat(60));
  console.log("🎉 所有合约部署成功！");
  console.log("=".repeat(60));
  console.log("\n部署地址:");
  console.log(JSON.stringify(deployments, null, 2));

  // 保存部署信息到文件
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: deployments
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = `deployment-${network.name}-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(deploymentsDir, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n💾 部署信息已保存到:", `deployments/${filename}`);

  // 生成前端配置
  const frontendConfig = `
// ETR DAPP 合约配置 - ${network.name}
// 部署时间: ${new Date().toISOString()}

export const CONTRACT_ADDRESSES = {
  ETRToken: "${deployments.ETRToken}",
  PriceOracle: "${deployments.PriceOracle}",
  StakingPool: "${deployments.StakingPool}",
  ReferralSystemV2: "${deployments.ReferralSystemV2}",
  CompoundPool: "${deployments.CompoundPool}",
  DividendPool: "${deployments.DividendPool}",
  SlippageController: "${deployments.SlippageController}",
};

export const NETWORK_CONFIG = {
  chainId: ${network.chainId},
  name: "${network.name}",
  rpcUrl: "${network.chainId === 97 ? 'https://data-seed-prebsc-1-s1.binance.org:8545' : 'https://bsc-dataseed.binance.org/'}"
};
`;

  fs.writeFileSync(
    path.join(deploymentsDir, `frontend-config-${network.name}.ts`),
    frontendConfig
  );
  console.log("💾 前端配置已保存到:", `deployments/frontend-config-${network.name}.ts`);

  console.log("\n" + "=".repeat(60));
  console.log("⚠️  重要提示:");
  console.log("=".repeat(60));
  console.log("1. 请保存好部署地址，用于前端配置");
  console.log("2. 测试网需要 BNB 作为 gas 费");
  console.log("3. 从水龙头获取测试 BNB:");
  console.log("   https://testnet.bnbchain.org/faucet-smart");
  console.log("4. 部署后可使用以下命令验证合约:");
  console.log(`   npx hardhat verify --network bscTestnet ${deployments.ETRToken}`);
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 部署失败:", error);
    process.exit(1);
  });