import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // 1. 部署Mock PancakePair（用于测试）
  console.log("\n1. Deploying Mock PancakePair...");
  const MockPancakePair = await ethers.getContractFactory("MockPancakePair");
  const mockPair = await MockPancakePair.deploy();
  await mockPair.deployed();
  console.log("MockPancakePair deployed to:", mockPair.address);

  // 2. 部署PriceOracle
  console.log("\n2. Deploying PriceOracle...");
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy(mockPair.address, true); // ETR是token0
  await priceOracle.deployed();
  console.log("PriceOracle deployed to:", priceOracle.address);

  // 3. 部署ETRToken
  console.log("\n3. Deploying ETRToken...");
  // 黑洞地址（常用）
  const blackHoleAddress = "0x000000000000000000000000000000000000dEaD";
  // LP池地址（这里使用deployer地址作为LP池，实际部署时替换为真实LP池地址）
  const lpPoolAddress = deployer.address;

  const ETRToken = await ethers.getContractFactory("ETRToken");
  const etrToken = await ETRToken.deploy(blackHoleAddress, lpPoolAddress);
  await etrToken.deployed();
  console.log("ETRToken deployed to:", etrToken.address);

  // 4. 验证代币分配
  console.log("\n4. Verifying token distribution...");
  const blackHoleBalance = await etrToken.balanceOf(blackHoleAddress);
  const lpPoolBalance = await etrToken.balanceOf(lpPoolAddress);
  const totalSupply = await etrToken.totalSupply();

  console.log("Black hole balance:", ethers.utils.formatEther(blackHoleBalance), "ETR");
  console.log("LP pool balance:", ethers.utils.formatEther(lpPoolBalance), "ETR");
  console.log("Total supply:", ethers.utils.formatEther(totalSupply), "ETR");

  // 验证分配比例
  const expectedBlackHoleAmount = ethers.utils.parseEther("190000000"); // 95%
  const expectedLpAmount = ethers.utils.parseEther("10000000"); // 5%

  if (blackHoleBalance.eq(expectedBlackHoleAmount)) {
    console.log("✅ Black hole allocation correct (95%)");
  } else {
    console.log("❌ Black hole allocation incorrect!");
  }

  if (lpPoolBalance.eq(expectedLpAmount)) {
    console.log("✅ LP pool allocation correct (5%)");
  } else {
    console.log("❌ LP pool allocation incorrect!");
  }

  // 5. 设置PriceOracle的LP交易对
  console.log("\n5. Setting up PriceOracle...");
  // 在实际部署时，需要设置真实的PancakeSwap LP交易对地址
  // await priceOracle.setLPPair("0x...");
  console.log("PriceOracle LP pair:", await priceOracle.pancakePair());

  // 6. 配置ETRToken的PriceOracle引用
  console.log("\n6. Configuring ETRToken...");
  // 将PriceOracle设置为SlippageController（简化处理）
  await etrToken.setSlippageController(priceOracle.address);
  console.log("ETRToken slippage controller set to:", priceOracle.address);

  // 7. 测试价格查询
  console.log("\n7. Testing price oracle...");
  // 设置储备量
  await mockPair.setReserves(
    ethers.utils.parseEther("1000000"), // 1M ETR
    ethers.utils.parseEther("100000")   // 100k BUSD
  );

  // 更新价格
  await priceOracle.updatePrice();
  const currentPrice = await priceOracle.currentPrice();
  console.log("Current ETR price:", ethers.utils.formatEther(currentPrice), "BUSD");

  // 8. 保存部署信息
  console.log("\n8. Deployment summary:");
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    contracts: {
      ETRToken: etrToken.address,
      PriceOracle: priceOracle.address,
      MockPancakePair: mockPair.address,
    },
    timestamp: new Date().toISOString(),
  };

  console.log(JSON.stringify(deploymentInfo, null, 2));

  console.log("\n✅ Deployment completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
