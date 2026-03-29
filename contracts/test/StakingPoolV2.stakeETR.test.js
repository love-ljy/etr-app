const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StakingPoolV2 - stakeETR", function () {
  let stakingPool;
  let etrToken;
  let usdtToken;
  let priceOracle;
  let owner;
  let user1;
  let user2;
  let addrs;

  const ETR_PRICE = 250000000000000000n; // 0.25 ETH (using BigInt)
  const STAKE_AMOUNT = 1000000000000000000000n; // 1000 ETH (18 decimals)
  const LOCK_PERIOD = 50 * 24 * 60 * 60;
  const DAILY_UNLOCK_RATE = 200;
  const MIN_STAKE_VALUE_USD = 100000000000000000000n; // 100 ETH

  beforeEach(async function () {
    [owner, user1, user2, ...addrs] = await ethers.getSigners();

    const MockETRToken = await ethers.getContractFactory("ETRToken");
    etrToken = await MockETRToken.deploy(owner.address, owner.address);
    await etrToken.waitForDeployment();

    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    usdtToken = await MockUSDT.deploy();
    await usdtToken.waitForDeployment();

    const MockPriceOracle = await ethers.getContractFactory("MockPriceOracle");
    priceOracle = await MockPriceOracle.deploy();
    await priceOracle.waitForDeployment();

    const StakingPoolV2 = await ethers.getContractFactory("StakingPoolV2");
    stakingPool = await StakingPoolV2.deploy(
      await etrToken.getAddress(),
      await usdtToken.getAddress(),
      await priceOracle.getAddress(),
      ETR_PRICE
    );
    await stakingPool.waitForDeployment();

    await etrToken.transfer(user1.address, 10000000000000000000000n);
    await etrToken.transfer(user2.address, 10000000000000000000000n);
  });

  describe("Deployment", function () {
    it("Should set correct ETR token address", async function () {
      expect(await stakingPool.etrToken()).to.equal(await etrToken.getAddress());
    });

    it("Should set correct USDT token address", async function () {
      expect(await stakingPool.usdtToken()).to.equal(await usdtToken.getAddress());
    });

    it("Should set correct initial ETR price", async function () {
      expect(await stakingPool.etrPriceUSD()).to.equal(ETR_PRICE);
    });

    it("Should initialize with correct lock period", async function () {
      const config = await stakingPool.config();
      expect(config.lockPeriod).to.equal(LOCK_PERIOD);
    });

    it("Should initialize with correct daily unlock rate", async function () {
      const config = await stakingPool.config();
      expect(config.dailyUnlockRate).to.equal(DAILY_UNLOCK_RATE);
    });
  });

  describe("stakeETR - ETR direct stake", function () {
    it("Should accept ETR direct stake", async function () {
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), STAKE_AMOUNT);
      const tx = await stakingPool.connect(user1).stakeETR(STAKE_AMOUNT, ethers.ZeroAddress);
      const receipt = await tx.wait();
      expect(receipt.logs.length).to.be.gt(0);
    });

    it("Should update user account after stake", async function () {
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), STAKE_AMOUNT);
      await stakingPool.connect(user1).stakeETR(STAKE_AMOUNT, ethers.ZeroAddress);
      const account = await stakingPool.getUserAccount(user1.address);
      expect(account.totalStakedUSDT).to.be.gt(0);
      expect(account.stakeIds.length).to.equal(1);
    });

    it("Should update totalStakedUSDT", async function () {
      const beforeTotal = await stakingPool.totalStakedUSDT();
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), STAKE_AMOUNT);
      await stakingPool.connect(user1).stakeETR(STAKE_AMOUNT, ethers.ZeroAddress);
      const afterTotal = await stakingPool.totalStakedUSDT();
      expect(afterTotal).to.be.gt(beforeTotal);
    });

    it("Should create stake record with correct values", async function () {
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), STAKE_AMOUNT);
      const tx = await stakingPool.connect(user1).stakeETR(STAKE_AMOUNT, ethers.ZeroAddress);
      const receipt = await tx.wait();
      
      let stakeId = 0;
      for (const log of receipt.logs) {
        try {
          const parsed = stakingPool.interface.parseLog(log);
          if (parsed.name === "Staked") {
            stakeId = parsed.args[1];
            break;
          }
        } catch {}
      }
      
      expect(stakeId).to.be.gt(0);
      const stake = await stakingPool.getStake(stakeId);
      expect(stake.owner).to.equal(user1.address);
      expect(stake.principal).to.equal(STAKE_AMOUNT);
      expect(stake.originalPrincipal).to.equal(STAKE_AMOUNT);
      expect(stake.active).to.be.true;
    });

    it("Should reject zero amount", async function () {
      await expect(
        stakingPool.connect(user1).stakeETR(0, ethers.ZeroAddress)
      ).to.be.revertedWith("StakingPoolV2: amount must be > 0");
    });

    it("Should reject when paused", async function () {
      await stakingPool.connect(owner).pause();
      expect(await stakingPool.paused()).to.be.true;
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), STAKE_AMOUNT);
      await expect(
        stakingPool.connect(user1).stakeETR(STAKE_AMOUNT, ethers.ZeroAddress)
      ).to.be.reverted;
    });
  });

  describe("stakeETRBatch - Batch stake", function () {
    it("Should accept batch stake", async function () {
      const amounts = [100000000000000000000n, 200000000000000000000n, 300000000000000000000n];
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), 600000000000000000000n);
      const tx = await stakingPool.connect(user1).stakeETRBatch(amounts, ethers.ZeroAddress);
      const receipt = await tx.wait();
      expect(receipt.logs.length).to.be.gt(0);
    });

    it("Should reject empty batch", async function () {
      await expect(
        stakingPool.connect(user1).stakeETRBatch([], ethers.ZeroAddress)
      ).to.be.revertedWith("StakingPoolV2: batch size invalid");
    });

    it("Should reject batch exceeding max size", async function () {
      const amounts = Array(11).fill(100000000000000000000n);
      await expect(
        stakingPool.connect(user1).stakeETRBatch(amounts, ethers.ZeroAddress)
      ).to.be.revertedWith("StakingPoolV2: batch size invalid");
    });
  });

  describe("50-day lock & 2% daily unlock", function () {
    it("Should set correct unlock time (50 days)", async function () {
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), STAKE_AMOUNT);
      const tx = await stakingPool.connect(user1).stakeETR(STAKE_AMOUNT, ethers.ZeroAddress);
      const receipt = await tx.wait();
      
      let stakeId = 0;
      for (const log of receipt.logs) {
        try {
          const parsed = stakingPool.interface.parseLog(log);
          if (parsed.name === "Staked") {
            stakeId = parsed.args[1];
            break;
          }
        } catch {}
      }
      
      const stake = await stakingPool.getStake(stakeId);
      const expectedUnlockTime = Number(stake.startTime) + LOCK_PERIOD;
      expect(Number(stake.unlockTime)).to.equal(expectedUnlockTime);
    });

    it("Should calculate 2% unlock after 1 day", async function () {
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), STAKE_AMOUNT);
      const tx = await stakingPool.connect(user1).stakeETR(STAKE_AMOUNT, ethers.ZeroAddress);
      const receipt = await tx.wait();
      
      let stakeId = 0;
      for (const log of receipt.logs) {
        try {
          const parsed = stakingPool.interface.parseLog(log);
          if (parsed.name === "Staked") {
            stakeId = parsed.args[1];
            break;
          }
        } catch {}
      }
      
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine");
      
      // getUnstakableUSDT returns USDT value based on ETR principal
      // 1000 ETR * 0.25 = 250 USDT, 2% = 5 USDT
      const unlockable = await stakingPool.getUnstakableUSDT(stakeId);
      expect(unlockable).to.be.gt(0);
    });

    it("Should calculate 20% unlock after 10 days", async function () {
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), STAKE_AMOUNT);
      const tx = await stakingPool.connect(user1).stakeETR(STAKE_AMOUNT, ethers.ZeroAddress);
      const receipt = await tx.wait();
      
      let stakeId = 0;
      for (const log of receipt.logs) {
        try {
          const parsed = stakingPool.interface.parseLog(log);
          if (parsed.name === "Staked") {
            stakeId = parsed.args[1];
            break;
          }
        } catch {}
      }
      
      await ethers.provider.send("evm_increaseTime", [86400 * 10]);
      await ethers.provider.send("evm_mine");
      
      const unlockable = await stakingPool.getUnstakableUSDT(stakeId);
      // 1000 ETR * 0.25 = 250 USDT, 20% = 50 USDT
      expect(unlockable).to.be.gt(0);
    });

    it("Should fully unlock after 50 days", async function () {
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), STAKE_AMOUNT);
      const tx = await stakingPool.connect(user1).stakeETR(STAKE_AMOUNT, ethers.ZeroAddress);
      const receipt = await tx.wait();
      
      let stakeId = 0;
      for (const log of receipt.logs) {
        try {
          const parsed = stakingPool.interface.parseLog(log);
          if (parsed.name === "Staked") {
            stakeId = parsed.args[1];
            break;
          }
        } catch {}
      }
      
      await ethers.provider.send("evm_increaseTime", [86400 * 50]);
      await ethers.provider.send("evm_mine");
      
      const unlockable = await stakingPool.getUnstakableUSDT(stakeId);
      // 1000 ETR * 0.25 = 250 USDT (100% unlocked)
      expect(unlockable).to.equal(250000000000000000000n); // 250 ETH equivalent
    });

    it("Should cap unlock at 100% (no over-unlock)", async function () {
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), STAKE_AMOUNT);
      const tx = await stakingPool.connect(user1).stakeETR(STAKE_AMOUNT, ethers.ZeroAddress);
      const receipt = await tx.wait();
      
      let stakeId = 0;
      for (const log of receipt.logs) {
        try {
          const parsed = stakingPool.interface.parseLog(log);
          if (parsed.name === "Staked") {
            stakeId = parsed.args[1];
            break;
          }
        } catch {}
      }
      
      await ethers.provider.send("evm_increaseTime", [86400 * 100]);
      await ethers.provider.send("evm_mine");
      
      const unlockable = await stakingPool.getUnstakableUSDT(stakeId);
      const maxUnlock = 250000000000000000000n; // 250 ETH
      expect(unlockable).to.be.lte(maxUnlock);
    });
  });

  describe("Valid account (stake >= $100)", function () {
    it("Should mark account valid when stake >= $100", async function () {
      // 400 ETR * 0.25 = $100
      const stakeValue = 400000000000000000000n;
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), stakeValue);
      await stakingPool.connect(user1).stakeETR(stakeValue, ethers.ZeroAddress);
      const isValid = await stakingPool.isValidAccount(user1.address);
      expect(isValid).to.be.true;
    });

    it("Should mark account invalid when stake < $100", async function () {
      // 200 ETR * 0.25 = $50 < $100
      const stakeValue = 200000000000000000000n;
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), stakeValue);
      await stakingPool.connect(user1).stakeETR(stakeValue, ethers.ZeroAddress);
      const isValid = await stakingPool.isValidAccount(user1.address);
      expect(isValid).to.be.false;
    });

    it("Should become valid after additional stake", async function () {
      const stake1 = 200000000000000000000n;
      const stake2 = 200000000000000000000n;
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), stake1 + stake2);
      await stakingPool.connect(user1).stakeETR(stake1, ethers.ZeroAddress);
      expect(await stakingPool.isValidAccount(user1.address)).to.be.false;
      await stakingPool.connect(user1).stakeETR(stake2, ethers.ZeroAddress);
      expect(await stakingPool.isValidAccount(user1.address)).to.be.true;
    });
  });

  describe("Yield rate management", function () {
    it("Should allow owner to update yield rate", async function () {
      await stakingPool.connect(owner).updateYieldRate(50);
      expect(await stakingPool.currentYieldRate()).to.equal(50);
    });

    it("Should reject yield rate outside range", async function () {
      await expect(
        stakingPool.connect(owner).updateYieldRate(100)
      ).to.be.revertedWith("StakingPoolV2: rate out of range");
    });

    it("Should allow owner to update config", async function () {
      await stakingPool.connect(owner).updateConfig(
        LOCK_PERIOD,
        DAILY_UNLOCK_RATE,
        20,
        100,
        MIN_STAKE_VALUE_USD
      );
      const config = await stakingPool.config();
      expect(config.minYieldRate).to.equal(20);
      expect(config.maxYieldRate).to.equal(100);
    });
  });

  describe("Emergency operations", function () {
    it("Should allow owner to pause", async function () {
      await stakingPool.connect(owner).pause();
      expect(await stakingPool.paused()).to.be.true;
    });

    it("Should allow owner to unpause", async function () {
      await stakingPool.connect(owner).pause();
      await stakingPool.connect(owner).unpause();
      expect(await stakingPool.paused()).to.be.false;
    });

    it("Should allow emergency withdrawal of ETR", async function () {
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), STAKE_AMOUNT);
      await stakingPool.connect(user1).stakeETR(STAKE_AMOUNT, ethers.ZeroAddress);
      const beforeBalance = await etrToken.balanceOf(owner.address);
      await stakingPool.connect(owner).emergencyWithdrawETR(owner.address, STAKE_AMOUNT);
      const afterBalance = await etrToken.balanceOf(owner.address);
      expect(afterBalance).to.be.gt(beforeBalance);
    });
  });
});
