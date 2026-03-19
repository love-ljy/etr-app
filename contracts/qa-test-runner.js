/**
 * ETR DApp V2 - QA 自动化测试脚本
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const testResults = { passed: [], failed: [], skipped: [] };

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
  
  const deploymentInfo = require("./deployment-v2.json");
  const contracts = deploymentInfo.contracts;
  
  console.log("测试网络：BSC Testnet (ChainId: 97)");
  console.log();
  console.log("合约地址:");
  console.log("  ETRToken:", contracts.ETRToken);
  console.log("  StakingPoolV2:", contracts.StakingPoolV2);
  console.log("  CompoundPoolV2:", contracts.CompoundPoolV2);
  console.log("  ReferralSystem:", contracts.ReferralSystem);
  console.log();
  
  const ETRToken = await ethers.getContractAt("ETRToken", contracts.ETRToken);
  const StakingPoolV2 = await ethers.getContractAt("StakingPoolV2", contracts.StakingPoolV2);
  const CompoundPoolV2 = await ethers.getContractAt("CompoundPoolV2", contracts.CompoundPoolV2);
  const ReferralSystem = await ethers.getContractAt("ReferralSystem", contracts.ReferralSystem);
  
  console.log("=".repeat(70));
  console.log("开始执行测试用例");
  console.log("=".repeat(70));
  console.log();
  
  // TC-020: 代币分配验证
  try {
    const totalSupply = await ETRToken.getTotalSupply();
    const blackHoleBalance = await ETRToken.balanceOf("0x000000000000000000000000000000000000dEaD");
    const expectedTotal = ethers.parseEther("200000000");
    const expectedBlackHole = ethers.parseEther("190000000");
    
    if (totalSupply === expectedTotal && blackHoleBalance >= expectedBlackHole) {
      logTest("TC-020", "代币分配验证", "PASS", `总供应=${ethers.formatEther(totalSupply)} ETR`);
    } else {
      logTest("TC-020", "代币分配验证", "FAIL", `实际=${ethers.formatEther(totalSupply)}`);
    }
  } catch (error) {
    logTest("TC-020", "代币分配验证", "FAIL", error.message);
  }
  
  // TC-021: 代币基本信息
  try {
    const name = await ETRToken.name();
    const symbol = await ETRToken.symbol();
    const decimals = await ETRToken.decimals();
    
    if (name === "Equator ETR" && symbol === "ETR" && decimals === 18n) {
      logTest("TC-021", "代币基本信息", "PASS", `${name} (${symbol})`);
    } else {
      logTest("TC-021", "代币基本信息", "FAIL", `Name: ${name}, Symbol: ${symbol}`);
    }
  } catch (error) {
    logTest("TC-021", "代币基本信息", "FAIL", error.message);
  }
  
  // TC-001: 质押配置验证
  try {
    const config = await StakingPoolV2.config();
    const lockPeriodDays = Number(config.lockPeriod) / 86400;
    const currentYieldRate = Number(config.maxYieldRate) / 100;
    
    if (lockPeriodDays === 50) {
      logTest("TC-001", "质押配置验证", "PASS", `锁仓${lockPeriodDays}天`);
    } else {
      logTest("TC-001", "质押配置验证", "FAIL", `锁仓${lockPeriodDays}天 (预期 50)`);
    }
  } catch (error) {
    logTest("TC-001", "质押配置验证", "FAIL", error.message);
  }
  
  // TC-006: 奖励池验证
  try {
    const rewardPoolBalance = await StakingPoolV2.getRewardPoolBalance();
    const minReserve = await StakingPoolV2.REWARD_POOL_MIN_RESERVE();
    
    if (rewardPoolBalance >= minReserve) {
      logTest("TC-006", "奖励池验证", "PASS", `余额=${ethers.formatEther(rewardPoolBalance)} ETR`);
    } else {
      logTest("TC-006", "奖励池验证", "FAIL", `余额不足`);
    }
  } catch (error) {
    logTest("TC-006", "奖励池验证", "FAIL", error.message);
  }
  
  // TC-007: ETR 价格验证
  try {
    const etrPrice = await StakingPoolV2.etrPriceUSD();
    const priceFormatted = ethers.formatEther(etrPrice);
    
    if (parseFloat(priceFormatted) > 0) {
      logTest("TC-007", "ETR 价格配置", "PASS", `$${priceFormatted}`);
    } else {
      logTest("TC-007", "ETR 价格配置", "FAIL", `价格无效`);
    }
  } catch (error) {
    logTest("TC-007", "ETR 价格配置", "FAIL", error.message);
  }
  
  // TC-010: 复利池配置验证
  try {
    const yieldRate = await CompoundPoolV2.currentYieldRate();
    const stakingPoolAddr = await CompoundPoolV2.stakingPool();
    
    if (stakingPoolAddr.toLowerCase() === contracts.StakingPoolV2.toLowerCase()) {
      logTest("TC-010", "复利池配置验证", "PASS", `日化${Number(yieldRate) / 100}%`);
    } else {
      logTest("TC-010", "复利池配置验证", "FAIL", "StakingPool 地址不匹配");
    }
  } catch (error) {
    logTest("TC-010", "复利池配置验证", "FAIL", error.message);
  }
  
  // TC-011: 复利开关初始状态
  try {
    const allowDirectDeposit = await CompoundPoolV2.allowDirectDeposit();
    logTest("TC-011", "复利开关初始状态", "PASS", `${allowDirectDeposit ? '开启' : '关闭'}`);
  } catch (error) {
    logTest("TC-011", "复利开关初始状态", "FAIL", error.message);
  }
  
  // TC-015: 管理员切换开关测试
  try {
    const tx1 = await CompoundPoolV2.setDirectDepositEnabled(true);
    await tx1.wait();
    const state1 = await CompoundPoolV2.allowDirectDeposit();
    
    const tx2 = await CompoundPoolV2.setDirectDepositEnabled(false);
    await tx2.wait();
    const state2 = await CompoundPoolV2.allowDirectDeposit();
    
    if (state1 === true && state2 === false) {
      logTest("TC-015", "管理员切换开关", "PASS", "开启→关闭切换成功");
    } else {
      logTest("TC-015", "管理员切换开关", "FAIL", `状态异常`);
    }
  } catch (error) {
    logTest("TC-015", "管理员切换开关", "FAIL", error.message);
  }
  
  // TC-030: 推荐系统配置
  try {
    const stakingPoolRef = await ReferralSystem.stakingPool();
    if (stakingPoolRef.toLowerCase() === contracts.StakingPoolV2.toLowerCase()) {
      logTest("TC-030", "推荐系统配置", "PASS", "StakingPool 已关联");
    } else {
      logTest("TC-030", "推荐系统配置", "FAIL", "地址不匹配");
    }
  } catch (error) {
    logTest("TC-030", "推荐系统配置", "FAIL", error.message);
  }
  
  // TC-031: 推荐比例验证
  try {
    const config = await ReferralSystem.config();
    const firstGenRate = Number(config.firstGenRate) / 100;
    const secondGenRate = Number(config.secondGenRate) / 100;
    const thirdGenRate = Number(config.thirdGenRate) / 100;
    
    if (firstGenRate === 3 && secondGenRate === 2 && thirdGenRate === 1) {
      logTest("TC-031", "推荐比例验证", "PASS", `${firstGenRate}%/${secondGenRate}%/${thirdGenRate}%`);
    } else {
      logTest("TC-031", "推荐比例验证", "FAIL", `比例异常`);
    }
  } catch (error) {
    logTest("TC-031", "推荐比例验证", "FAIL", error.message);
  }
  
  // TC-040: StakingPool → CompoundPool 关联
  try {
    const compoundPoolRef = await StakingPoolV2.compoundPool();
    if (compoundPoolRef.toLowerCase() === contracts.CompoundPoolV2.toLowerCase()) {
      logTest("TC-040", "StakingPool→CompoundPool", "PASS", "关联正确");
    } else {
      logTest("TC-040", "StakingPool→CompoundPool", "FAIL", "地址不匹配");
    }
  } catch (error) {
    logTest("TC-040", "StakingPool→CompoundPool", "FAIL", error.message);
  }
  
  // TC-041: StakingPool → ReferralSystem 关联
  try {
    const referralRef = await StakingPoolV2.referralSystem();
    if (referralRef.toLowerCase() === contracts.ReferralSystem.toLowerCase()) {
      logTest("TC-041", "StakingPool→ReferralSystem", "PASS", "关联正确");
    } else {
      logTest("TC-041", "StakingPool→ReferralSystem", "FAIL", "地址不匹配");
    }
  } catch (error) {
    logTest("TC-041", "StakingPool→ReferralSystem", "FAIL", error.message);
  }
  
  // TC-042: CompoundPool → StakingPool 关联
  try {
    const stakingPoolRef = await CompoundPoolV2.stakingPool();
    if (stakingPoolRef.toLowerCase() === contracts.StakingPoolV2.toLowerCase()) {
      logTest("TC-042", "CompoundPool→StakingPool", "PASS", "关联正确");
    } else {
      logTest("TC-042", "CompoundPool→StakingPool", "FAIL", "地址不匹配");
    }
  } catch (error) {
    logTest("TC-042", "CompoundPool→StakingPool", "FAIL", error.message);
  }
  
  // 生成报告
  console.log();
  console.log("=".repeat(70));
  console.log("📊 测试报告汇总");
  console.log("=".repeat(70));
  
  const totalTests = testResults.passed.length + testResults.failed.length;
  const passRate = totalTests > 0 ? ((testResults.passed.length / totalTests) * 100).toFixed(1) : 0;
  
  console.log(`测试总数：${totalTests}`);
  console.log(`✅ 通过：${testResults.passed.length}`);
  console.log(`❌ 失败：${testResults.failed.length}`);
  console.log(`通过率：${passRate}%`);
  console.log();
  
  if (testResults.failed.length > 0) {
    console.log("失败用例:");
    testResults.failed.forEach(t => console.log(`  ❌ [${t.testId}] ${t.name}: ${t.details}`));
    console.log();
  }
  
  const report = {
    summary: { total: totalTests, passed: testResults.passed.length, failed: testResults.failed.length, passRate: `${passRate}%` },
    deploymentInfo,
    testResults,
    timestamp: new Date().toISOString(),
  };
  
  const reportPath = path.join(__dirname, "QA-TEST-REPORT.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 测试报告已保存：${reportPath}`);
  console.log();
  console.log("=".repeat(70));
  console.log(testResults.failed.length === 0 ? "✅ 所有测试通过！" : "⚠️ 存在失败用例");
  console.log("=".repeat(70));
}

runTests()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("测试失败:", error);
    process.exit(1);
  });
