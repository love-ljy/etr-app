// 修复所有合约配置
const { ethers } = require("hardhat");

const DEPLOYED_CONTRACTS = {
  StakingPool: "0x3E08D67Ee44C7385EF57f2c1b0833f2eDe776789",
  ReferralSystemV2: "0x1f990C344d9f72344684F5cF2E4ed18a59F62609",
  CompoundPool: "0xcF1c5E6e94c16a0501eb0fa399D674826B3a4363",
  DividendPool: "0x77e670EE1D0B4461B7399cf86f8624373FEB6b84",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("操作账户:", deployer.address);
  console.log("\n" + "=".repeat(60));

  const StakingPool = await ethers.getContractFactory("StakingPool");
  const staking = StakingPool.attach(DEPLOYED_CONTRACTS.StakingPool);

  // 1. 设置 ReferralSystem 和 DividendPool
  console.log("\n🔧 步骤1: 设置 ReferralSystem 和 DividendPool...");
  console.log("   ReferralSystem:", DEPLOYED_CONTRACTS.ReferralSystemV2);
  console.log("   DividendPool:", DEPLOYED_CONTRACTS.DividendPool);

  const tx1 = await staking.setContracts(
    DEPLOYED_CONTRACTS.ReferralSystemV2,
    DEPLOYED_CONTRACTS.DividendPool
  );
  console.log("   交易哈希:", tx1.hash);
  await tx1.wait();
  console.log("   ✅ setContracts 完成");

  // 2. 设置 CompoundPool
  console.log("\n🔧 步骤2: 设置 CompoundPool...");
  console.log("   CompoundPool:", DEPLOYED_CONTRACTS.CompoundPool);

  const tx2 = await staking.setCompoundPool(DEPLOYED_CONTRACTS.CompoundPool);
  console.log("   交易哈希:", tx2.hash);
  await tx2.wait();
  console.log("   ✅ setCompoundPool 完成");

  // 3. 验证所有配置
  console.log("\n" + "=".repeat(60));
  console.log("📋 验证配置结果:");
  console.log("=".repeat(60));

  const referralSystem = await staking.referralSystem();
  const dividendPool = await staking.dividendPool();
  const compoundPool = await staking.compoundPool();

  console.log("\nStakingPool 当前配置:");
  console.log("  ReferralSystem:", referralSystem);
  console.log("  DividendPool:", dividendPool);
  console.log("  CompoundPool:", compoundPool);

  // 验证结果
  let allCorrect = true;

  if (referralSystem.toLowerCase() === DEPLOYED_CONTRACTS.ReferralSystemV2.toLowerCase()) {
    console.log("\n  ✅ ReferralSystem 配置正确");
  } else {
    console.log("\n  ❌ ReferralSystem 配置错误");
    allCorrect = false;
  }

  if (dividendPool.toLowerCase() === DEPLOYED_CONTRACTS.DividendPool.toLowerCase()) {
    console.log("  ✅ DividendPool 配置正确");
  } else {
    console.log("  ❌ DividendPool 配置错误");
    allCorrect = false;
  }

  if (compoundPool.toLowerCase() === DEPLOYED_CONTRACTS.CompoundPool.toLowerCase()) {
    console.log("  ✅ CompoundPool 配置正确");
  } else {
    console.log("  ❌ CompoundPool 配置错误");
    allCorrect = false;
  }

  console.log("\n" + "=".repeat(60));
  if (allCorrect) {
    console.log("🎉 所有配置完全正确！");
  } else {
    console.log("⚠️  部分配置有误，请检查！");
  }
  console.log("=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 执行失败:", error);
    process.exit(1);
  });
