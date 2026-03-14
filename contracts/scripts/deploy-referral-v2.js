// deploy-referral-v2.js
// 部署 ReferralSystemV2 合约脚本

const { ethers } = require("hardhat");

async function main() {
    console.log("========================================");
    console.log("Deploying ReferralSystemV2...");
    console.log("========================================");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());
    
    // 部署参数
    const STAKING_POOL = process.env.STAKING_POOL_ADDRESS || "0x..."; // 需要替换
    const PRICE_ORACLE = process.env.PRICE_ORACLE_ADDRESS || "0x..."; // 需要替换
    
    console.log("\nDeployment Parameters:");
    console.log("  StakingPool:", STAKING_POOL);
    console.log("  PriceOracle:", PRICE_ORACLE);
    
    // 部署合约
    const ReferralSystemV2 = await ethers.getContractFactory("ReferralSystemV2");
    const referralSystemV2 = await ReferralSystemV2.deploy(STAKING_POOL, PRICE_ORACLE);
    
    await referralSystemV2.waitForDeployment();
    
    const contractAddress = await referralSystemV2.getAddress();
    
    console.log("\n========================================");
    console.log("ReferralSystemV2 deployed to:", contractAddress);
    console.log("========================================");
    
    // 验证部署
    console.log("\nVerifying deployment...");
    
    const [defaultFirst, defaultSecond, defaultThird] = await referralSystemV2.getDefaultRates();
    console.log("Default Rates:");
    console.log("  First Generation:", defaultFirst.toString(), "bps (", (defaultFirst / 100).toString(), "%)");
    console.log("  Second Generation:", defaultSecond.toString(), "bps (", (defaultSecond / 100).toString(), "%)");
    console.log("  Third Generation:", defaultThird.toString(), "bps (", (defaultThird / 100).toString(), "%)");
    
    const deploymentTime = await referralSystemV2.deploymentTime();
    console.log("\nDeployment Time:", new Date(Number(deploymentTime) * 1000).toISOString());
    
    console.log("\nNext Steps:");
    console.log("1. Update StakingPool to use new ReferralSystemV2 address");
    console.log("2. Transfer ownership to multi-sig wallet");
    console.log("3. Test referral binding functionality");
    console.log("4. Configure custom rates for specific users (if needed)");
    
    // 保存部署信息
    const deploymentInfo = {
        contract: "ReferralSystemV2",
        address: contractAddress,
        deployer: deployer.address,
        deploymentTime: Number(deploymentTime),
        stakingPool: STAKING_POOL,
        priceOracle: PRICE_ORACLE,
        defaultRates: {
            first: Number(defaultFirst),
            second: Number(defaultSecond),
            third: Number(defaultThird)
        },
        network: (await ethers.provider.getNetwork()).name,
        chainId: (await ethers.provider.getNetwork()).chainId
    };
    
    const fs = require('fs');
    const deploymentPath = `./deployments/referral-v2-${Date.now()}.json`;
    fs.mkdirSync('./deployments', { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\nDeployment info saved to:", deploymentPath);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
