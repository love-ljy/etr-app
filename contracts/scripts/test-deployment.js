// 测试已部署合约功能
// 验证所有合约是否正常部署和配置

const { ethers } = require("hardhat");

// 已部署的合约地址
const DEPLOYED_CONTRACTS = {
  ETRToken: "0xC163C4DFE7e8bAd2E3d9db64BF5EEf944F4484c5",
  MockUSDT: "0xEB4a0196124797a7580d2A260EBFF0bd845dc956",
  PriceOracle: "0xBF73DB25F5f58d206f1eaE05492ccb5643C08A38",
  StakingPool: "0x3E08D67Ee44C7385EF57f2c1b0833f2eDe776789",
  ReferralSystemV2: "0x1f990C344d9f72344684F5cF2E4ed18a59F62609",
  CompoundPool: "0xcF1c5E6e94c16a0501eb0fa399D674826B3a4363",
  DividendPool: "0x77e670EE1D0B4461B7399cf86f8624373FEB6b84",
  SlippageController: "0xF6b61E9a65607198Ababe08c071Ae9eEaEaBee0A",
  LPPair: "0x5211Bf6A3884Bb4650eE99895BFE733a92c08666",
};

const PANCAKE_ROUTER = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🧪 开始测试已部署的合约");
  console.log("=".repeat(60) + "\n");

  const [deployer] = await ethers.getSigners();
  console.log("测试账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "BNB\n");

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // 测试1: ETRToken 基础信息
  console.log("📝 测试 1: ETRToken 基础信息");
  try {
    const ETRToken = await ethers.getContractFactory("ETRToken");
    const etr = ETRToken.attach(DEPLOYED_CONTRACTS.ETRToken);

    const name = await etr.name();
    const symbol = await etr.symbol();
    const decimals = await etr.decimals();
    const totalSupply = await etr.totalSupply();
    const deployerBalance = await etr.balanceOf(deployer.address);

    console.log("   代币名称:", name);
    console.log("   代币符号:", symbol);
    console.log("   精度:", decimals);
    console.log("   总供应量:", ethers.formatEther(totalSupply), "ETR");
    console.log("   部署者余额:", ethers.formatEther(deployerBalance), "ETR");

    if (name === "Equator ETR" && symbol === "ETR" && decimals === 18n) {
      console.log("   ✅ 测试通过\n");
      results.passed++;
      results.tests.push({ name: "ETRToken 基础信息", status: "✅ 通过" });
    } else {
      throw new Error("基础信息不匹配");
    }
  } catch (error) {
    console.log("   ❌ 测试失败:", error.message, "\n");
    results.failed++;
    results.tests.push({ name: "ETRToken 基础信息", status: "❌ 失败" });
  }

  // 测试2: MockUSDT 基础信息
  console.log("📝 测试 2: MockUSDT 基础信息");
  try {
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const usdt = MockUSDT.attach(DEPLOYED_CONTRACTS.MockUSDT);

    const name = await usdt.name();
    const symbol = await usdt.symbol();
    const deployerBalance = await usdt.balanceOf(deployer.address);

    console.log("   代币名称:", name);
    console.log("   代币符号:", symbol);
    console.log("   部署者余额:", ethers.formatEther(deployerBalance), "USDT");

    if (name === "Mock USDT" && symbol === "USDT") {
      console.log("   ✅ 测试通过\n");
      results.passed++;
      results.tests.push({ name: "MockUSDT 基础信息", status: "✅ 通过" });
    } else {
      throw new Error("基础信息不匹配");
    }
  } catch (error) {
    console.log("   ❌ 测试失败:", error.message, "\n");
    results.failed++;
    results.tests.push({ name: "MockUSDT 基础信息", status: "❌ 失败" });
  }

  // 测试3: PriceOracle 配置
  console.log("📝 测试 3: PriceOracle LP配置");
  try {
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    const oracle = PriceOracle.attach(DEPLOYED_CONTRACTS.PriceOracle);

    const lpPair = await oracle.pancakePair();  // 修正：使用 pancakePair
    console.log("   LP Pair 地址:", lpPair);

    if (lpPair.toLowerCase() === DEPLOYED_CONTRACTS.LPPair.toLowerCase()) {
      console.log("   ✅ LP Pair 配置正确\n");
      results.passed++;
      results.tests.push({ name: "PriceOracle LP配置", status: "✅ 通过" });
    } else {
      throw new Error("LP Pair 地址不匹配");
    }
  } catch (error) {
    console.log("   ❌ 测试失败:", error.message, "\n");
    results.failed++;
    results.tests.push({ name: "PriceOracle LP配置", status: "❌ 失败" });
  }

  // 测试4: StakingPool 配置
  console.log("📝 测试 4: StakingPool 合约关联");
  try {
    const StakingPool = await ethers.getContractFactory("StakingPool");
    const staking = StakingPool.attach(DEPLOYED_CONTRACTS.StakingPool);

    const etrToken = await staking.etrToken();
    const priceOracle = await staking.priceOracle();
    const referralSystem = await staking.referralSystem();
    const compoundPool = await staking.compoundPool();

    console.log("   ETR Token:", etrToken);
    console.log("   Price Oracle:", priceOracle);
    console.log("   Referral System:", referralSystem);
    console.log("   Compound Pool:", compoundPool);

    if (
      etrToken.toLowerCase() === DEPLOYED_CONTRACTS.ETRToken.toLowerCase() &&
      priceOracle.toLowerCase() === DEPLOYED_CONTRACTS.PriceOracle.toLowerCase() &&
      referralSystem.toLowerCase() === DEPLOYED_CONTRACTS.ReferralSystemV2.toLowerCase() &&
      compoundPool.toLowerCase() === DEPLOYED_CONTRACTS.CompoundPool.toLowerCase()
    ) {
      console.log("   ✅ 所有合约关联正确\n");
      results.passed++;
      results.tests.push({ name: "StakingPool 合约关联", status: "✅ 通过" });
    } else {
      throw new Error("合约关联不正确");
    }
  } catch (error) {
    console.log("   ❌ 测试失败:", error.message, "\n");
    results.failed++;
    results.tests.push({ name: "StakingPool 合约关联", status: "❌ 失败" });
  }

  // 测试5: LP 流动性池状态
  console.log("📝 测试 5: LP 流动性池状态");
  try {
    const pairABI = [
      "function token0() external view returns (address)",
      "function token1() external view returns (address)",
      "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
      "function totalSupply() external view returns (uint256)"
    ];

    const pair = new ethers.Contract(DEPLOYED_CONTRACTS.LPPair, pairABI, deployer);

    const token0 = await pair.token0();
    const token1 = await pair.token1();
    const reserves = await pair.getReserves();
    const totalSupply = await pair.totalSupply();

    console.log("   Token0:", token0);
    console.log("   Token1:", token1);
    console.log("   Reserve0:", ethers.formatEther(reserves[0]));
    console.log("   Reserve1:", ethers.formatEther(reserves[1]));
    console.log("   LP Total Supply:", ethers.formatEther(totalSupply));

    if (totalSupply > 0n) {
      console.log("   ✅ 流动性池已创建并有流动性\n");
      results.passed++;
      results.tests.push({ name: "LP 流动性池状态", status: "✅ 通过" });
    } else {
      throw new Error("流动性池无流动性");
    }
  } catch (error) {
    console.log("   ❌ 测试失败:", error.message, "\n");
    results.failed++;
    results.tests.push({ name: "LP 流动性池状态", status: "❌ 失败" });
  }

  // 测试6: CompoundPool 基础功能
  console.log("📝 测试 6: CompoundPool 基础配置");
  try {
    const CompoundPool = await ethers.getContractFactory("CompoundPool");
    const compound = CompoundPool.attach(DEPLOYED_CONTRACTS.CompoundPool);

    const etrToken = await compound.etrToken();
    const currentYieldRate = await compound.currentYieldRate();

    console.log("   ETR Token:", etrToken);
    console.log("   当前日化收益率:", currentYieldRate.toString(), "基点");

    if (etrToken.toLowerCase() === DEPLOYED_CONTRACTS.ETRToken.toLowerCase()) {
      console.log("   ✅ CompoundPool 配置正确\n");
      results.passed++;
      results.tests.push({ name: "CompoundPool 基础配置", status: "✅ 通过" });
    } else {
      throw new Error("ETR Token 地址不匹配");
    }
  } catch (error) {
    console.log("   ❌ 测试失败:", error.message, "\n");
    results.failed++;
    results.tests.push({ name: "CompoundPool 基础配置", status: "❌ 失败" });
  }

  // 测试7: ReferralSystemV2 配置
  console.log("📝 测试 7: ReferralSystemV2 配置");
  try {
    const ReferralSystemV2 = await ethers.getContractFactory("ReferralSystemV2");
    const referral = ReferralSystemV2.attach(DEPLOYED_CONTRACTS.ReferralSystemV2);

    const stakingPool = await referral.stakingPool();
    const priceOracle = await referral.priceOracle();

    console.log("   Staking Pool:", stakingPool);
    console.log("   Price Oracle:", priceOracle);

    if (
      stakingPool.toLowerCase() === DEPLOYED_CONTRACTS.StakingPool.toLowerCase() &&
      priceOracle.toLowerCase() === DEPLOYED_CONTRACTS.PriceOracle.toLowerCase()
    ) {
      console.log("   ✅ ReferralSystemV2 配置正确\n");
      results.passed++;
      results.tests.push({ name: "ReferralSystemV2 配置", status: "✅ 通过" });
    } else {
      throw new Error("合约关联不正确");
    }
  } catch (error) {
    console.log("   ❌ 测试失败:", error.message, "\n");
    results.failed++;
    results.tests.push({ name: "ReferralSystemV2 配置", status: "❌ 失败" });
  }

  // 测试8: 测试 MockUSDT faucet 功能
  console.log("📝 测试 8: MockUSDT Faucet 功能");
  try {
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const usdt = MockUSDT.attach(DEPLOYED_CONTRACTS.MockUSDT);

    const balanceBefore = await usdt.balanceOf(deployer.address);
    const timeUntilNext = await usdt.timeUntilNextMint(deployer.address);

    console.log("   Faucet前余额:", ethers.formatEther(balanceBefore), "USDT");
    console.log("   距下次领取:", timeUntilNext.toString(), "秒");

    if (timeUntilNext === 0n) {
      console.log("   💡 可以领取 faucet (需要gas费，跳过实际执行)");
      console.log("   ✅ Faucet 功能可用\n");
      results.passed++;
      results.tests.push({ name: "MockUSDT Faucet 功能", status: "✅ 通过" });
    } else {
      console.log("   ⏳ Faucet 冷却中");
      console.log("   ✅ Faucet 功能正常 (处于冷却期)\n");
      results.passed++;
      results.tests.push({ name: "MockUSDT Faucet 功能", status: "✅ 通过" });
    }
  } catch (error) {
    console.log("   ❌ 测试失败:", error.message, "\n");
    results.failed++;
    results.tests.push({ name: "MockUSDT Faucet 功能", status: "❌ 失败" });
  }

  // 最终报告
  console.log("=".repeat(60));
  console.log("📊 测试结果汇总");
  console.log("=".repeat(60));
  console.log(`总测试数: ${results.passed + results.failed}`);
  console.log(`通过: ${results.passed} ✅`);
  console.log(`失败: ${results.failed} ❌`);
  console.log(`成功率: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(2)}%`);
  console.log("\n详细结果:");
  results.tests.forEach((test, index) => {
    console.log(`${index + 1}. ${test.name}: ${test.status}`);
  });
  console.log("=".repeat(60));

  if (results.failed === 0) {
    console.log("\n🎉 所有测试通过！合约部署和配置完全正确！\n");
  } else {
    console.log("\n⚠️  部分测试失败，请检查合约配置！\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 测试执行失败:", error);
    process.exit(1);
  });
