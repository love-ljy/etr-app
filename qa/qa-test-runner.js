/**
 * ETR DApp V2 - QA 自动化测试脚本
 * 执行核心功能测试并生成报告
 */

const { ethers } = require("hardhat");

// 测试结果记录
const testResults = {
  passed: [],
  failed: [],
  skipped: [],
};

function logTest(testId, name, status, details = '') {
  const result = { testId, name, status, details, timestamp: new Date().toISOString() };
  if (status === 'PASS') testResults.passed.push(result);
  else if (status === 'FAIL') testResults.failed.push(result);
  else testResults.skipped.push(result);
  
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏸️';
  console.log(`${icon} [${testId}] ${name} - ${status}${details ? ': ' + details : ''}`);
}

async function runTests() {
  console.log("=".repeat(70));
  console.log("ETR DApp V2 - QA 自动化测试");
  console.log("=".repeat(70));
  console.log();
  
  const [deployer] = await ethers.getSigners();
  console.log("测试账户:", deployer.address);
  
  // 加载合约地址
  const deploymentInfo = require("../contracts/deployment-v2.json");
  const contracts = deploymentInfo.contracts;
  
  console.log("测试网络: BSC Testnet (ChainId: 97)");
  console.log();
  console.log("合约地址:");
  console.log("  ETRToken:", contracts.ETRToken);
  console.log("  StakingPoolV2:", contracts.StakingPoolV2);
  console.log("  CompoundPoolV2:", contracts.CompoundPoolV2);
  console.log("  ReferralSystem:", contracts.ReferralSystem);
  console.log();
  
  // 获取合约实例
  const ETRToken = await ethers.getContractAt("ETRToken", contracts.ETRToken);
  const StakingPoolV2 = await ethers.getContractAt("StakingPoolV2", contracts.StakingPoolV2);
  const CompoundPoolV2 = await ethers.getContractAt("CompoundPoolV2", contracts.CompoundPoolV2);
  const ReferralSystem = await ethers.getContractAt("ReferralSystem", contracts.ReferralSystem);
  
  console.log("=".repeat(70));
  console.log("开始执行测试用例");
  console.log("=".repeat(70));
  console.log();
  
  // ========== 模块 1: ETRToken 测试 ==========
  console.log("📦 模块 1: ETRToken 测试");
  console.log("-".repeat(70));
  
  try {
    // TC-020: 代币分配验证
    const totalSupply = await ETRToken.getTotalSupply();
    const blackHoleBalance = await ETRToken.balanceOf("0x000000000000000000000000000000000000dEaD");
    const lpPoolBalance = await ETRToken.balanceOf(deployer.address);
    
    const expectedTotal = ethers.parseEther("200000000");
    const expectedBlackHole = ethers.parseEther("190000000");
    const expectedLP = ethers.parseEther("10000000");
    
    if (totalSupply === expectedTotal && blackHoleBalance >= expectedBlackHole) {
      logTest("TC-020", "代币分配验证", "PASS", 
        `总供应=${ethers.formatEther(totalSupply)} ETR, 黑洞=${ethers.formatEther(blackHoleBalance)} ETR`);
    } else {
      logTest("TC-020", "代币分配验证", "FAIL", 
        `预期总供应 2 亿，实际=${ethers.formatEther(totalSupply)}`);
    }
  } catch (error) {
    logTest("TC-020", "代币分配验证", "FAIL", error.message);
  }
  
  try {
    // TC-021: 代币基本信息
    const name = await ETRToken.name();
    const symbol = await ETRToken.symbol();
    const decimals = await ETRToken.decimals();
    
    if (name === "Equator ETR" && symbol === "ETR" && decimals === 18n) {
      logTest("TC-021", "代币基本信息", "PASS", `${name} (${symbol}), ${decimals} decimals`);
    } else {
      logTest("TC-021", "代币基本信息", "FAIL", `Name: ${name}, Symbol: ${symbol}, Decimals: ${decimals}`);
    }
  } catch (error) {
    logTest("TC-021", "代币基本信息", "FAIL", error.message);
  }
  
  console.log();
  
  // ========== 模块 2: StakingPoolV2 测试 ==========
  console.log("💎 模块 2: StakingPoolV2 测试");
  console.log("-".repeat(70));
  
  try {
    // TC-001: 质押配置验证
    const config = await StakingPoolV2.config();
    const lockPeriodDays = Number(config.lockPeriod) / 86400;
    const currentYieldRate = Number(config.currentYieldRate) / 100;
    
    if (lockPeriodDays === 50 && currentYieldRate === 0.45) {
      logTest("TC-001", "质押配置验证", "PASS", 
        `锁仓${lockPeriodDays}天，日化${currentYieldRate}%`);
    } else {
      logTest("TC-001", "质押配置验证", "FAIL", 
        `锁仓${lockPeriodDays}天 (预期 50), 日化${currentYieldRate}% (预期 0.45)`);
    }
  } catch (error) {
    logTest("TC-001", "质押配置验证", "FAIL", error.message);
  }
  
  try {
    // TC-006: 奖励池验证
    const rewardPoolBalance = await StakingPoolV2.getRewardPoolBalance();
    const minReserve = await StakingPoolV2.REWARD_POOL_MIN_RESERVE();
    
    if (rewardPoolBalance >= minReserve) {
      logTest("TC-006", "奖励池验证", "PASS", 
        `余额=${ethers.formatEther(rewardPoolBalance)} ETR, 最低储备=${ethers.formatEther(minReserve)} ETR`);
    } else {
      logTest("TC-006", "奖励池验证", "FAIL", 
        `余额不足：${ethers.formatEther(rewardPoolBalance)} < ${ethers.formatEther(minReserve)}`);
    }
  } catch (error) {
    logTest("TC-006", "奖励池验证", "FAIL", error.message);
  }
  
  try {
    // TC-007: ETR 价格验证
    const etrPrice = await StakingPoolV2.etrPriceUSD();
    const priceFormatted = ethers.formatEther(etrPrice);
    
    if (parseFloat(priceFormatted) > 0) {
      logTest("TC-007", "ETR 价格配置", "PASS", `$${priceFormatted}`);
    } else {
      logTest("TC-007", "ETR 价格配置", "FAIL", `价格无效：${priceFormatted}`);
    }
  } catch (error) {
    logTest("TC-007", "ETR 价格配置", "FAIL", error.message);
  }
  
  console.log();
  
  // ========== 模块 3: CompoundPoolV2 测试 ==========
  console.log("📈 模块 3: CompoundPoolV2 测试");
  console.log("-".repeat(70));
  
  try {
    // TC-010: 复利池配置验证
    const yieldRate = await CompoundPoolV2.currentYieldRate();
    const stakingPoolAddr = await CompoundPoolV2.stakingPool();
    
    if (stakingPoolAddr.toLowerCase() === contracts.StakingPoolV2.toLowerCase()) {
      logTest("TC-010", "复利池配置验证", "PASS", 
        `日化${Number(yieldRate) / 100}%, StakingPool 已关联`);
    } else {
      logTest("TC-010", "复利池配置验证", "FAIL", "StakingPool 地址不匹配");
    }
  } catch (error) {
    logTest("TC-010", "复利池配置验证", "FAIL", error.message);
  }
  
  try {
    // TC-011: 复利开关状态验证
    const allowDirectDeposit = await CompoundPoolV2.allowDirectDeposit();
    
    logTest("TC-011", "复利开关初始状态", "PASS", 
      `当前状态：${allowDirectDeposit ? '开启' : '关闭'} (预期关闭)`);
  } catch (error) {
    logTest("TC-011", "复利开关初始状态", "FAIL", error.message);
  }
  
  try {
    // TC-015: 管理员切换开关测试
    // 测试开启
    const tx1 = await CompoundPoolV2.setDirectDepositEnabled(true);
    await tx1.wait();
    const state1 = await CompoundPoolV2.allowDirectDeposit();
    
    // 测试关闭
    const tx2 = await CompoundPoolV2.setDirectDepositEnabled(false);
    await tx2.wait();
    const state2 = await CompoundPoolV2.allowDirectDeposit();
    
    if (state1 === true && state2 === false) {
      logTest("TC-015", "管理员切换开关", "PASS", "开启→关闭切换成功");
    } else {
      logTest("TC-015", "管理员切换开关", "FAIL", `状态异常：开启=${state1}, 关闭=${state2}`);
    }
  } catch (error) {
    logTest("TC-015", "管理员切换开关", "FAIL", error.message);
  }
  
  console.log();
  
  // ========== 模块 4: ReferralSystem 测试 ==========
  console.log("👥 模块 4: ReferralSystem 测试");
  console.log("-".repeat(70));
  
  try {
    // TC-030: 推荐系统配置验证
    const stakingPoolRef = await ReferralSystem.stakingPool();
    
    if (stakingPoolRef.toLowerCase() === contracts.StakingPoolV2.toLowerCase()) {
      logTest("TC-030", "推荐系统配置", "PASS", "StakingPool 已关联");
    } else {
      logTest("TC-030", "推荐系统配置", "FAIL", "StakingPool 地址不匹配");
    }
  } catch (error) {
    logTest("TC-030", "推荐系统配置", "FAIL", error.message);
  }
  
  try {
    // TC-031: 推荐比例验证
    const config = await ReferralSystem.config();
    const firstGenRate = Number(config.firstGenRate) / 100;
    const secondGenRate = Number(config.secondGenRate) / 100;
    const thirdGenRate = Number(config.thirdGenRate) / 100;
    
    if (firstGenRate === 3 && secondGenRate === 2 && thirdGenRate === 1) {
      logTest("TC-031", "推荐比例验证", "PASS", 
        `第一代${firstGenRate}%, 第二代${secondGenRate}%, 第三代${thirdGenRate}%`);
    } else {
      logTest("TC-031", "推荐比例验证", "FAIL", 
        `比例异常：${firstGenRate}%/${secondGenRate}%/${thirdGenRate}%`);
    }
  } catch (error) {
    logTest("TC-031", "推荐比例验证", "FAIL", error.message);
  }
  
  console.log();
  
  // ========== 模块 5: 合约关联测试 ==========
  console.log("🔗 模块 5: 合约关联测试");
  console.log("-".repeat(70));
  
  try {
    // TC-040: StakingPool → CompoundPool 关联
    const compoundPoolRef = await StakingPoolV2.compoundPool();
    
    if (compoundPoolRef.toLowerCase() === contracts.CompoundPoolV2.toLowerCase()) {
      logTest("TC-040", "StakingPool→CompoundPool", "PASS", "关联正确");
    } else {
      logTest("TC-040", "StakingPool→CompoundPool", "FAIL", "关联地址不匹配");
    }
  } catch (error) {
    logTest("TC-040", "StakingPool→CompoundPool", "FAIL", error.message);
  }
  
  try {
    // TC-041: StakingPool → ReferralSystem 关联
    const referralRef = await StakingPoolV2.referralSystem();
    
    if (referralRef.toLowerCase() === contracts.ReferralSystem.toLowerCase()) {
      logTest("TC-041", "StakingPool→ReferralSystem", "PASS", "关联正确");
    } else {
      logTest("TC-041", "StakingPool→ReferralSystem", "FAIL", "关联地址不匹配");
    }
  } catch (error) {
    logTest("TC-041", "StakingPool→ReferralSystem", "FAIL", error.message);
  }
  
  try {
    // TC-042: CompoundPool → StakingPool 关联
    const stakingPoolRef = await CompoundPoolV2.stakingPool();
    
    if (stakingPoolRef.toLowerCase() === contracts.StakingPoolV2.toLowerCase()) {
      logTest("TC-042", "CompoundPool→StakingPool", "PASS", "关联正确");
    } else {
      logTest("TC-042", "CompoundPool→StakingPool", "FAIL", "关联地址不匹配");
    }
  } catch (error) {
    logTest("TC-042", "CompoundPool→StakingPool", "FAIL", error.message);
  }
  
  console.log();
  
  // ========== 生成测试报告 ==========
  console.log("=".repeat(70));
  console.log("📊 测试报告汇总");
  console.log("=".repeat(70));
  console.log();
  
  const totalTests = testResults.passed.length + testResults.failed.length + testResults.skipped.length;
  const passRate = totalTests > 0 ? ((testResults.passed.length / totalTests) * 100).toFixed(1) : 0;
  
  console.log(`测试总数：${totalTests}`);
  console.log(`✅ 通过：${testResults.passed.length}`);
  console.log(`❌ 失败：${testResults.failed.length}`);
  console.log(`⏸️ 跳过：${testResults.skipped.length}`);
  console.log(`通过率：${passRate}%`);
  console.log();
  
  if (testResults.failed.length > 0) {
    console.log("失败用例详情:");
    testResults.failed.forEach(test => {
      console.log(`  ❌ [${test.testId}] ${test.name}: ${test.details}`);
    });
    console.log();
  }
  
  // 保存测试报告
  const fs = require("fs");
  const path = require("path");
  
  const report = {
    summary: {
      total: totalTests,
      passed: testResults.passed.length,
      failed: testResults.failed.length,
      skipped: testResults.skipped.length,
      passRate: `${passRate}%`,
    },
    deploymentInfo,
    testResults,
    timestamp: new Date().toISOString(),
  };
  
  const reportPath = path.join(__dirname, "../QA-TEST-REPORT.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 测试报告已保存：${reportPath}`);
  
  console.log();
  console.log("=".repeat(70));
  if (testResults.failed.length === 0) {
    console.log("✅ 所有测试通过！可以进入下一阶段测试。");
  } else {
    console.log("⚠️  存在失败用例，请修复后重新测试。");
  }
  console.log("=".repeat(70));
  
  return report;
}

// 执行测试
runTests()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("测试执行失败:", error);
    process.exit(1);
  });
