// 创建 ETR/USDT 流动性池脚本
// 1. 部署 MockUSDT
// 2. 铸造 ETR 和 USDT 给部署者
// 3. 在 PancakeSwap 创建流动性池

const { ethers } = require("hardhat");

// PancakeSwap V2 Router 地址 (BSC Testnet)
const PANCAKE_ROUTER = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
const PANCAKE_FACTORY = "0x6725F303b657a9451d8BA641348b6761A6CC7a17";

// 已部署的合约地址
const DEPLOYED_CONTRACTS = {
  ETRToken: "0xC163C4DFE7e8bAd2E3d9db64BF5EEf944F4484c5",
  PriceOracle: "0xBF73DB25F5f58d206f1eaE05492ccb5643C08A38",
  StakingPool: "0x3E08D67Ee44C7385EF57f2c1b0833f2eDe776789",
  ReferralSystemV2: "0x1f990C344d9f72344684F5cF2E4ed18a59F62609",
  CompoundPool: "0xcF1c5E6e94c16a0501eb0fa399D674826B3a4363",
  DividendPool: "0x77e670EE1D0B4461B7399cf86f8624373FEB6b84",
  SlippageController: "0xF6b61E9a65607198Ababe08c071Ae9eEaEaBee0A",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("操作账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "BNB");

  const network = await ethers.provider.getNetwork();
  console.log("网络:", network.name, "ChainID:", network.chainId);
  console.log("\n" + "=".repeat(60));

  // 1. 部署 MockUSDT
  console.log("\n📝 步骤 1: 部署 MockUSDT...");
  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const usdt = await MockUSDT.deploy();
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();
  console.log("✅ MockUSDT 部署成功:", usdtAddress);

  // 检查 USDT 余额（部署时已铸造 1,000,000）
  const usdtBalance = await usdt.balanceOf(deployer.address);
  console.log("   部署者 USDT 余额:", ethers.formatEther(usdtBalance), "USDT");

  // 2. 获取 ETRToken 合约并检查余额
  console.log("\n📝 步骤 2: 检查 ETR 代币余额...");
  const ETRToken = await ethers.getContractFactory("ETRToken");
  const etr = ETRToken.attach(DEPLOYED_CONTRACTS.ETRToken);

  // 检查当前余额
  const etrBalance = await etr.balanceOf(deployer.address);
  console.log("   部署者当前 ETR 余额:", ethers.formatEther(etrBalance), "ETR");

  if (etrBalance < ethers.parseEther("100000")) {
    throw new Error("ETR 余额不足，需要至少 100,000 ETR");
  }
  console.log("✅ ETR 余额充足，可以创建流动性池");

  // 3. 准备添加流动性的数量
  console.log("\n📝 步骤 3: 准备添加流动性...");
  // 添加 100,000 ETR 和 100,000 USDT (1:1 初始价格)
  const etrAmount = ethers.parseEther("100000");
  const usdtAmount = ethers.parseEther("100000");

  console.log("   ETR 数量:", ethers.formatEther(etrAmount));
  console.log("   USDT 数量:", ethers.formatEther(usdtAmount));

  // 4. 批准 PancakeSwap Router
  console.log("\n📝 步骤 4: 批准 PancakeSwap Router...");

  console.log("   批准 ETR...");
  await (await etr.approve(PANCAKE_ROUTER, etrAmount)).wait();
  console.log("   ✅ ETR 批准完成");

  console.log("   批准 USDT...");
  await (await usdt.approve(PANCAKE_ROUTER, usdtAmount)).wait();
  console.log("   ✅ USDT 批准完成");

  // 5. 添加流动性
  console.log("\n📝 步骤 5: 在 PancakeSwap 添加流动性...");

  // PancakeSwap Router ABI
  const routerABI = [
    "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)",
    "function factory() external pure returns (address)"
  ];

  const router = new ethers.Contract(PANCAKE_ROUTER, routerABI, deployer);

  // 设置滑点容忍度为5% (amountMin = amount * 0.95)
  const amountETRMin = etrAmount * 95n / 100n;
  const amountUSDTMin = usdtAmount * 95n / 100n;

  // 设置截止时间为20分钟后
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

  console.log("   正在添加流动性...");
  console.log("   ETR Token:", DEPLOYED_CONTRACTS.ETRToken);
  console.log("   USDT Token:", usdtAddress);

  const tx = await router.addLiquidity(
    DEPLOYED_CONTRACTS.ETRToken,
    usdtAddress,
    etrAmount,
    usdtAmount,
    amountETRMin,
    amountUSDTMin,
    deployer.address,
    deadline
  );

  console.log("   交易已提交:", tx.hash);
  const receipt = await tx.wait();
  console.log("✅ 流动性添加成功!");

  // 6. 获取 LP Pair 地址
  console.log("\n📝 步骤 6: 获取 LP Pair 地址...");

  const factoryABI = [
    "function getPair(address tokenA, address tokenB) external view returns (address pair)"
  ];

  const factory = new ethers.Contract(PANCAKE_FACTORY, factoryABI, deployer);
  const lpPairAddress = await factory.getPair(DEPLOYED_CONTRACTS.ETRToken, usdtAddress);

  console.log("✅ LP Pair 地址:", lpPairAddress);

  // 7. 更新 PriceOracle
  console.log("\n📝 步骤 7: 更新 PriceOracle LP 地址...");

  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = PriceOracle.attach(DEPLOYED_CONTRACTS.PriceOracle);

  await (await priceOracle.setLPPair(lpPairAddress)).wait();
  console.log("✅ PriceOracle 已更新 LP Pair 地址");

  // 最终总结
  console.log("\n" + "=".repeat(60));
  console.log("🎉 流动性池创建完成！");
  console.log("=".repeat(60));
  console.log("\n部署信息:");
  console.log("MockUSDT:", usdtAddress);
  console.log("ETR/USDT LP Pair:", lpPairAddress);
  console.log("\n流动性信息:");
  console.log("ETR:", ethers.formatEther(etrAmount), "ETR");
  console.log("USDT:", ethers.formatEther(usdtAmount), "USDT");
  console.log("初始价格: 1 ETR = 1 USDT");
  console.log("\nPancakeSwap 链接:");
  console.log(`https://pancake.kiemtienonline360.com/#/add/${DEPLOYED_CONTRACTS.ETRToken}/${usdtAddress}`);
  console.log("\nBSCScan 链接:");
  console.log("USDT:", `https://testnet.bscscan.com/address/${usdtAddress}`);
  console.log("LP Pair:", `https://testnet.bscscan.com/address/${lpPairAddress}`);
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 执行失败:", error);
    process.exit(1);
  });
