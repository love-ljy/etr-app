const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StakingPool", function () {
  let stakingPool;
  let etrToken;
  let priceOracle;
  let owner;
  let user1;
  let user2;
  let user3;
  let addrs;

  const TOTAL_SUPPLY = ethers.parseEther("200000000"); // 2亿
  const STAKE_AMOUNT = ethers.parseEther("1000"); // 1000 ETR
  const MIN_STAKE_VALUE_USD = ethers.parseEther("100"); // $100

  beforeEach(async function () {
    // 获取测试账户
    [owner, user1, user2, user3, ...addrs] = await ethers.getSigners();

    // 部署Mock ETRToken
    const MockETRToken = await ethers.getContractFactory("ETRToken");
    etrToken = await MockETRToken.deploy(owner.address, owner.address);
    await etrToken.waitForDeployment();

    // 部署Mock PriceOracle
    const MockPriceOracle = await ethers.getContractFactory("PriceOracle");
    priceOracle = await MockPriceOracle.deploy(owner.address, true);
    await priceOracle.waitForDeployment();

    // 部署StakingPool合约
    const StakingPool = await ethers.getContractFactory("StakingPool");
    stakingPool = await StakingPool.deploy(
      await etrToken.getAddress(), 
      await priceOracle.getAddress()
    );
    await stakingPool.waitForDeployment();

    // 给用户1、2、3转一些ETR用于质押
    await etrToken.transfer(user1.address, ethers.parseEther("10000"));
    await etrToken.transfer(user2.address, ethers.parseEther("10000"));
    await etrToken.transfer(user3.address, ethers.parseEther("10000"));
  });

  describe("Deployment", function () {
    it("Should set the right ETR token address", async function () {
      expect(await stakingPool.etrToken()).to.equal(await etrToken.getAddress());
    });

    it("Should set the right price oracle address", async function () {
      expect(await stakingPool.priceOracle()).to.equal(await priceOracle.getAddress());
    });

    it("Should initialize with correct config", async function () {
      const config = await stakingPool.config();
      expect(config.lockPeriod).to.equal(50 * 24 * 60 * 60); // 50天
      expect(config.dailyUnlockRate).to.equal(200); // 2%
      expect(config.minYieldRate).to.equal(30); // 0.3%
      expect(config.maxYieldRate).to.equal(60); // 0.6%
      expect(config.minStakeValueUSD).to.equal(MIN_STAKE_VALUE_USD);
      expect(config.settlementInterval).to.equal(86400); // 24小时
    });

    it("Should initialize with default yield rate", async function () {
      expect(await stakingPool.currentYieldRate()).to.equal(45); // 0.45%
    });

    it("Should initialize nextStakeId to 1", async function () {
      expect(await stakingPool.nextStakeId()).to.equal(1);
    });
  });

  describe("Staking", function () {
    it("Should allow user to stake ETR tokens", async function () {
      // 授权合约使用ETR
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), STAKE_AMOUNT);

      // 质押
      const tx = await stakingPool.connect(user1).stake(STAKE_AMOUNT);
      const receipt = await tx.wait();

      // 检查事件 - 使用logs解析
      const stakingPoolInterface = stakingPool.interface;
      const stakeEvent = receipt.logs
        .map(log => {
          try {
            return stakingPoolInterface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .find(event => event && event.name === "Staked");
      
      expect(stakeEvent).to.not.be.undefined;
      expect(stakeEvent.args.user).to.equal(user1.address);
      expect(stakeEvent.args.amount).to.equal(STAKE_AMOUNT);

      // 检查质押记录
      const stake = await stakingPool.stakes(1);
      expect(stake.owner).to.equal(user1.address);
      expect(stake.principal).to.equal(STAKE_AMOUNT);
      expect(stake.originalPrincipal).to.equal(STAKE_AMOUNT);
      expect(stake.active).to.be.true;
    });

    it("Should reject staking with zero amount", async function () {
      await expect(
        stakingPool.connect(user1).stake(0)
      ).to.be.revertedWith("StakingPool: amount must be greater than 0");
    });

    it("Should create correct unlock time (50 days)", async function () {
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), STAKE_AMOUNT);
      
      const blockBefore = await ethers.provider.getBlock("latest");
      const tx = await stakingPool.connect(user1).stake(STAKE_AMOUNT);
      await tx.wait();
      
      const stake = await stakingPool.stakes(1);
      const expectedUnlockTime = blockBefore.timestamp + 50 * 24 * 60 * 60;
      
      // 允许10秒误差
      expect(Number(stake.unlockTime)).to.be.closeTo(expectedUnlockTime, 10);
    });

    it("Should update user account correctly", async function () {
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), STAKE_AMOUNT);
      await stakingPool.connect(user1).stake(STAKE_AMOUNT);

      const account = await stakingPool.userAccounts(user1.address);
      expect(account.totalStaked).to.equal(STAKE_AMOUNT);
      // stakeIds是数组，需要特殊处理
      const stakeIds = await stakingPool.getUserStakes(user1.address);
      expect(stakeIds.length).to.equal(1);
    });

    it("Should update total staked amount", async function () {
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), STAKE_AMOUNT);
      await stakingPool.connect(user1).stake(STAKE_AMOUNT);

      expect(await stakingPool.totalStaked()).to.equal(STAKE_AMOUNT);
    });

    it("Should allow multiple stakes from same user", async function () {
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), STAKE_AMOUNT * 2n);
      
      await stakingPool.connect(user1).stake(STAKE_AMOUNT);
      await stakingPool.connect(user1).stake(STAKE_AMOUNT);

      const stakeIds = await stakingPool.getUserStakes(user1.address);
      expect(stakeIds.length).to.equal(2);
    });
  });

  describe("Account Validity (≥$100 requirement)", function () {
    it("Should mark account as valid when stake value >= $100", async function () {
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), STAKE_AMOUNT);
      await stakingPool.connect(user1).stake(STAKE_AMOUNT);

      expect(await stakingPool.isValidAccount(user1.address)).to.be.true;
    });

    it("Should emit AccountStatusChanged event on validity change", async function () {
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), STAKE_AMOUNT);
      
      await expect(stakingPool.connect(user1).stake(STAKE_AMOUNT))
        .to.emit(stakingPool, "AccountStatusChanged");
    });
  });

  describe("Unstaking", function () {
    beforeEach(async function () {
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), STAKE_AMOUNT);
      await stakingPool.connect(user1).stake(STAKE_AMOUNT);
    });

    it("Should not allow unstaking before unlock period", async function () {
      // 获取可解押金额（应该是0，因为还没开始解锁）
      const unstakable = await stakingPool.getUnstakableAmount(1);
      
      // 由于时间还没过，可解押金额应该为0
      expect(unstakable).to.equal(0);
    });

    it("Should allow partial unstaking after daily unlock", async function () {
      // 推进时间1天
      await network.provider.send("evm_increaseTime", [86400]); // 1天
      await network.provider.send("evm_mine");

      // 计算可解押金额（2% of 1000 = 20 ETR）
      const unstakable = await stakingPool.getUnstakableAmount(1);
      const expectedUnstakable = STAKE_AMOUNT * 2n / 100n; // 2%
      
      expect(unstakable).to.equal(expectedUnstakable);
    });

    it("Should allow full unstaking after 50 days", async function () {
      // 推进时间50天
      await network.provider.send("evm_increaseTime", [50 * 86400]);
      await network.provider.send("evm_mine");

      const unstakable = await stakingPool.getUnstakableAmount(1);
      expect(unstakable).to.equal(STAKE_AMOUNT);
    });

    it("Should reject unstaking more than available", async function () {
      // 推进1天
      await network.provider.send("evm_increaseTime", [86400]);
      await network.provider.send("evm_mine");

      // 尝试解押超过可解押的金额
      const tooMuch = STAKE_AMOUNT / 2n;
      
      await expect(
        stakingPool.connect(user1).unstake(1, tooMuch)
      ).to.be.revertedWith("StakingPool: exceeds unstakable amount");
    });

    it("Should transfer ETR back to user on unstake", async function () {
      // 推进50天
      await network.provider.send("evm_increaseTime", [50 * 86400]);
      await network.provider.send("evm_mine");

      // 充值奖励池，确保有足够的ETR支付可能的奖励
      const rewardAmount = ethers.parseEther("1000");
      await etrToken.approve(await stakingPool.getAddress(), rewardAmount);
      await stakingPool.fundRewardPool(rewardAmount);

      const balanceBefore = await etrToken.balanceOf(user1.address);
      
      await stakingPool.connect(user1).unstake(1, STAKE_AMOUNT);
      
      const balanceAfter = await etrToken.balanceOf(user1.address);
      // 用户应该收到本金 + 50天的收益
      // 50天收益 = 1000 * 0.45% * 50 = 225 ETR
      const expectedReward = STAKE_AMOUNT * 45n * 50n / 10000n;
      const expectedTotal = STAKE_AMOUNT + expectedReward;
      expect(balanceAfter - balanceBefore).to.equal(expectedTotal);
    });

    it("Should update stake record on partial unstake", async function () {
      // 推进10天
      await network.provider.send("evm_increaseTime", [10 * 86400]);
      await network.provider.send("evm_mine");

      // 充值奖励池
      const rewardAmount = ethers.parseEther("1000");
      await etrToken.approve(await stakingPool.getAddress(), rewardAmount);
      await stakingPool.fundRewardPool(rewardAmount);

      const unstakable = await stakingPool.getUnstakableAmount(1);
      await stakingPool.connect(user1).unstake(1, unstakable);

      const stake = await stakingPool.stakes(1);
      expect(stake.principal).to.equal(STAKE_AMOUNT - unstakable);
      expect(stake.active).to.be.true; // 还有剩余本金，仍然活跃
    });

    it("Should mark stake as inactive when fully unstaked", async function () {
      // 推进50天
      await network.provider.send("evm_increaseTime", [50 * 86400]);
      await network.provider.send("evm_mine");

      // 充值奖励池
      const rewardAmount = ethers.parseEther("1000");
      await etrToken.approve(await stakingPool.getAddress(), rewardAmount);
      await stakingPool.fundRewardPool(rewardAmount);

      await stakingPool.connect(user1).unstake(1, STAKE_AMOUNT);

      const stake = await stakingPool.stakes(1);
      expect(stake.active).to.be.false;
    });
  });

  describe("Reward Calculation (24-hour settlement)", function () {
    beforeEach(async function () {
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), STAKE_AMOUNT);
      await stakingPool.connect(user1).stake(STAKE_AMOUNT);
    });

    it("Should return zero reward before 24 hours", async function () {
      const pendingReward = await stakingPool.calculatePendingReward(1);
      expect(pendingReward).to.equal(0);
    });

    it("Should calculate reward after 24 hours", async function () {
      // 推进1天
      await network.provider.send("evm_increaseTime", [86400]);
      await network.provider.send("evm_mine");

      const pendingReward = await stakingPool.calculatePendingReward(1);
      
      // 期望收益 = 1000 * 0.45% = 4.5 ETR
      const expectedReward = STAKE_AMOUNT * 45n / 10000n;
      expect(pendingReward).to.equal(expectedReward);
    });

    it("Should calculate reward for multiple days", async function () {
      // 推进3天
      await network.provider.send("evm_increaseTime", [3 * 86400]);
      await network.provider.send("evm_mine");

      const pendingReward = await stakingPool.calculatePendingReward(1);
      
      // 期望收益 = 1000 * 0.45% * 3 = 13.5 ETR
      const expectedReward = STAKE_AMOUNT * 45n * 3n / 10000n;
      expect(pendingReward).to.equal(expectedReward);
    });
  });

  describe("Yield Rate Management", function () {
    it("Should allow owner to update yield rate", async function () {
      const newRate = 50; // 0.5%
      await stakingPool.updateYieldRate(newRate);
      
      expect(await stakingPool.currentYieldRate()).to.equal(newRate);
    });

    it("Should reject yield rate outside range", async function () {
      // 低于0.3%
      await expect(
        stakingPool.updateYieldRate(20)
      ).to.be.revertedWith("StakingPool: rate out of range");

      // 高于0.6%
      await expect(
        stakingPool.updateYieldRate(70)
      ).to.be.revertedWith("StakingPool: rate out of range");
    });

    it("Should emit YieldRateUpdated event", async function () {
      const newRate = 50;
      await expect(stakingPool.updateYieldRate(newRate))
        .to.emit(stakingPool, "YieldRateUpdated");
    });
  });

  describe("Query Functions", function () {
    beforeEach(async function () {
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), STAKE_AMOUNT);
      await stakingPool.connect(user1).stake(STAKE_AMOUNT);
    });

    it("Should return user stakes correctly", async function () {
      const userStakes = await stakingPool.getUserStakes(user1.address);
      expect(userStakes.length).to.equal(1);
      expect(userStakes[0].stakeId).to.equal(1);
      expect(userStakes[0].owner).to.equal(user1.address);
    });

    it("Should return stake details correctly", async function () {
      const stake = await stakingPool.getStake(1);
      expect(stake.stakeId).to.equal(1);
      expect(stake.principal).to.equal(STAKE_AMOUNT);
      expect(stake.active).to.be.true;
    });

    it("Should return user account info", async function () {
      const account = await stakingPool.getUserAccount(user1.address);
      expect(account.totalStaked).to.equal(STAKE_AMOUNT);
      expect(account.isValid).to.be.true;
    });

    it("Should return pool stats", async function () {
      const stats = await stakingPool.getPoolStats();
      expect(stats._totalStaked).to.equal(STAKE_AMOUNT);
      expect(stats._currentYieldRate).to.equal(45);
    });
  });

  describe("Pause Functionality", function () {
    it("Should allow owner to pause", async function () {
      await stakingPool.pause();
      expect(await stakingPool.paused()).to.be.true;
    });

    it("Should prevent staking when paused", async function () {
      await stakingPool.pause();
      
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), STAKE_AMOUNT);
      
      await expect(
        stakingPool.connect(user1).stake(STAKE_AMOUNT)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should allow emergency unstake when paused", async function () {
      await etrToken.connect(user1).approve(await stakingPool.getAddress(), STAKE_AMOUNT);
      await stakingPool.connect(user1).stake(STAKE_AMOUNT);
      
      await stakingPool.pause();
      
      // 紧急解押应该可以执行
      await expect(
        stakingPool.connect(user1).emergencyUnstake(1)
      ).to.not.be.reverted;
    });

    it("Should allow owner to unpause", async function () {
      await stakingPool.pause();
      await stakingPool.unpause();
      expect(await stakingPool.paused()).to.be.false;
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update config", async function () {
      const newLockPeriod = 60 * 24 * 60 * 60; // 60天
      const newDailyUnlockRate = 150; // 1.5%
      const newMinYieldRate = 40; // 0.4%
      const newMaxYieldRate = 80; // 0.8%
      const newMinStakeValue = ethers.parseEther("200"); // $200

      await stakingPool.updateConfig(
        newLockPeriod,
        newDailyUnlockRate,
        newMinYieldRate,
        newMaxYieldRate,
        newMinStakeValue
      );

      const config = await stakingPool.config();
      expect(config.lockPeriod).to.equal(newLockPeriod);
      expect(config.dailyUnlockRate).to.equal(newDailyUnlockRate);
      expect(config.minYieldRate).to.equal(newMinYieldRate);
      expect(config.maxYieldRate).to.equal(newMaxYieldRate);
      expect(config.minStakeValueUSD).to.equal(newMinStakeValue);
    });

    it("Should allow owner to set contract references", async function () {
      const mockReferral = addrs[0].address;
      const mockDividend = addrs[1].address;

      await stakingPool.setContracts(mockReferral, mockDividend);
      
      expect(await stakingPool.referralSystem()).to.equal(mockReferral);
      expect(await stakingPool.dividendPool()).to.equal(mockDividend);
    });
  });
});
