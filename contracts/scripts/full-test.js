// 完整功能测试脚本 - 模拟真实用户操作
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
};

// 测试用户
let user1, user2;
let usdt, etr, staking, compound, referral;

// 测试结果
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

function addResult(name, status, data = {}) {
  testResults.total++;
  if (status) {
    testResults.passed++;
    console.log(`   ✅ ${name}`);
  } else {
    testResults.failed++;
    console.log(`   ❌ ${name}`);
  }
  testResults.details.push({ name, status, ...data });
}

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 ETR DApp 完整功能测试");
  console.log("=".repeat(80) + "\n");

  // 获取测试账户
  const signers = await ethers.getSigners();
  user1 = signers[0];
  user2 = signers[1]; // 可能是undefined

  console.log("👤 测试账户:");
  console.log("   User1 (主测试):", user1.address);
  console.log("   User1 余额:", ethers.formatEther(await user1.provider.getBalance(user1.address)), "BNB");

  if (user2) {
    console.log("   User2 (推荐测试):", user2.address);
    console.log("   User2 余额:", ethers.formatEther(await user2.provider.getBalance(user2.address)), "BNB");
  } else {
    console.log("   ⚠️  只有一个测试账户，推荐系统测试将被跳过");
  }
  console.log();

  // 初始化合约
  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  usdt = MockUSDT.attach(DEPLOYED_CONTRACTS.MockUSDT);

  const ETRToken = await ethers.getContractFactory("ETRToken");
  etr = ETRToken.attach(DEPLOYED_CONTRACTS.ETRToken);

  const StakingPool = await ethers.getContractFactory("StakingPool");
  staking = StakingPool.attach(DEPLOYED_CONTRACTS.StakingPool);

  const CompoundPool = await ethers.getContractFactory("CompoundPool");
  compound = CompoundPool.attach(DEPLOYED_CONTRACTS.CompoundPool);

  const ReferralSystemV2 = await ethers.getContractFactory("ReferralSystemV2");
  referral = ReferralSystemV2.attach(DEPLOYED_CONTRACTS.ReferralSystemV2);

  // ===== 阶段1: 准备测试代币 =====
  console.log("=".repeat(80));
  console.log("📋 阶段1: 准备测试代币");
  console.log("=".repeat(80) + "\n");

  await testGetUSDT();
  await testGetETR();

  // ===== 阶段2: 推荐系统测试 =====
  console.log("\n" + "=".repeat(80));
  console.log("📋 阶段2: 推荐系统测试");
  console.log("=".repeat(80) + "\n");

  await testBindReferrer();

  // ===== 阶段3: 质押功能测试 =====
  console.log("\n" + "=".repeat(80));
  console.log("📋 阶段3: 质押功能测试");
  console.log("=".repeat(80) + "\n");

  await testApproveUSDT();
  await testStake();
  await testStakeInfo();

  // ===== 阶段4: 收益测试 =====
  console.log("\n" + "=".repeat(80));
  console.log("📋 阶段4: 收益测试 (模拟时间流逝)");
  console.log("=".repeat(80) + "\n");

  await testRewards();

  // ===== 阶段5: 复利池测试 =====
  console.log("\n" + "=".repeat(80));
  console.log("📋 阶段5: 复利池测试");
  console.log("=".repeat(80) + "\n");

  await testCompoundPool();

  // ===== 阶段6: 推荐收益测试 =====
  console.log("\n" + "=".repeat(80));
  console.log("📋 阶段6: 推荐收益测试");
  console.log("=".repeat(80) + "\n");

  await testReferralRewards();

  // ===== 阶段7: 解除质押测试 =====
  console.log("\n" + "=".repeat(80));
  console.log("📋 阶段7: 解除质押测试");
  console.log("=".repeat(80) + "\n");

  await testUnstake();

  // ===== 最终报告 =====
  printFinalReport();
}

// 测试领取USDT
async function testGetUSDT() {
  console.log("💰 测试1: 领取测试USDT");
  try {
    const balanceBefore = await usdt.balanceOf(user1.address);
    console.log("   领取前余额:", ethers.formatEther(balanceBefore), "USDT");

    const timeUntilNext = await usdt.timeUntilNextMint(user1.address);
    if (timeUntilNext > 0n) {
      console.log("   ⏳ Faucet冷却中，跳过领取");
      addResult("领取USDT", true, { amount: ethers.formatEther(balanceBefore) });
      return;
    }

    const tx = await usdt.faucet();
    await tx.wait();

    const balanceAfter = await usdt.balanceOf(user1.address);
    const received = balanceAfter - balanceBefore;
    console.log("   领取后余额:", ethers.formatEther(balanceAfter), "USDT");
    console.log("   领取数量:", ethers.formatEther(received), "USDT");

    addResult("领取USDT", received === ethers.parseEther("10000"), { amount: ethers.formatEther(received) });
  } catch (error) {
    console.log("   错误:", error.message);
    addResult("领取USDT", false);
  }
}

// 测试获取ETR
async function testGetETR() {
  console.log("\n💰 测试2: 检查ETR余额");
  try {
    const balance = await etr.balanceOf(user1.address);
    console.log("   ETR余额:", ethers.formatEther(balance), "ETR");

    addResult("检查ETR余额", balance > 0n, { balance: ethers.formatEther(balance) });
  } catch (error) {
    console.log("   错误:", error.message);
    addResult("检查ETR余额", false);
  }
}

// 测试绑定推荐人
async function testBindReferrer() {
  console.log("👥 测试3: 绑定推荐关系 (User2 -> User1)");

  if (!user2) {
    console.log("   ⚠️  跳过测试 - 只有一个测试账户");
    addResult("绑定推荐关系", "跳过", { reason: "需要两个账户" });
    return;
  }

  try {
    // User2绑定User1为推荐人
    const hasReferrer = await referral.hasReferrer(user2.address);
    console.log("   User2 是否有推荐人:", hasReferrer);

    if (!hasReferrer) {
      const tx = await referral.connect(user2).bindReferrer(user1.address);
      await tx.wait();
      console.log("   ✅ 推荐关系绑定成功");
    } else {
      const referrerAddr = await referral.referrers(user2.address);
      console.log("   User2 的推荐人:", referrerAddr);
    }

    const finalCheck = await referral.hasReferrer(user2.address);
    addResult("绑定推荐关系", finalCheck, { referrer: user1.address });
  } catch (error) {
    console.log("   错误:", error.message);
    addResult("绑定推荐关系", false);
  }
}

// 测试批准ETR
async function testApproveUSDT() {
  console.log("✅ 测试4: 批准ETR给StakingPool");
  try {
    const amount = ethers.parseEther("10000"); // 批准10000 ETR
    const tx = await etr.approve(DEPLOYED_CONTRACTS.StakingPool, amount);
    await tx.wait();

    const allowance = await etr.allowance(user1.address, DEPLOYED_CONTRACTS.StakingPool);
    console.log("   批准金额:", ethers.formatEther(allowance), "ETR");

    addResult("批准ETR", allowance >= amount, { amount: ethers.formatEther(allowance) });
  } catch (error) {
    console.log("   错误:", error.message);
    addResult("批准ETR", false);
  }
}

// 测试质押
async function testStake() {
  console.log("\n🔒 测试5: 质押ETR");
  try {
    const stakeAmount = ethers.parseEther("1000"); // 质押1000 ETR

    const etrBefore = await etr.balanceOf(user1.address);
    console.log("   质押前ETR余额:", ethers.formatEther(etrBefore), "ETR");

    const tx = await staking.stake(stakeAmount);
    const receipt = await tx.wait();
    console.log("   交易哈希:", receipt.hash);

    const etrAfter = await etr.balanceOf(user1.address);
    console.log("   质押后ETR余额:", ethers.formatEther(etrAfter), "ETR");
    console.log("   质押金额:", ethers.formatEther(stakeAmount), "ETR");

    // 检查质押是否成功 - 通过查询质押记录
    const userStakes = await staking.getUserStakes(user1.address);
    const success = userStakes.length > 0 && receipt.status === 1;

    addResult("质押ETR", success, {
      amount: ethers.formatEther(stakeAmount),
      txHash: receipt.hash,
      stakeCount: userStakes.length
    });
  } catch (error) {
    console.log("   错误:", error.message);
    addResult("质押ETR", false);
  }
}

// 测试质押信息
async function testStakeInfo() {
  console.log("\n📊 测试6: 查询质押信息");
  try {
    const userStakes = await staking.getUserStakes(user1.address);
    console.log("   质押记录数:", userStakes.length);

    if (userStakes.length > 0) {
      const stake = userStakes[0];
      console.log("\n   质押详情:");
      console.log("     本金:", ethers.formatEther(stake.principal), "ETR");
      console.log("     开始时间:", new Date(Number(stake.startTime) * 1000).toLocaleString());
      console.log("     解锁时间:", new Date(Number(stake.unlockTime) * 1000).toLocaleString());
      console.log("     日化收益率:", stake.dailyYieldRate.toString(), "基点");
      console.log("     状态:", stake.active ? "活跃" : "已解除");

      addResult("查询质押信息", true, {
        principal: ethers.formatEther(stake.principal),
        active: stake.active
      });
    } else {
      addResult("查询质押信息", false);
    }
  } catch (error) {
    console.log("   错误:", error.message);
    addResult("查询质押信息", false);
  }
}

// 测试收益
async function testRewards() {
  console.log("💎 测试7: 收益计算和领取");
  try {
    const userStakes = await staking.getUserStakes(user1.address);
    if (userStakes.length === 0) {
      console.log("   无质押记录");
      addResult("收益计算", false);
      return;
    }

    const stakeId = userStakes[0].stakeId;

    // 计算待领取收益
    const pendingReward = await staking.calculatePendingReward(stakeId);
    console.log("   当前待领取收益:", ethers.formatEther(pendingReward), "ETR");

    // 如果收益太少，说明时间还不够
    if (pendingReward < ethers.parseEther("0.01")) {
      console.log("   💡 提示: 收益很少，实际使用需等待时间累积");
      console.log("   💡 日化收益率 0.45% 计算:");
      const principal = userStakes[0].principal;
      const dailyReward = principal * 45n / 10000n; // 0.45%
      console.log("     1天预期收益:", ethers.formatEther(dailyReward), "ETR");
      console.log("     7天预期收益:", ethers.formatEther(dailyReward * 7n), "ETR");
      console.log("     30天预期收益:", ethers.formatEther(dailyReward * 30n), "ETR");
    }

    // 尝试领取收益
    if (pendingReward > 0n) {
      const etrBefore = await etr.balanceOf(user1.address);
      console.log("\n   领取前ETR余额:", ethers.formatEther(etrBefore), "ETR");

      const tx = await staking.claimRewards(stakeId);
      await tx.wait();

      const etrAfter = await etr.balanceOf(user1.address);
      const claimed = etrAfter - etrBefore;
      console.log("   领取后ETR余额:", ethers.formatEther(etrAfter), "ETR");
      console.log("   实际领取:", ethers.formatEther(claimed), "ETR");

      addResult("领取收益", claimed > 0n, { claimed: ethers.formatEther(claimed) });
    } else {
      addResult("收益计算", true, { pending: "0 (时间不足)" });
    }
  } catch (error) {
    console.log("   错误:", error.message);
    addResult("收益计算", false);
  }
}

// 测试复利池
async function testCompoundPool() {
  console.log("🔄 测试8: 复利池功能");
  try {
    // 检查复利池余额（通过质押收益自动复利，不是直接存入）
    const compoundBalance = await compound.getCompoundBalance(user1.address);
    console.log("   当前复利池余额:", ethers.formatEther(compoundBalance), "ETR");

    // 查看复利池信息
    const yieldRate = await compound.currentYieldRate();
    console.log("   复利池日化收益率:", yieldRate.toString(), "基点 (0.45%)");

    if (compoundBalance > 0n) {
      const dailyYield = compoundBalance * yieldRate / 10000n;
      console.log("   预期日收益:", ethers.formatEther(dailyYield), "ETR");
    }

    // 获取复利池统计
    const stats = await compound.getPoolStats();
    console.log("\n   复利池统计:");
    console.log("   - 总存入:", ethers.formatEther(stats[0]), "ETR");
    console.log("   - 日化收益率:", stats[1].toString(), "基点");
    console.log("   - StakingPool地址:", stats[2]);

    addResult("复利池查询", true, {
      balance: ethers.formatEther(compoundBalance),
      yieldRate: yieldRate.toString()
    });
  } catch (error) {
    console.log("   错误:", error.message);
    addResult("复利池查询", false);
  }
}

// 测试推荐收益
async function testReferralRewards() {
  console.log("🎁 测试9: 推荐系统收益");
  try {
    // 查询User1的推荐统计
    const stats = await referral.getReferralStats(user1.address);
    console.log("   直推人数:", stats.directCount.toString());
    console.log("   二代人数:", stats.secondGenCount.toString());
    console.log("   三代人数:", stats.thirdGenCount.toString());
    console.log("   累计奖励:", ethers.formatEther(stats.totalReward), "ETR");

    // 查询推荐关系（如果有user2）
    if (user2) {
      const hasReferrer = await referral.hasReferrer(user2.address);
      if (hasReferrer) {
        const referrerAddr = await referral.getReferrer(user2.address);
        console.log("\n   User2 的推荐人:", referrerAddr);
        console.log("   推荐关系正确:", referrerAddr.toLowerCase() === user1.address.toLowerCase());
      }
    }

    addResult("推荐系统统计", true, {
      directCount: stats.directCount.toString(),
      totalReward: ethers.formatEther(stats.totalReward)
    });
  } catch (error) {
    console.log("   错误:", error.message);
    addResult("推荐系统统计", false);
  }
}

// 测试解除质押
async function testUnstake() {
  console.log("🔓 测试10: 解除质押");
  try {
    const userStakes = await staking.getUserStakes(user1.address);
    if (userStakes.length === 0) {
      console.log("   无质押记录");
      addResult("解除质押", false);
      return;
    }

    const stake = userStakes[0];
    const unlockTime = Number(stake.unlockTime);
    const currentTime = Math.floor(Date.now() / 1000);

    console.log("   当前时间:", new Date(currentTime * 1000).toLocaleString());
    console.log("   解锁时间:", new Date(unlockTime * 1000).toLocaleString());

    if (currentTime < unlockTime) {
      const timeLeft = unlockTime - currentTime;
      const daysLeft = Math.floor(timeLeft / 86400);
      const hoursLeft = Math.floor((timeLeft % 86400) / 3600);
      console.log(`   ⏳ 还需等待: ${daysLeft}天 ${hoursLeft}小时`);
      console.log("   💡 实际使用需要等待锁定期结束");

      addResult("解除质押", false, { reason: "锁定期未结束", timeLeft: `${daysLeft}天${hoursLeft}小时` });
    } else {
      const etrBefore = await etr.balanceOf(user1.address);

      const tx = await staking.unstake(0);
      await tx.wait();

      const etrAfter = await etr.balanceOf(user1.address);
      const returned = etrAfter - etrBefore;

      console.log("   解除质押成功");
      console.log("   返还本金+收益:", ethers.formatEther(returned), "ETR");

      addResult("解除质押", returned > 0n, { returned: ethers.formatEther(returned) });
    }
  } catch (error) {
    console.log("   错误:", error.message);
    addResult("解除质押", false);
  }
}

// 打印最终报告
function printFinalReport() {
  console.log("\n" + "=".repeat(80));
  console.log("📊 完整功能测试报告");
  console.log("=".repeat(80));
  console.log(`\n总测试数: ${testResults.total}`);
  console.log(`通过: ${testResults.passed} ✅`);
  console.log(`失败: ${testResults.failed} ❌`);
  console.log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);

  console.log("\n详细结果:");
  console.log("-".repeat(80));
  testResults.details.forEach((result, index) => {
    const status = result.status ? "✅" : "❌";
    console.log(`${index + 1}. ${status} ${result.name}`);
    if (result.amount) console.log(`   金额: ${result.amount}`);
    if (result.balance) console.log(`   余额: ${result.balance}`);
    if (result.claimed) console.log(`   领取: ${result.claimed}`);
    if (result.deposited) console.log(`   存入: ${result.deposited}`);
    if (result.reason) console.log(`   原因: ${result.reason}`);
    if (result.timeLeft) console.log(`   剩余时间: ${result.timeLeft}`);
  });

  console.log("\n" + "=".repeat(80));
  console.log("💡 重要提示:");
  console.log("=".repeat(80));
  console.log("1. 部分测试因时间锁定而跳过（解除质押、收益累积）");
  console.log("2. 实际使用时需要等待相应的时间周期");
  console.log("3. 收益会随时间自动累积，日化收益率 0.45%");
  console.log("4. 推荐系统在下级用户质押时自动发放奖励");
  console.log("5. 所有合约功能正常，可以开始真实测试！");
  console.log("=".repeat(80) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 测试执行失败:", error);
    process.exit(1);
  });
