const { ethers } = require("hardhat");

async function main() {
  console.log("============================================================");
  console.log("ETR DApp V2 - 合约部署脚本");
  console.log("============================================================");
  
  const [deployer] = await ethers.getSigners();
  console.log("\n部署账户:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("账户余额:", ethers.formatEther(balance), "BNB");
  
  const network = await ethers.provider.getNetwork();
  console.log("网络 ChainId:", Number(network.chainId));
  
  // BSC 测试网 USDT 地址
  const USDT_ADDRESS = "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd";
  const INITIAL_ETR_PRICE_USD = ethers.parseEther("0.25");
  
  console.log("\n部署配置:");
  console.log("  USDT 地址:", USDT_ADDRESS);
  console.log("  ETR 初始价格:", ethers.formatEther(INITIAL_ETR_PRICE_USD), "USD");
  
  // 1. 部署 ETRToken
  console.log("\n============================================================");
  console.log("1. 部署 ETRToken...");
  console.log("============================================================");
  
  const blackHoleAddress = "0x000000000000000000000000000000000000dEaD";
  const lpPoolAddress = deployer.address;
  
  const ETRToken = await ethers.getContractFactory("ETRToken");
  const etrToken = await ETRToken.deploy(blackHoleAddress, lpPoolAddress);
  await etrToken.waitForDeployment();
  const etrTokenAddress = await etrToken.getAddress();
  
  console.log("ETRToken 地址:", etrTokenAddress);
  
  // 2. 部署 CompoundPoolV2
  console.log("\n============================================================");
  console.log("2. 部署 CompoundPoolV2...");
  console.log("============================================================");
  
  const CompoundPoolV2 = await ethers.getContractFactory("CompoundPoolV2");
  const compoundPool = await CompoundPoolV2.deploy(etrTokenAddress);
  await compoundPool.waitForDeployment();
  const compoundPoolAddress = await compoundPool.getAddress();
  
  console.log("CompoundPoolV2 地址:", compoundPoolAddress);
  
  // 3. 部署 StakingPoolV2
  console.log("\n============================================================");
  console.log("3. 部署 StakingPoolV2...");
  console.log("============================================================");
  
  const StakingPoolV2 = await ethers.getContractFactory("StakingPoolV2");
  const stakingPool = await StakingPoolV2.deploy(
    etrTokenAddress,
    USDT_ADDRESS,
    deployer.address,
    INITIAL_ETR_PRICE_USD
  );
  await stakingPool.waitForDeployment();
  const stakingPoolAddress = await stakingPool.getAddress();
  
  console.log("StakingPoolV2 地址:", stakingPoolAddress);
  
  // 4. 部署 ReferralSystem
  console.log("\n============================================================");
  console.log("4. 部署 ReferralSystem...");
  console.log("============================================================");
  
  const ReferralSystem = await ethers.getContractFactory("ReferralSystem");
  const referralSystem = await ReferralSystem.deploy(stakingPoolAddress, deployer.address);
  await referralSystem.waitForDeployment();
  const referralSystemAddress = await referralSystem.getAddress();
  
  console.log("ReferralSystem 地址:", referralSystemAddress);
  
  // 5. 配置合约关联
  console.log("\n============================================================");
  console.log("5. 配置合约关联...");
  console.log("============================================================");
  
  console.log("设置 StakingPool 合约引用...");
  await stakingPool.setContracts(referralSystemAddress, deployer.address, compoundPoolAddress);
  
  console.log("设置 CompoundPool 的 StakingPool 地址...");
  await compoundPool.setStakingPool(stakingPoolAddress);
  
  // 6. 初始化奖励池
  console.log("\n============================================================");
  console.log("6. 初始化奖励池...");
  console.log("============================================================");
  
  const testAmount = ethers.parseEther("100000");
  console.log("转移 10 万 ETR 到部署者账户...");
  const tx1 = await etrToken.transfer(deployer.address, testAmount);
  await tx1.wait();
  console.log("转移成功");
  
  console.log("授权 StakingPool 使用 ETR...");
  const approveAmount = ethers.parseEther("1000000");
  const tx2 = await etrToken.approve(stakingPoolAddress, approveAmount);
  await tx2.wait();
  console.log("授权成功");
  
  console.log("充值奖励池...");
  const tx3 = await stakingPool.fundRewardPool(testAmount);
  await tx3.wait();
  
  const rewardPoolBalance = await stakingPool.getRewardPoolBalance();
  console.log("奖励池余额:", ethers.formatEther(rewardPoolBalance), "ETR");
  
  // 7. 输出部署信息
  console.log("\n============================================================");
  console.log("部署完成 - 合约地址汇总");
  console.log("============================================================");
  
  const deploymentInfo = {
    network: "bscTestnet",
    chainId: 97,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      ETRToken: etrTokenAddress,
      StakingPoolV2: stakingPoolAddress,
      CompoundPoolV2: compoundPoolAddress,
      ReferralSystem: referralSystemAddress,
      USDT: USDT_ADDRESS,
    },
    config: {
      etrPriceUSD: "0.25",
      lockPeriodDays: 50,
      dailyYieldRate: "0.45%",
    },
  };
  
  console.log("\n" + JSON.stringify(deploymentInfo, null, 2));
  
  // 保存部署信息
  const fs = require("fs");
  const path = require("path");
  const deploymentPath = path.join(__dirname, "../deployment-v2.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n部署信息已保存到:", deploymentPath);
  
  console.log("\n============================================================");
  console.log("前端配置 (frontend-v2/src/lib/web3/contracts.ts):");
  console.log("============================================================");
  console.log(`
  bscTestnet: {
    ETRToken: '${etrTokenAddress}',
    StakingPool: '${stakingPoolAddress}',
    CompoundPool: '${compoundPoolAddress}',
    ReferralSystem: '${referralSystemAddress}',
    PriceOracle: '${deployer.address}',
    Router: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1',
  }
  `);
  
  console.log("\n部署完成！");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
