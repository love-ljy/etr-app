const { ethers } = require("hardhat");

async function main() {
  console.log("=".repeat(60));
  console.log("ETR DApp V2 - 合约部署脚本");
  console.log("=".repeat(60));
  
  const [deployer] = await ethers.getSigners();
  console.log("\n📝 部署账户:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 账户余额:", ethers.formatEther(balance), "BNB");
  
  // 获取网络信息
  const network = await ethers.provider.getNetwork();
  console.log("🌐 网络:", network.name, "(ChainId:", network.chainId, ")");
  
  // BSC 测试网 USDT 地址
  const USDT_ADDRESS = "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd";
  
  // 初始 ETR 价格 (USD, 18 位小数)
  // 例如：$0.25 = 0.25 * 1e18 = 250000000000000000
  const INITIAL_ETR_PRICE_USD = ethers.parseEther("0.25");
  
  console.log("\n📋 部署配置:");
  console.log("   USDT 地址:", USDT_ADDRESS);
  console.log("   初始 ETR 价格:", ethers.formatEther(INITIAL_ETR_PRICE_USD), "USD");
  
  // ========== 1. 部署 ETRToken ==========
  console.log("\n" + "=".repeat(60));
  console.log("1️⃣  部署 ETRToken...");
  console.log("=".repeat(60));
  
  const blackHoleAddress = "0x000000000000000000000000000000000000dEaD";
  const lpPoolAddress = deployer.address; // 临时使用部署者地址
  
  const ETRToken = await ethers.getContractFactory("ETRToken");
  const etrToken = await ETRToken.deploy(blackHoleAddress, lpPoolAddress);
  await etrToken.waitForDeployment();
  const etrTokenAddress = await etrToken.getAddress();
  
  console.log("✅ ETRToken 部署成功!");
  console.log("   地址:", etrTokenAddress);
  console.log("   总供应量:", ethers.formatEther(await etrToken.getTotalSupply()), "ETR");
  console.log("   黑洞余额:", ethers.formatEther(await etrToken.balanceOf(blackHoleAddress)), "ETR");
  console.log("   LP 池余额:", ethers.formatEther(await etrToken.balanceOf(lpPoolAddress)), "ETR");
  
  // ========== 2. 部署 CompoundPoolV2 ==========
  console.log("\n" + "=".repeat(60));
  console.log("2️⃣  部署 CompoundPoolV2...");
  console.log("=".repeat(60));
  
  const CompoundPoolV2 = await ethers.getContractFactory("CompoundPoolV2");
  const compoundPool = await CompoundPoolV2.deploy(etrTokenAddress);
  await compoundPool.waitForDeployment();
  const compoundPoolAddress = await compoundPool.getAddress();
  
  console.log("✅ CompoundPoolV2 部署成功!");
  console.log("   地址:", compoundPoolAddress);
  console.log("   默认日化率:", (await compoundPool.currentYieldRate()).toString(), "基点 (0.45%)");
  console.log("   直接存入开关:", await compoundPool.allowDirectDeposit());
  
  // ========== 3. 部署 StakingPoolV2 ==========
  console.log("\n" + "=".repeat(60));
  console.log("3️⃣  部署 StakingPoolV2...");
  console.log("=".repeat(60));
  
  const StakingPoolV2 = await ethers.getContractFactory("StakingPoolV2");
  const stakingPool = await StakingPoolV2.deploy(
    etrTokenAddress,
    USDT_ADDRESS,
    deployer.address, // 临时使用部署者地址作为价格预言机
    INITIAL_ETR_PRICE_USD
  );
  await stakingPool.waitForDeployment();
  const stakingPoolAddress = await stakingPool.getAddress();
  
  console.log("✅ StakingPoolV2 部署成功!");
  console.log("   地址:", stakingPoolAddress);
  console.log("   USDT 地址:", USDT_ADDRESS);
  console.log("   ETR 价格:", ethers.formatEther(await stakingPool.etrPriceUSD()), "USD");
  const config = await stakingPool.config();
  console.log("   锁仓周期:", Number(config.lockPeriod) / 86400, "天");
  console.log("   日化收益率:", (await stakingPool.currentYieldRate()).toString(), "基点 (0.45%)");
  
  // ========== 4. 部署 ReferralSystem ==========
  console.log("\n" + "=".repeat(60));
  console.log("4️⃣  部署 ReferralSystem...");
  console.log("=".repeat(60));
  
  const ReferralSystem = await ethers.getContractFactory("ReferralSystem");
  const referralSystem = await ReferralSystem.deploy(stakingPoolAddress, deployer.address);
  await referralSystem.waitForDeployment();
  const referralSystemAddress = await referralSystem.getAddress();
  
  console.log("✅ ReferralSystem 部署成功!");
  console.log("   地址:", referralSystemAddress);
  
  // ========== 4.5 部署 DividendPool ==========
  console.log("\n" + "=".repeat(60));
  console.log("4️⃣.5  部署 DividendPool...");
  console.log("=".repeat(60));
  
  const DividendPool = await ethers.getContractFactory("DividendPool");
  const dividendPool = await DividendPool.deploy(etrTokenAddress, stakingPoolAddress, referralSystemAddress);
  await dividendPool.waitForDeployment();
  const dividendPoolAddress = await dividendPool.getAddress();
  
  console.log("✅ DividendPool 部署成功!");
  console.log("   地址:", dividendPoolAddress);
  
  // ========== 4.6 部署 SlippageController ==========
  console.log("\n" + "=".repeat(60));
  console.log("4️⃣.6  部署 SlippageController...");
  console.log("=".repeat(60));
  
  const SlippageController = await ethers.getContractFactory("SlippageController");
  const slippageController = await SlippageController.deploy(etrTokenAddress, deployer.address, deployer.address);
  await slippageController.waitForDeployment();
  const slippageControllerAddress = await slippageController.getAddress();
  
  console.log("✅ SlippageController 部署成功!");
  console.log("   地址:", slippageControllerAddress);
  
  // ========== 5. 配置合约关联 ==========
  console.log("\n" + "=".repeat(60));
  console.log("5️⃣  配置合约关联...");
  console.log("=".repeat(60));
  
  // 设置 StakingPool 的合约引用
  console.log("   设置 StakingPool 合约引用...");
  await stakingPool.setContracts(referralSystemAddress, dividendPoolAddress, compoundPoolAddress);
  console.log("   ✅ ReferralSystem:", referralSystemAddress);
  console.log("   ✅ DividendPool:", dividendPoolAddress);
  console.log("   ✅ CompoundPool:", compoundPoolAddress);
  
  // 设置 CompoundPool 的 StakingPool 地址
  console.log("   设置 CompoundPool 的 StakingPool 地址...");
  await compoundPool.setStakingPool(stakingPoolAddress);
  console.log("   ✅ StakingPool:", stakingPoolAddress);
  
  // ========== 6. 初始化奖励池 ==========
  console.log("\n" + "=".repeat(60));
  console.log("6️⃣  初始化奖励池...");
  console.log("=".repeat(60));
  
  // 给部署者转账一些 ETR 用于测试
  const testAmount = ethers.parseEther("100000"); // 10 万 ETR
  console.log("   转移", ethers.formatEther(testAmount), "ETR 到部署者账户用于测试...");
  await etrToken.transfer(deployer.address, testAmount);
  console.log("   ✅ 转移成功");
  
  // 授权 StakingPool
  console.log("   授权 StakingPool 使用 ETR...");
  const approveAmount = ethers.parseEther("1000000"); // 100 万 ETR
  const approveTx = await etrToken.approve(stakingPoolAddress, approveAmount);
  await approveTx.wait(); // 等待授权交易确认
  console.log("   ✅ 授权成功:", ethers.formatEther(approveAmount), "ETR");
  
  // 检查授权额度
  const allowance = await etrToken.allowance(deployer.address, stakingPoolAddress);
  console.log("   授权额度:", ethers.formatEther(allowance), "ETR");
  
  // 充值奖励池
  console.log("   充值奖励池...");
  const fundTx = await stakingPool.fundRewardPool(testAmount);
  await fundTx.wait(); // 等待充值交易确认
  console.log("   ✅ 充值成功:", ethers.formatEther(testAmount), "ETR");
  
  const rewardPoolBalance = await stakingPool.getRewardPoolBalance();
  console.log("   奖励池余额:", ethers.formatEther(rewardPoolBalance), "ETR");
  
  // ========== 7. 输出部署信息 ==========
  console.log("\n" + "=".repeat(60));
  console.log("📊 部署完成 - 合约地址汇总");
  console.log("=".repeat(60));
  
  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      ETRToken: etrTokenAddress,
      StakingPoolV2: stakingPoolAddress,
      CompoundPoolV2: compoundPoolAddress,
      ReferralSystem: referralSystemAddress,
      DividendPool: dividendPoolAddress,
      SlippageController: slippageControllerAddress,
      USDT: USDT_ADDRESS,
    },
    config: {
      etrPriceUSD: ethers.formatEther(INITIAL_ETR_PRICE_USD),
      lockPeriodDays: 50,
      dailyYieldRate: "0.45%",
      dailyUnlockRate: "2%",
    },
  };
  
  console.log("\n" + JSON.stringify(deploymentInfo, null, 2));
  
  // 保存部署信息到文件
  const fs = require("fs");
  const path = require("path");
  const deploymentPath = path.join(__dirname, "../deployment-v2.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 部署信息已保存到:", deploymentPath);
  
  // ========== 8. 前端配置提示 ==========
  console.log("\n" + "=".repeat(60));
  console.log("📝 前端配置提示");
  console.log("=".repeat(60));
  console.log("\n请更新 frontend-v2/src/lib/web3/contracts.ts:");
  console.log(`
  bscTestnet: {
    ETRToken: '${etrTokenAddress}',
    StakingPool: '${stakingPoolAddress}',
    CompoundPool: '${compoundPoolAddress}',
    ReferralSystem: '${referralSystemAddress}',
    DividendPool: '${dividendPoolAddress}',
    SlippageController: '${slippageControllerAddress}',
    PriceOracle: '${deployer.address}', // 临时使用部署者地址
    Router: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1', // PancakeSwap Router
  }
  `);
  
  console.log("\n✅ 部署完成！");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
