const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReferralSystem", function () {
  let referralSystem;
  let mockStakingPool;
  let owner;
  let user1;
  let user2;
  let user3;
  let user4;
  let user5;
  let addrs;

  const MIN_VALID_STAKE = ethers.parseEther("100"); // $100
  const FIRST_GEN_RATE = 300; // 3%
  const SECOND_GEN_RATE = 200; // 2%
  const THIRD_GEN_RATE = 100; // 1%

  beforeEach(async function () {
    // 获取测试账户
    [owner, user1, user2, user3, user4, user5, ...addrs] = await ethers.getSigners();

    // 部署Mock StakingPool
    const MockStakingPool = await ethers.getContractFactory("MockStakingPool");
    mockStakingPool = await MockStakingPool.deploy();
    await mockStakingPool.waitForDeployment();

    // 部署ReferralSystem合约
    const ReferralSystem = await ethers.getContractFactory("ReferralSystem");
    referralSystem = await ReferralSystem.deploy(
      await mockStakingPool.getAddress(),
      owner.address // 使用owner作为priceOracle
    );
    await referralSystem.waitForDeployment();

    // 设置Mock StakingPool返回有效账户
    await mockStakingPool.setValidAccount(user1.address, true);
    await mockStakingPool.setValidAccount(user2.address, true);
    await mockStakingPool.setValidAccount(user3.address, true);
    await mockStakingPool.setValidAccount(user4.address, true);
    await mockStakingPool.setValidAccount(user5.address, true);

    // 设置质押价值（用于烧伤计算）
    await mockStakingPool.setPortfolioValue(user1.address, ethers.parseEther("1000")); // $1000
    await mockStakingPool.setPortfolioValue(user2.address, ethers.parseEther("500"));  // $500
    await mockStakingPool.setPortfolioValue(user3.address, ethers.parseEther("200"));  // $200
    await mockStakingPool.setPortfolioValue(user4.address, ethers.parseEther("150"));  // $150
    await mockStakingPool.setPortfolioValue(user5.address, ethers.parseEther("100"));  // $100
  });

  describe("Deployment", function () {
    it("Should set the right staking pool address", async function () {
      expect(await referralSystem.stakingPool()).to.equal(await mockStakingPool.getAddress());
    });

    it("Should set the right price oracle address", async function () {
      expect(await referralSystem.priceOracle()).to.equal(owner.address);
    });

    it("Should initialize with correct config", async function () {
      const config = await referralSystem.config();
      expect(config.firstGenRate).to.equal(FIRST_GEN_RATE); // 3%
      expect(config.secondGenRate).to.equal(SECOND_GEN_RATE); // 2%
      expect(config.thirdGenRate).to.equal(THIRD_GEN_RATE); // 1%
      expect(config.maxStackCount).to.equal(30); // 30个封顶
      expect(config.minValidStake).to.equal(MIN_VALID_STAKE); // $100
    });
  });

  describe("Referral Binding", function () {
    it("Should allow user to bind referrer", async function () {
      await referralSystem.connect(user2).bindReferrerSelf(user1.address);
      
      expect(await referralSystem.getReferrer(user2.address)).to.equal(user1.address);
    });

    it("Should reject self-referral", async function () {
      await expect(
        referralSystem.connect(user1).bindReferrerSelf(user1.address)
      ).to.be.revertedWith("ReferralSystem: cannot refer self");
    });

    it("Should reject zero address referrer", async function () {
      await expect(
        referralSystem.connect(user1).bindReferrerSelf(ethers.ZeroAddress)
      ).to.be.revertedWith("ReferralSystem: invalid referrer");
    });

    it("Should reject binding if already has referrer", async function () {
      await referralSystem.connect(user2).bindReferrerSelf(user1.address);
      
      await expect(
        referralSystem.connect(user2).bindReferrerSelf(user3.address)
      ).to.be.revertedWith("ReferralSystem: already has referrer");
    });

    it("Should reject binding to invalid referrer", async function () {
      // 设置user1为无效账户
      await mockStakingPool.setValidAccount(user1.address, false);
      
      await expect(
        referralSystem.connect(user2).bindReferrerSelf(user1.address)
      ).to.be.revertedWith("ReferralSystem: referrer not valid");
    });

    it("Should prevent circular referral", async function () {
      // user2 -> user1
      await referralSystem.connect(user2).bindReferrerSelf(user1.address);
      
      // user1 不能再绑定 user2（会导致循环）
      await expect(
        referralSystem.connect(user1).bindReferrerSelf(user2.address)
      ).to.be.revertedWith("ReferralSystem: circular referral");
    });

    it("Should emit ReferralBound event", async function () {
      await expect(referralSystem.connect(user2).bindReferrerSelf(user1.address))
        .to.emit(referralSystem, "ReferralBound");
    });

    it("Should update direct referrals list", async function () {
      await referralSystem.connect(user2).bindReferrerSelf(user1.address);
      await referralSystem.connect(user3).bindReferrerSelf(user1.address);
      
      const directReferrals = await referralSystem.getDirectReferrals(user1.address);
      expect(directReferrals.length).to.equal(2);
      expect(directReferrals[0]).to.equal(user2.address);
      expect(directReferrals[1]).to.equal(user3.address);
    });
  });

  describe("Three-Generation Referral Chain", function () {
    beforeEach(async function () {
      // 建立三代推荐链：user1 -> user2 -> user3 -> user4
      await referralSystem.connect(user2).bindReferrerSelf(user1.address);
      await referralSystem.connect(user3).bindReferrerSelf(user2.address);
      await referralSystem.connect(user4).bindReferrerSelf(user3.address);
    });

    it("Should return correct referral chain", async function () {
      const chain = await referralSystem.getReferralChain(user4.address);
      
      expect(chain[0]).to.equal(user3.address); // 第一代（直接推荐人）
      expect(chain[1]).to.equal(user2.address); // 第二代
      expect(chain[2]).to.equal(user1.address); // 第三代
    });

    it("Should update generation counts correctly", async function () {
      // user1应该有1个直推（user2），1个二代（user3），1个三代（user4）
      const stats = await referralSystem.getReferralStats(user1.address);
      
      expect(stats.directCount).to.equal(1); // user2
      expect(stats.secondGenCount).to.equal(1); // user3
      expect(stats.thirdGenCount).to.equal(1); // user4
    });

    it("Should emit ReferralStatsUpdated event", async function () {
      // 绑定新的推荐关系，应该触发统计更新
      await expect(referralSystem.connect(user5).bindReferrerSelf(user1.address))
        .to.emit(referralSystem, "ReferralStatsUpdated");
    });
  });

  describe("30-Cap Rule", function () {
    it("Should track 30 direct referrals", async function () {
      // 创建30个推荐关系
      for (let i = 0; i < 30; i++) {
        const wallet = addrs[i];
        await mockStakingPool.setValidAccount(wallet.address, true);
        await mockStakingPool.setPortfolioValue(wallet.address, ethers.parseEther("100"));
        await referralSystem.connect(wallet).bindReferrerSelf(user1.address);
      }
      
      const stats = await referralSystem.getReferralStats(user1.address);
      expect(stats.directCount).to.equal(30);
    });
  });

  describe("Burn Mechanism", function () {
    beforeEach(async function () {
      // 建立推荐链：user1 ($1000) -> user2 ($500)
      await referralSystem.connect(user2).bindReferrerSelf(user1.address);
    });

    it("Should apply burn when referrer has less stake than staker", async function () {
      const baseReward = ethers.parseEther("100"); // 100 ETR收益
      
      // 计算推荐奖励
      const rewardCalc = await referralSystem.calculateReferralReward(
        user1.address,
        user2.address,
        baseReward
      );
      
      // 由于user1的持仓($1000) > user2的持仓($500)，没有烧伤
      expect(rewardCalc.burnAmount).to.equal(0);
    });

    it("Should record burned rewards", async function () {
      // 设置user3的持仓高于user1
      await mockStakingPool.setPortfolioValue(user3.address, ethers.parseEther("2000")); // $2000
      await mockStakingPool.setValidAccount(user3.address, true);
      
      // user1 ($1000) 推荐 user3 ($2000)
      await referralSystem.connect(user3).bindReferrerSelf(user1.address);
      
      const baseReward = ethers.parseEther("100");
      const rewardCalc = await referralSystem.calculateReferralReward(
        user1.address,
        user3.address,
        baseReward
      );
      
      // user1持仓1000 < user3持仓2000，应该有烧伤
      expect(rewardCalc.burnAmount).to.be.gt(0);
    });
  });

  describe("Reward Calculation", function () {
    beforeEach(async function () {
      // 建立三代推荐链
      await referralSystem.connect(user2).bindReferrerSelf(user1.address);
      await referralSystem.connect(user3).bindReferrerSelf(user2.address);
      await referralSystem.connect(user4).bindReferrerSelf(user3.address);
    });

    it("Should calculate first generation reward correctly", async function () {
      const baseReward = ethers.parseEther("100"); // 100 ETR
      
      const rewardCalc = await referralSystem.calculateReferralReward(
        user3.address, // 第一代推荐人
        user4.address, // 被推荐人
        baseReward
      );
      
      // 第一代奖励应该大于0
      expect(rewardCalc.firstGenReward).to.be.gt(0);
    });

    it("Should calculate second generation reward correctly", async function () {
      const baseReward = ethers.parseEther("100");
      
      const rewardCalc = await referralSystem.calculateReferralReward(
        user2.address, // 第二代推荐人
        user4.address, // 被推荐人
        baseReward
      );
      
      expect(rewardCalc.secondGenReward).to.be.gt(0);
    });

    it("Should calculate third generation reward correctly", async function () {
      const baseReward = ethers.parseEther("100");
      
      const rewardCalc = await referralSystem.calculateReferralReward(
        user1.address, // 第三代推荐人
        user4.address, // 被推荐人
        baseReward
      );
      
      expect(rewardCalc.thirdGenReward).to.be.gt(0);
    });

    it("Should return zero reward for invalid referrer", async function () {
      // 设置user1为无效
      await mockStakingPool.setValidAccount(user1.address, false);
      
      const baseReward = ethers.parseEther("100");
      const rewardCalc = await referralSystem.calculateReferralReward(
        user1.address,
        user4.address,
        baseReward
      );
      
      expect(rewardCalc.totalReward).to.equal(0);
    });
  });

  describe("Referrer Validity", function () {
    it("Should return true for valid referrer", async function () {
      expect(await referralSystem.isValidReferrer(user1.address)).to.be.true;
    });

    it("Should return false for invalid referrer", async function () {
      await mockStakingPool.setValidAccount(user1.address, false);
      expect(await referralSystem.isValidReferrer(user1.address)).to.be.false;
    });

    it("Should return false for zero address", async function () {
      expect(await referralSystem.isValidReferrer(ethers.ZeroAddress)).to.be.false;
    });

    it("Should update referrer status", async function () {
      await referralSystem.updateReferrerStatus(user1.address);
      
      const info = await referralSystem.getReferrerInfo(user1.address);
      expect(info.isValid).to.be.true;
    });

    it("Should emit ReferrerStatusChanged on status update", async function () {
      await expect(referralSystem.updateReferrerStatus(user1.address))
        .to.emit(referralSystem, "ReferrerStatusChanged");
    });
  });

  describe("Query Functions", function () {
    beforeEach(async function () {
      await referralSystem.connect(user2).bindReferrerSelf(user1.address);
      await referralSystem.connect(user3).bindReferrerSelf(user1.address);
    });

    it("Should return correct referral stats", async function () {
      const stats = await referralSystem.getReferralStats(user1.address);
      
      expect(stats.directCount).to.equal(2);
      expect(stats.totalReward).to.equal(0); // 还没有奖励
    });

    it("Should return correct referrer info", async function () {
      const info = await referralSystem.getReferrerInfo(user1.address);
      
      expect(info.directCount).to.equal(2);
      expect(info.isValid).to.be.true;
    });

    it("Should return effective referral count", async function () {
      const count = await referralSystem.getEffectiveReferralCount(user1.address, 1);
      expect(count).to.equal(2);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update config", async function () {
      const newFirstGenRate = 400; // 4%
      const newSecondGenRate = 300; // 3%
      const newThirdGenRate = 200; // 2%
      const newMaxStackCount = 50;
      const newMinValidStake = ethers.parseEther("200"); // $200

      await referralSystem.updateConfig(
        newFirstGenRate,
        newSecondGenRate,
        newThirdGenRate,
        newMaxStackCount,
        newMinValidStake
      );

      const config = await referralSystem.config();
      expect(config.firstGenRate).to.equal(newFirstGenRate);
      expect(config.secondGenRate).to.equal(newSecondGenRate);
      expect(config.thirdGenRate).to.equal(newThirdGenRate);
      expect(config.maxStackCount).to.equal(newMaxStackCount);
      expect(config.minValidStake).to.equal(newMinValidStake);
    });

    it("Should allow owner to set contracts", async function () {
      const newStakingPool = addrs[0].address;
      const newEtrToken = addrs[1].address;

      await referralSystem.setContracts(newStakingPool, newEtrToken);
      
      expect(await referralSystem.stakingPool()).to.equal(newStakingPool);
      expect(await referralSystem.etrToken()).to.equal(newEtrToken);
    });

    it("Should allow batch update of referrer status", async function () {
      const referrers = [user1.address, user2.address, user3.address];
      
      await expect(referralSystem.batchUpdateStatus(referrers)).to.not.be.reverted;
    });
  });

  describe("Pause Functionality", function () {
    it("Should allow owner to pause", async function () {
      await referralSystem.pause();
      expect(await referralSystem.paused()).to.be.true;
    });

    it("Should allow owner to unpause", async function () {
      await referralSystem.pause();
      await referralSystem.unpause();
      expect(await referralSystem.paused()).to.be.false;
    });

    it("Should prevent binding when paused", async function () {
      await referralSystem.pause();
      
      await expect(
        referralSystem.connect(user2).bindReferrerSelf(user1.address)
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("Staking Pool Only Functions", function () {
    it("Should only allow staking pool to bind referrer", async function () {
      await expect(
        referralSystem.bindReferrer(user2.address, user1.address)
      ).to.be.revertedWith("ReferralSystem: only staking pool");
    });

    it("Should only allow staking pool to record stake", async function () {
      await expect(
        referralSystem.recordStake(user1.address, ethers.parseEther("100"))
      ).to.be.revertedWith("ReferralSystem: only staking pool");
    });

    it("Should only allow staking pool to distribute rewards", async function () {
      await expect(
        referralSystem.distributeReferralReward(user1.address, ethers.parseEther("100"))
      ).to.be.revertedWith("ReferralSystem: only staking pool");
    });
  });
});
