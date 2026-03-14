const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CompoundPool", function () {
  let compoundPool;
  let etrToken;
  let owner;
  let user1;
  let user2;
  let stakingPoolSigner;
  let addrs;

  const REWARD_AMOUNT = ethers.parseEther("100"); // 100 ETR

  beforeEach(async function () {
    // 获取测试账户
    [owner, user1, user2, ...addrs] = await ethers.getSigners();
    
    // 使用addrs[0]作为stakingPool的模拟
    stakingPoolSigner = addrs[0];

    // 部署Mock ETRToken
    const MockETRToken = await ethers.getContractFactory("ETRToken");
    etrToken = await MockETRToken.deploy(owner.address, owner.address);
    await etrToken.waitForDeployment();

    // 部署CompoundPool合约
    const CompoundPool = await ethers.getContractFactory("CompoundPool");
    compoundPool = await CompoundPool.deploy(await etrToken.getAddress());
    await compoundPool.waitForDeployment();

    // 设置stakingPool地址
    await compoundPool.setStakingPool(stakingPoolSigner.address);

    // 给compoundPool转一些ETR用于奖励
    await etrToken.transfer(await compoundPool.getAddress(), ethers.parseEther("10000"));
  });

  describe("Deployment", function () {
    it("Should set the right ETR token address", async function () {
      expect(await compoundPool.etrToken()).to.equal(await etrToken.getAddress());
    });

    it("Should initialize with default yield rate", async function () {
      expect(await compoundPool.currentYieldRate()).to.equal(45); // 0.45%
    });

    it("Should initialize totalCompoundPool to 0", async function () {
      expect(await compoundPool.totalCompoundPool()).to.equal(0);
    });
  });

  describe("SetStakingPool", function () {
    it("Should allow owner to set staking pool", async function () {
      const newAddress = addrs[1].address;
      await expect(compoundPool.setStakingPool(newAddress))
        .to.emit(compoundPool, "StakingPoolSet")
        .withArgs(stakingPoolSigner.address, newAddress);
      
      expect(await compoundPool.stakingPool()).to.equal(newAddress);
    });

    it("Should not allow non-owner to set staking pool", async function () {
      await expect(compoundPool.connect(user1).setStakingPool(addrs[1].address))
        .to.be.reverted;
    });

    it("Should not allow zero address", async function () {
      await expect(compoundPool.setStakingPool(ethers.ZeroAddress))
        .to.be.revertedWith("CompoundPool: staking pool is zero address");
    });
  });

  describe("DepositReward", function () {
    it("Should allow staking pool to deposit reward", async function () {
      // 使用stakingPoolSigner调用depositReward
      await compoundPool.connect(stakingPoolSigner).depositReward(user1.address, REWARD_AMOUNT);
      
      expect(await compoundPool.compoundBalances(user1.address)).to.equal(REWARD_AMOUNT);
      expect(await compoundPool.totalDeposited(user1.address)).to.equal(REWARD_AMOUNT);
      expect(await compoundPool.totalCompoundPool()).to.equal(REWARD_AMOUNT);
    });

    it("Should emit RewardDeposited event", async function () {
      const tx = await compoundPool.connect(stakingPoolSigner).depositReward(user1.address, REWARD_AMOUNT);
      const receipt = await tx.wait();
      
      // 解析事件
      const compoundPoolInterface = compoundPool.interface;
      const event = receipt.logs
        .map(log => {
          try {
            return compoundPoolInterface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .find(event => event && event.name === "RewardDeposited");
      
      expect(event).to.not.be.undefined;
      expect(event.args.user).to.equal(user1.address);
      expect(event.args.amount).to.equal(REWARD_AMOUNT);
    });

    it("Should not allow non-staking-pool to deposit", async function () {
      await expect(compoundPool.connect(user1).depositReward(user1.address, REWARD_AMOUNT))
        .to.be.revertedWith("CompoundPool: only staking pool");
    });

    it("Should not allow zero amount", async function () {
      await expect(compoundPool.connect(stakingPoolSigner).depositReward(user1.address, 0))
        .to.be.revertedWith("CompoundPool: amount must be greater than 0");
    });

    it("Should not allow zero address user", async function () {
      await expect(compoundPool.connect(stakingPoolSigner).depositReward(ethers.ZeroAddress, REWARD_AMOUNT))
        .to.be.revertedWith("CompoundPool: user is zero address");
    });

    it("Should accumulate deposits for same user", async function () {
      await compoundPool.connect(stakingPoolSigner).depositReward(user1.address, REWARD_AMOUNT);
      await compoundPool.connect(stakingPoolSigner).depositReward(user1.address, REWARD_AMOUNT);
      
      expect(await compoundPool.compoundBalances(user1.address)).to.equal(REWARD_AMOUNT * 2n);
      expect(await compoundPool.totalDeposited(user1.address)).to.equal(REWARD_AMOUNT * 2n);
    });
  });

  describe("CalculateDailyCompound", function () {
    it("Should calculate daily compound correctly", async function () {
      await compoundPool.connect(stakingPoolSigner).depositReward(user1.address, ethers.parseEther("1000"));
      
      // 1000 * 0.45% = 4.5 ETR
      const dailyCompound = await compoundPool.calculateDailyCompound(user1.address);
      expect(dailyCompound).to.equal(ethers.parseEther("4.5"));
    });

    it("Should return 0 for zero balance", async function () {
      const dailyCompound = await compoundPool.calculateDailyCompound(user1.address);
      expect(dailyCompound).to.equal(0);
    });
  });

  describe("GetTotalCompound", function () {
    it("Should calculate compound after time passes", async function () {
      await compoundPool.connect(stakingPoolSigner).depositReward(user1.address, ethers.parseEther("1000"));
      
      // 快进2天
      await ethers.provider.send("evm_increaseTime", [2 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");
      
      // 获取复利后的总额
      const total = await compoundPool.getTotalCompound(user1.address);
      
      // 1000 + 1000 * 0.45% * 2 = 1009 ETR
      const expected = ethers.parseEther("1009");
      expect(Number(total)).to.be.closeTo(Number(expected), Number(ethers.parseEther("0.01")));
    });
  });

  describe("ClaimCompound", function () {
    beforeEach(async function () {
      await compoundPool.connect(stakingPoolSigner).depositReward(user1.address, REWARD_AMOUNT);
    });

    it("Should allow user to claim compound", async function () {
      const balanceBefore = await etrToken.balanceOf(user1.address);
      
      await compoundPool.connect(user1).claimCompound();
      
      const balanceAfter = await etrToken.balanceOf(user1.address);
      expect(balanceAfter - balanceBefore).to.equal(REWARD_AMOUNT);
      
      expect(await compoundPool.compoundBalances(user1.address)).to.equal(0);
      expect(await compoundPool.totalClaimed(user1.address)).to.equal(REWARD_AMOUNT);
    });

    it("Should emit CompoundClaimed event", async function () {
      const tx = await compoundPool.connect(user1).claimCompound();
      const receipt = await tx.wait();
      
      // 解析事件
      const compoundPoolInterface = compoundPool.interface;
      const event = receipt.logs
        .map(log => {
          try {
            return compoundPoolInterface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .find(event => event && event.name === "CompoundClaimed");
      
      expect(event).to.not.be.undefined;
      expect(event.args.user).to.equal(user1.address);
      expect(event.args.amount).to.equal(REWARD_AMOUNT);
    });

    it("Should revert if no compound to claim", async function () {
      await compoundPool.connect(user1).claimCompound(); // 先提取完
      
      await expect(compoundPool.connect(user1).claimCompound())
        .to.be.revertedWith("CompoundPool: no compound to claim");
    });

    it("Should include compounded rewards when claiming", async function () {
      // 快进2天
      await ethers.provider.send("evm_increaseTime", [2 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");
      
      const balanceBefore = await etrToken.balanceOf(user1.address);
      
      await compoundPool.connect(user1).claimCompound();
      
      const balanceAfter = await etrToken.balanceOf(user1.address);
      const claimed = balanceAfter - balanceBefore;
      
      // 应该比原始金额多（因为有复利）
      expect(claimed).to.be.gt(REWARD_AMOUNT);
    });
  });

  describe("TransferToBalance", function () {
    beforeEach(async function () {
      await compoundPool.connect(stakingPoolSigner).depositReward(user1.address, REWARD_AMOUNT);
    });

    it("Should allow user to transfer compound to balance", async function () {
      const transferAmount = ethers.parseEther("50");
      const balanceBefore = await etrToken.balanceOf(user1.address);
      
      await compoundPool.connect(user1).transferToBalance(transferAmount);
      
      const balanceAfter = await etrToken.balanceOf(user1.address);
      expect(balanceAfter - balanceBefore).to.equal(transferAmount);
      
      expect(await compoundPool.compoundBalances(user1.address)).to.equal(REWARD_AMOUNT - transferAmount);
      expect(await compoundPool.totalTransferred(user1.address)).to.equal(transferAmount);
    });

    it("Should emit CompoundTransferredToBalance event", async function () {
      const transferAmount = ethers.parseEther("50");
      
      const tx = await compoundPool.connect(user1).transferToBalance(transferAmount);
      const receipt = await tx.wait();
      
      // 解析事件
      const compoundPoolInterface = compoundPool.interface;
      const event = receipt.logs
        .map(log => {
          try {
            return compoundPoolInterface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .find(event => event && event.name === "CompoundTransferredToBalance");
      
      expect(event).to.not.be.undefined;
      expect(event.args.user).to.equal(user1.address);
      expect(event.args.amount).to.equal(transferAmount);
    });

    it("Should revert if insufficient balance", async function () {
      const tooMuch = REWARD_AMOUNT + ethers.parseEther("1");
      
      await expect(compoundPool.connect(user1).transferToBalance(tooMuch))
        .to.be.revertedWith("CompoundPool: insufficient compound balance");
    });

    it("Should revert if zero amount", async function () {
      await expect(compoundPool.connect(user1).transferToBalance(0))
        .to.be.revertedWith("CompoundPool: amount must be greater than 0");
    });

    it("Should include compounded rewards when calculating balance", async function () {
      // 快进2天
      await ethers.provider.send("evm_increaseTime", [2 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");
      
      // 转移全部（包括复利）
      const totalBalance = await compoundPool.getTotalCompound(user1.address);
      
      const balanceBefore = await etrToken.balanceOf(user1.address);
      await compoundPool.connect(user1).transferToBalance(totalBalance);
      const balanceAfter = await etrToken.balanceOf(user1.address);
      
      const transferred = balanceAfter - balanceBefore;
      expect(Number(transferred)).to.equal(Number(totalBalance));
    });
  });

  describe("UpdateYieldRate", function () {
    it("Should allow owner to update yield rate", async function () {
      const newRate = 60; // 0.6%
      
      const tx = await compoundPool.updateYieldRate(newRate);
      const receipt = await tx.wait();
      
      // 解析事件
      const compoundPoolInterface = compoundPool.interface;
      const event = receipt.logs
        .map(log => {
          try {
            return compoundPoolInterface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .find(event => event && event.name === "YieldRateUpdated");
      
      expect(event).to.not.be.undefined;
      expect(event.args.newRate).to.equal(newRate);
      
      expect(await compoundPool.currentYieldRate()).to.equal(newRate);
    });

    it("Should not allow rate below minimum", async function () {
      await expect(compoundPool.updateYieldRate(29))
        .to.be.revertedWith("CompoundPool: rate out of range");
    });

    it("Should not allow rate above maximum", async function () {
      await expect(compoundPool.updateYieldRate(61))
        .to.be.revertedWith("CompoundPool: rate out of range");
    });

    it("Should not allow non-owner to update rate", async function () {
      await expect(compoundPool.connect(user1).updateYieldRate(50))
        .to.be.reverted;
    });
  });

  describe("GetCompoundInfo", function () {
    it("Should return complete compound info", async function () {
      await compoundPool.connect(stakingPoolSigner).depositReward(user1.address, REWARD_AMOUNT);
      
      const info = await compoundPool.getCompoundInfo(user1.address);
      
      expect(info.balance).to.equal(REWARD_AMOUNT);
      expect(info.totalDepositedAmount).to.equal(REWARD_AMOUNT);
      expect(info.totalClaimedAmount).to.equal(0);
      expect(info.totalTransferredAmount).to.equal(0);
      expect(info.estimatedDaily).to.equal(REWARD_AMOUNT * 45n / 10000n);
    });
  });

  describe("GetPoolStats", function () {
    it("Should return pool stats", async function () {
      await compoundPool.connect(stakingPoolSigner).depositReward(user1.address, REWARD_AMOUNT);
      
      const stats = await compoundPool.getPoolStats();
      
      expect(stats._totalCompoundPool).to.equal(REWARD_AMOUNT);
      expect(stats._currentYieldRate).to.equal(45);
      expect(stats._stakingPool).to.equal(stakingPoolSigner.address);
    });
  });

  describe("Pause/Unpause", function () {
    it("Should allow owner to pause", async function () {
      await compoundPool.pause();
      expect(await compoundPool.paused()).to.be.true;
    });

    it("Should allow owner to unpause", async function () {
      await compoundPool.pause();
      await compoundPool.unpause();
      expect(await compoundPool.paused()).to.be.false;
    });

    it("Should not allow deposit when paused", async function () {
      await compoundPool.pause();
      await expect(compoundPool.connect(stakingPoolSigner).depositReward(user1.address, REWARD_AMOUNT))
        .to.be.reverted;
    });

    it("Should not allow claim when paused", async function () {
      await compoundPool.connect(stakingPoolSigner).depositReward(user1.address, REWARD_AMOUNT);
      await compoundPool.pause();
      await expect(compoundPool.connect(user1).claimCompound())
        .to.be.reverted;
    });
  });
});