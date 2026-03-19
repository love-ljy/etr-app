// 修复 StakingPool 配置
const { ethers } = require("hardhat");

const DEPLOYED_CONTRACTS = {
  StakingPool: "0x3E08D67Ee44C7385EF57f2c1b0833f2eDe776789",
  ReferralSystemV2: "0x1f990C344d9f72344684F5cF2E4ed18a59F62609",
  CompoundPool: "0xcF1c5E6e94c16a0501eb0fa399D674826B3a4363",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("操作账户:", deployer.address);

  console.log("\n🔧 修复 StakingPool 配置...");

  const StakingPool = await ethers.getContractFactory("StakingPool");
  const staking = StakingPool.attach(DEPLOYED_CONTRACTS.StakingPool);

  console.log("设置合约关联:");
  console.log("  ReferralSystem:", DEPLOYED_CONTRACTS.ReferralSystemV2);
  console.log("  CompoundPool:", DEPLOYED_CONTRACTS.CompoundPool);

  const tx = await staking.setContracts(
    DEPLOYED_CONTRACTS.ReferralSystemV2,
    DEPLOYED_CONTRACTS.CompoundPool
  );

  console.log("交易哈希:", tx.hash);
  await tx.wait();

  console.log("✅ StakingPool 配置更新成功!");

  // 验证
  const compoundPool = await staking.compoundPool();
  console.log("\n验证结果:");
  console.log("  CompoundPool:", compoundPool);

  if (compoundPool.toLowerCase() === DEPLOYED_CONTRACTS.CompoundPool.toLowerCase()) {
    console.log("  ✅ 配置正确!");
  } else {
    console.log("  ❌ 配置失败!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 执行失败:", error);
    process.exit(1);
  });
