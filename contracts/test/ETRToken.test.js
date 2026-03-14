const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ETRToken", function () {
  let etrToken;
  let owner;
  let blackHole;
  let lpPool;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    // 获取测试账户
    [owner, blackHole, lpPool, addr1, addr2, ...addrs] = await ethers.getSigners();

    // 部署ETRToken合约
    const ETRToken = await ethers.getContractFactory("ETRToken");
    etrToken = await ETRToken.deploy(blackHole.address, lpPool.address);
    await etrToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await etrToken.name()).to.equal("Equator ETR");
      expect(await etrToken.symbol()).to.equal("ETR");
    });

    it("Should have 18 decimals", async function () {
      expect(await etrToken.decimals()).to.equal(18);
    });

    it("Should set the right black hole address", async function () {
      expect(await etrToken.blackHole()).to.equal(blackHole.address);
    });

    it("Should set the right LP pool address", async function () {
      expect(await etrToken.lpPool()).to.equal(lpPool.address);
    });

    it("Should initialize token distribution correctly", async function () {
      const blackHoleBalance = await etrToken.balanceOf(blackHole.address);
      const lpPoolBalance = await etrToken.balanceOf(lpPool.address);
      const totalSupply = await etrToken.totalSupply();

      // 95% to black hole
      const expectedBlackHoleAmount = ethers.parseEther("190000000");
      // 5% to LP pool
      const expectedLpAmount = ethers.parseEther("10000000");

      expect(blackHoleBalance).to.equal(expectedBlackHoleAmount);
      expect(lpPoolBalance).to.equal(expectedLpAmount);
      expect(totalSupply).to.equal(ethers.parseEther("200000000"));
    });

    it("Should mark as initialized", async function () {
      expect(await etrToken.initialized()).to.be.true;
    });
  });

  describe("Tokenomics", function () {
    it("Should have correct total supply", async function () {
      const totalSupply = await etrToken.getTotalSupply();
      expect(totalSupply).to.equal(ethers.parseEther("200000000"));
    });

    it("Should have correct fee configuration", async function () {
      const feeConfig = await etrToken.getFeeConfig();
      expect(feeConfig.buyFee).to.equal(300); // 3%
      expect(feeConfig.sellFee).to.equal(300); // 3%
      expect(feeConfig.transferFee).to.equal(0); // 0%
      expect(feeConfig.feeCollector).to.equal(lpPool.address);
    });
  });

  describe("Transfer", function () {
    it("Should transfer tokens between accounts", async function () {
      // 从 blackHole 转账给 addr1
      await etrToken.connect(blackHole).transfer(addr1.address, ethers.parseEther("1000"));
      
      const addr1Balance = await etrToken.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(ethers.parseEther("1000"));
    });

    it("Should not deduct fee for whitelisted addresses", async function () {
      // 将 blackHole 加入白名单
      await etrToken.setWhitelist(blackHole.address, true);
      
      // 从 blackHole 转账给 addr1
      await etrToken.connect(blackHole).transfer(addr1.address, ethers.parseEther("1000"));
      
      // 将 addr1 加入白名单
      await etrToken.setWhitelist(addr1.address, true);
      
      // addr1 转账给 addr2，不应该扣手续费
      const transferAmount = ethers.parseEther("100");
      await etrToken.connect(addr1).transfer(addr2.address, transferAmount);

      const addr2Balance = await etrToken.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(transferAmount);
    });
  });

  describe("Whitelist", function () {
    it("Should add address to whitelist", async function () {
      await etrToken.setWhitelist(addr1.address, true);
      expect(await etrToken.whitelisted(addr1.address)).to.be.true;
    });

    it("Should remove address from whitelist", async function () {
      await etrToken.setWhitelist(addr1.address, true);
      await etrToken.setWhitelist(addr1.address, false);
      expect(await etrToken.whitelisted(addr1.address)).to.be.false;
    });

    it("Should emit WhitelistUpdated event", async function () {
      await expect(etrToken.setWhitelist(addr1.address, true))
        .to.emit(etrToken, "WhitelistUpdated")
        .withArgs(addr1.address, true);
    });
  });

  describe("Blacklist", function () {
    it("Should add address to blacklist", async function () {
      await etrToken.setBlacklist(addr1.address, true);
      expect(await etrToken.blacklisted(addr1.address)).to.be.true;
    });

    it("Should prevent blacklisted address from transferring", async function () {
      // 先给 addr1 一些代币
      await etrToken.setWhitelist(blackHole.address, true);
      await etrToken.connect(blackHole).transfer(addr1.address, ethers.parseEther("100"));
      
      // 将 addr1 加入黑名单
      await etrToken.setBlacklist(addr1.address, true);

      // 尝试转账应该失败
      await expect(
        etrToken.connect(addr1).transfer(addr2.address, ethers.parseEther("10"))
      ).to.be.revertedWith("ETRToken: account is blacklisted");
    });
  });

  describe("Batch Transfer", function () {
    it("Should batch transfer tokens", async function () {
      // 给 blackHole 加入白名单
      await etrToken.setWhitelist(blackHole.address, true);
      
      const recipients = [addr1.address, addr2.address, addrs[0].address];
      const amounts = [
        ethers.parseEther("10"),
        ethers.parseEther("20"),
        ethers.parseEther("30"),
      ];

      await etrToken.connect(blackHole).batchTransfer(recipients, amounts);

      expect(await etrToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("10"));
      expect(await etrToken.balanceOf(addr2.address)).to.equal(ethers.parseEther("20"));
      expect(await etrToken.balanceOf(addrs[0].address)).to.equal(ethers.parseEther("30"));
    });

    it("Should reject batch transfer with mismatched arrays", async function () {
      const recipients = [addr1.address, addr2.address];
      const amounts = [ethers.parseEther("10")];

      await expect(
        etrToken.batchTransfer(recipients, amounts)
      ).to.be.revertedWith("ETRToken: length mismatch");
    });
  });

  describe("Pause", function () {
    it("Should pause the contract", async function () {
      await etrToken.pause();
      expect(await etrToken.paused()).to.be.true;
    });

    it("Should unpause the contract", async function () {
      await etrToken.pause();
      await etrToken.unpause();
      expect(await etrToken.paused()).to.be.false;
    });

    it("Should prevent transfers when paused", async function () {
      // 先给 owner 一些代币
      await etrToken.setWhitelist(blackHole.address, true);
      await etrToken.connect(blackHole).transfer(owner.address, ethers.parseEther("100"));

      await etrToken.pause();

      await expect(
        etrToken.transfer(addr1.address, ethers.parseEther("10"))
      ).to.be.revertedWith("ERC20Pausable: token transfer while paused");
    });
  });

  describe("Admin Functions", function () {
    it("Should set slippage controller", async function () {
      await etrToken.setSlippageController(addr1.address);
      expect(await etrToken.slippageController()).to.equal(addr1.address);
    });

    it("Should allow slippage controller to set sell fee", async function () {
      await etrToken.setSlippageController(addr1.address);
      await etrToken.connect(addr1).setSellFee(500); // 5%
      
      const feeConfig = await etrToken.getFeeConfig();
      expect(feeConfig.sellFee).to.equal(500);
    });

    it("Should reject setting sell fee too high", async function () {
      await etrToken.setSlippageController(addr1.address);
      await expect(
        etrToken.connect(addr1).setSellFee(6000) // 60% > 50% max
      ).to.be.revertedWith("ETRToken: sell fee too high");
    });
  });
});
