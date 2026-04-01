const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PriceOracle", function () {
  let priceOracle;
  let mockPair;
  let owner;
  let addr1;
  let addrs;

  beforeEach(async function () {
    // 获取测试账户
    [owner, addr1, ...addrs] = await ethers.getSigners();

    // 部署Mock PancakeSwap Pair
    const MockPancakePair = await ethers.getContractFactory("MockPancakePair");
    mockPair = await MockPancakePair.deploy();
    await mockPair.waitForDeployment();

    // 设置初始储备量 (ETR/BUSD)
    await mockPair.setReserves(
      ethers.parseEther("1000000"), // 1M ETR
      ethers.parseEther("100000")   // 100k BUSD
    );

    // 部署PriceOracle合约
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    priceOracle = await PriceOracle.deploy(await mockPair.getAddress(), true); // ETR是token0
    await priceOracle.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right LP pair address", async function () {
      expect(await priceOracle.pancakePair()).to.equal(await mockPair.getAddress());
    });

    it("Should initialize with correct TWAP config", async function () {
      const config = await priceOracle.twapConfig();
      expect(config.observationInterval).to.equal(3600); // 1 hour
      expect(config.twapWindow).to.equal(86400); // 24 hours
      expect(config.maxPriceDeviation).to.equal(1000); // 10%
    });

    it("Should initialize with correct oracle config", async function () {
      const config = await priceOracle.oracleConfig();
      expect(config.lpPair).to.equal(await mockPair.getAddress());
      expect(config.isToken0ETR).to.be.true;
    });
  });

  describe("Price Calculation", function () {
    it("Should calculate price correctly when ETR is token0", async function () {
      // 100k BUSD / 1M ETR = 0.1 BUSD per ETR
      const price = await priceOracle.getPrice();
      const expectedPrice = ethers.parseEther("0.1");
      
      // 允许0.1%的误差
      const tolerance = expectedPrice / 1000n;
      expect(Number(price)).to.be.closeTo(Number(expectedPrice), Number(tolerance));
    });

    it("Should return 0 if reserves are zero", async function () {
      await mockPair.setReserves(0, 0);
      const price = await priceOracle.getPrice();
      expect(price).to.equal(0);
    });

    it("Should update current price on updatePrice", async function () {
      await priceOracle.updatePrice();
      const currentPrice = await priceOracle.currentPrice();
      expect(currentPrice).to.be.gt(0);
    });
  });

  describe("TWAP Calculation", function () {
    it("Should calculate TWAP with single observation", async function () {
      await priceOracle.updatePrice();
      const twap = await priceOracle.getTWAPPrice();
      expect(twap).to.be.gt(0);
    });

    it("Should calculate TWAP with multiple observations", async function () {
      // 添加多个观测点
      for (let i = 0; i < 3; i++) {
        await priceOracle.updatePrice();
        // 模拟时间推进
        await network.provider.send("evm_increaseTime", [3600]); // 1 hour
        await network.provider.send("evm_mine");
      }

      const twap = await priceOracle.getTWAPPrice();
      expect(twap).to.be.gt(0);
    });
  });

  describe("Observation Recording", function () {
    it("Should record observation on updatePrice", async function () {
      await priceOracle.updatePrice();
      const count = await priceOracle.getObservationCount();
      expect(count).to.equal(1);
    });

    it("Should emit PriceUpdated event", async function () {
      const tx = await priceOracle.updatePrice();
      const receipt = await tx.wait();
      
      // 检查事件 - ethers v6 使用 logs
      const priceOracleInterface = priceOracle.interface;
      const event = receipt.logs
        .map(log => {
          try {
            return priceOracleInterface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .find(event => event && event.name === "PriceUpdated");
      
      expect(event).to.not.be.undefined;
    });
  });

  describe("Price Validation", function () {
    beforeEach(async function () {
      // 添加一些历史观测数据
      await priceOracle.updatePrice();
    });

    it("Should validate price when within deviation", async function () {
      const isValid = await priceOracle.isPriceValid();
      expect(isValid).to.be.true;
    });

    it("Should return price deviation", async function () {
      const deviation = await priceOracle.getPriceDeviation();
      // 初始状态价格偏差应该为0
      expect(deviation).to.equal(0);
    });

    it("Should return validated price", async function () {
      const validatedPrice = await priceOracle.getValidatedPrice();
      expect(validatedPrice).to.be.gt(0);
    });
  });

  describe("Admin Functions", function () {
    it("Should set LP pair address", async function () {
      const newPair = addrs[0].address;
      await priceOracle.setLPPair(newPair);
      expect(await priceOracle.pancakePair()).to.equal(newPair);
    });

    it("Should update TWAP config", async function () {
      await priceOracle.updateTWAPConfig(1800, 43200, 500);
      const config = await priceOracle.twapConfig();
      expect(config.observationInterval).to.equal(1800);
      expect(config.twapWindow).to.equal(43200);
      expect(config.maxPriceDeviation).to.equal(500);
    });

    it("Should reject invalid TWAP config", async function () {
      await expect(
        priceOracle.updateTWAPConfig(0, 43200, 500)
      ).to.be.revertedWith("PriceOracle: invalid interval");

      await expect(
        priceOracle.updateTWAPConfig(1800, 0, 500)
      ).to.be.revertedWith("PriceOracle: invalid window");

      await expect(
        priceOracle.updateTWAPConfig(1800, 43200, 10001)
      ).to.be.revertedWith("PriceOracle: deviation too high");
    });

    it("Should set fallback oracle", async function () {
      await priceOracle.setFallbackOracle(addr1.address);
      expect(await priceOracle.fallbackOracle()).to.equal(addr1.address);
    });

    it("Should emergency set price", async function () {
      const newPrice = ethers.parseEther("0.5");
      await priceOracle.emergencySetPrice(newPrice);
      expect(await priceOracle.currentPrice()).to.equal(newPrice);
    });

    it("Should batch update observations", async function () {
      const now = Math.floor(Date.now() / 1000);
      const prices = [
        ethers.parseEther("0.1"),
        ethers.parseEther("0.11"),
        ethers.parseEther("0.12"),
      ];
      const timestamps = [
        now - 7200,
        now - 3600,
        now,
      ];

      await priceOracle.batchUpdate(prices, timestamps);
      const count = await priceOracle.getObservationCount();
      expect(count).to.equal(3);
    });
  });

  describe("Pause", function () {
    it("Should pause the contract", async function () {
      await priceOracle.pause();
      expect(await priceOracle.paused()).to.be.true;
    });

    it("Should unpause the contract", async function () {
      await priceOracle.pause();
      await priceOracle.unpause();
      expect(await priceOracle.paused()).to.be.false;
    });

    it("Should prevent price updates when paused", async function () {
      await priceOracle.pause();
      await expect(priceOracle.updatePrice()).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("Query Functions", function () {
    beforeEach(async function () {
      // 添加一些观测数据
      await priceOracle.updatePrice();
    });

    it("Should return price history", async function () {
      const history = await priceOracle.getPriceHistory(1);
      expect(history.length).to.equal(1);
    });

    it("Should return latest observation", async function () {
      const latest = await priceOracle.getLatestObservation();
      expect(latest.price).to.be.gt(0);
    });

    it("Should return config", async function () {
      const [twapConfig, oracleConfig] = await priceOracle.getConfig();
      expect(twapConfig.observationInterval).to.equal(3600);
      expect(oracleConfig.lpPair).to.equal(await mockPair.getAddress());
    });
  });
});
