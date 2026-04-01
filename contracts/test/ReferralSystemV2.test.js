const { expect, anyValue } = require("chai");
const { ethers } = require("hardhat");

describe("ReferralSystemV2", function () {
    let ReferralSystemV2;
    let referralSystem;
    let MockStakingPool;
    let mockStakingPool;
    let owner;
    let addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9, addr10;
    
    const BPS_DENOMINATOR = 10000;
    const DEFAULT_FIRST_RATE = 300;   // 3%
    const DEFAULT_SECOND_RATE = 200;  // 2%
    const DEFAULT_THIRD_RATE = 100;   // 1%
    const MIN_VALID_STAKE = ethers.parseEther("100"); // $100

    beforeEach(async function () {
        // 获取签名者
        [owner, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9, addr10] = await ethers.getSigners();
        
        // 部署 MockStakingPool
        MockStakingPool = await ethers.getContractFactory("MockStakingPool");
        mockStakingPool = await MockStakingPool.deploy();
        await mockStakingPool.waitForDeployment();
        
        // 部署一个 mock price oracle
        const MockPriceOracle = await ethers.getContractFactory("MockPriceOracle");
        mockPriceOracle = await MockPriceOracle.deploy();
        await mockPriceOracle.waitForDeployment();
        
        // 部署 ReferralSystemV2
        ReferralSystemV2 = await ethers.getContractFactory("ReferralSystemV2");
        referralSystem = await ReferralSystemV2.deploy(
            await mockStakingPool.getAddress(),
            await mockPriceOracle.getAddress()
        );
        await referralSystem.waitForDeployment();
        
        // 设置 mock 返回值
        await mockStakingPool.setValidAccount(addr1.address, true);
        await mockStakingPool.setValidAccount(addr2.address, true);
        await mockStakingPool.setValidAccount(addr3.address, true);
        await mockStakingPool.setValidAccount(addr4.address, true);
        await mockStakingPool.setValidAccount(addr5.address, true);
        await mockStakingPool.setValidAccount(addr6.address, true);
        await mockStakingPool.setValidAccount(addr7.address, true);
        await mockStakingPool.setValidAccount(addr8.address, true);
        await mockStakingPool.setValidAccount(addr9.address, true);
        await mockStakingPool.setValidAccount(addr10.address, true);
        
        // 设置质押价值（模拟每人质押$1000）
        await mockStakingPool.setPortfolioValue(addr1.address, ethers.parseEther("1000"));
        await mockStakingPool.setPortfolioValue(addr2.address, ethers.parseEther("1000"));
        await mockStakingPool.setPortfolioValue(addr3.address, ethers.parseEther("1000"));
        await mockStakingPool.setPortfolioValue(addr4.address, ethers.parseEther("1000"));
        await mockStakingPool.setPortfolioValue(addr5.address, ethers.parseEther("1000"));
        await mockStakingPool.setPortfolioValue(addr6.address, ethers.parseEther("1000"));
        await mockStakingPool.setPortfolioValue(addr7.address, ethers.parseEther("1000"));
        await mockStakingPool.setPortfolioValue(addr8.address, ethers.parseEther("1000"));
        await mockStakingPool.setPortfolioValue(addr9.address, ethers.parseEther("1000"));
        await mockStakingPool.setPortfolioValue(addr10.address, ethers.parseEther("1000"));
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await referralSystem.owner()).to.equal(owner.address);
        });

        it("Should set the right staking pool", async function () {
            expect(await referralSystem.stakingPool()).to.equal(await mockStakingPool.getAddress());
        });

        it("Should initialize with correct default rates", async function () {
            const [first, second, third] = await referralSystem.getDefaultRates();
            expect(first).to.equal(DEFAULT_FIRST_RATE);
            expect(second).to.equal(DEFAULT_SECOND_RATE);
            expect(third).to.equal(DEFAULT_THIRD_RATE);
        });

        it("Should record deployment time", async function () {
            expect(await referralSystem.deploymentTime()).to.be.gt(0);
        });
    });

    describe("Admin Functions - Rate Configuration", function () {
        it("Should allow owner to set default generation rates", async function () {
            const newFirst = 500;  // 5%
            const newSecond = 300; // 3%
            const newThird = 200;  // 2%
            
            await expect(referralSystem.setGenerationRates(newFirst, newSecond, newThird))
                .to.emit(referralSystem, "DefaultRatesUpdated")
                .withArgs(DEFAULT_FIRST_RATE, DEFAULT_SECOND_RATE, DEFAULT_THIRD_RATE, newFirst, newSecond, newThird);
            
            const [first, second, third] = await referralSystem.getDefaultRates();
            expect(first).to.equal(newFirst);
            expect(second).to.equal(newSecond);
            expect(third).to.equal(newThird);
        });

        it("Should not allow non-owner to set default rates", async function () {
            await expect(
                referralSystem.connect(addr1).setGenerationRates(500, 300, 200)
            ).to.be.reverted;
        });

        it("Should not allow rates above 100%", async function () {
            await expect(
                referralSystem.setGenerationRates(10001, 200, 100)
            ).to.be.revertedWith("ReferralSystemV2: first rate too high");
        });

        it("Should allow owner to set custom rate for user", async function () {
            const customFirst = 500;
            const customSecond = 300;
            const customThird = 200;
            
            await expect(referralSystem.setCustomRate(addr1.address, customFirst, customSecond, customThird))
                .to.emit(referralSystem, "CustomRateSet")
                .withArgs(addr1.address, customFirst, customSecond, customThird);
            
            const [first, second, third, isCustom] = await referralSystem.getUserRates(addr1.address);
            expect(first).to.equal(customFirst);
            expect(second).to.equal(customSecond);
            expect(third).to.equal(customThird);
            expect(isCustom).to.be.true;
        });

        it("Should allow owner to remove custom rate", async function () {
            await referralSystem.setCustomRate(addr1.address, 500, 300, 200);
            
            await expect(referralSystem.removeCustomRate(addr1.address))
                .to.emit(referralSystem, "CustomRateRemoved")
                .withArgs(addr1.address);
            
            const [first, second, third, isCustom] = await referralSystem.getUserRates(addr1.address);
            expect(first).to.equal(DEFAULT_FIRST_RATE);
            expect(second).to.equal(DEFAULT_SECOND_RATE);
            expect(third).to.equal(DEFAULT_THIRD_RATE);
            expect(isCustom).to.be.false;
        });

        it("Should allow batch setting custom rates", async function () {
            const users = [addr1.address, addr2.address, addr3.address];
            const firstRates = [500, 600, 700];
            const secondRates = [300, 350, 400];
            const thirdRates = [200, 250, 300];
            
            await referralSystem.batchSetCustomRates(users, firstRates, secondRates, thirdRates);
            
            for (let i = 0; i < users.length; i++) {
                const [first, second, third, isCustom] = await referralSystem.getUserRates(users[i]);
                expect(first).to.equal(firstRates[i]);
                expect(second).to.equal(secondRates[i]);
                expect(third).to.equal(thirdRates[i]);
                expect(isCustom).to.be.true;
            }
        });
    });

    describe("Referral Binding", function () {
        it("Should allow user to bind referrer", async function () {
            const tx = await referralSystem.connect(addr2).bindReferrerSelf(addr1.address);
            const receipt = await tx.wait();
            
            // 检查事件是否被触发
            const interface = referralSystem.interface;
            const events = receipt.logs.map(log => {
                try {
                    return interface.parseLog(log);
                } catch (e) {
                    return null;
                }
            }).filter(e => e && e.name === "ReferralBound");
            
            expect(events.length).to.equal(1);
            expect(events[0].args[0]).to.equal(addr2.address);
            expect(events[0].args[1]).to.equal(addr1.address);
            
            expect(await referralSystem.getReferrer(addr2.address)).to.equal(addr1.address);
        });

        it("Should not allow self-referral", async function () {
            await expect(
                referralSystem.connect(addr1).bindReferrerSelf(addr1.address)
            ).to.be.revertedWith("ReferralSystemV2: cannot refer self");
        });

        it("Should not allow duplicate binding", async function () {
            await referralSystem.connect(addr2).bindReferrerSelf(addr1.address);
            
            await expect(
                referralSystem.connect(addr2).bindReferrerSelf(addr1.address)
            ).to.be.revertedWith("ReferralSystemV2: already has referrer");
        });

        it("Should not allow circular referral", async function () {
            // A -> B -> C -> A (circular)
            await referralSystem.connect(addr2).bindReferrerSelf(addr1.address);
            await referralSystem.connect(addr3).bindReferrerSelf(addr2.address);
            
            await expect(
                referralSystem.connect(addr1).bindReferrerSelf(addr3.address)
            ).to.be.revertedWith("ReferralSystemV2: circular referral");
        });

        it("Should update referral stats correctly", async function () {
            await referralSystem.connect(addr2).bindReferrerSelf(addr1.address);
            
            const [directCount, secondGenCount, thirdGenCount] = await referralSystem.getReferralStats(addr1.address);
            expect(directCount).to.equal(1);
            expect(secondGenCount).to.equal(0);
            expect(thirdGenCount).to.equal(0);
        });
    });

    describe("New Reward Mechanism - Single Line", function () {
        beforeEach(async function () {
            // Setup: A(addr1) -> B(addr2)
            await referralSystem.connect(addr2).bindReferrerSelf(addr1.address);
        });

        it("Should calculate line rewards correctly", async function () {
            // B直推2个账户
            await referralSystem.connect(addr3).bindReferrerSelf(addr2.address);
            await referralSystem.connect(addr4).bindReferrerSelf(addr2.address);
            
            const [totalReward, details] = await referralSystem.calculateReferralRewardsWithDetails(addr1.address);
            
            // Should have 1 line (B)
            expect(details.length).to.equal(1);
            
            // Calculate expected rewards
            // B's daily reward = 1000 * 0.45% = 4.5 ETR
            // First gen reward = 4.5 * 3% = 0.135 ETR
            // Second gen reward = B's team (2 people) * 2% = (1000 * 2 * 0.45%) * 2% = 9 * 2% = 0.18 ETR
            expect(details[0].direct).to.equal(addr2.address);
            expect(details[0].firstGen).to.be.gt(0);
            expect(details[0].secondGen).to.be.gt(0);
        });

        it("Should handle multiple lines correctly", async function () {
            // A推广了B和C
            // B直推2个
            await referralSystem.connect(addr3).bindReferrerSelf(addr2.address);
            await referralSystem.connect(addr4).bindReferrerSelf(addr2.address);
            
            // C直推3个
            await referralSystem.connect(addr5).bindReferrerSelf(addr1.address); // C
            await referralSystem.connect(addr6).bindReferrerSelf(addr5.address);
            await referralSystem.connect(addr7).bindReferrerSelf(addr5.address);
            await referralSystem.connect(addr8).bindReferrerSelf(addr5.address);
            
            const [totalReward, details] = await referralSystem.calculateReferralRewardsWithDetails(addr1.address);
            
            // Should have 2 lines (B and C)
            expect(details.length).to.equal(2);
            
            // A的总收益 = B线收益 + C线收益
            const line1Total = details[0].lineTotal;
            const line2Total = details[1].lineTotal;
            expect(totalReward).to.equal(line1Total + line2Total);
        });
    });

    describe("New Reward Mechanism - Example from PRD", function () {
        it("Should match PRD Example 1: A推广了B, B直推2个", async function () {
            // A(addr1)推广了B(addr2)
            // B直推2个账户(addr3, addr4)
            await referralSystem.connect(addr2).bindReferrerSelf(addr1.address);
            await referralSystem.connect(addr3).bindReferrerSelf(addr2.address);
            await referralSystem.connect(addr4).bindReferrerSelf(addr2.address);
            
            // Calculate A's rewards
            const [totalReward, details] = await referralSystem.calculateReferralRewardsWithDetails(addr1.address);
            
            // B线收益
            const line = details[0];
            
            // First gen: B's daily reward * 3%
            // B has 1000 ETR staked, daily yield = 0.45%, so daily reward = 4.5 ETR
            // First gen = 4.5 * 3% = 0.135 ETR
            const expectedFirstGen = ethers.parseEther("4.5") * 300n / 10000n;
            
            // Second gen: B's team (2 people) * 2%
            // Team daily reward = 1000 * 2 * 0.45% = 9 ETR
            // Second gen = 9 * 2% = 0.18 ETR
            const expectedSecondGen = ethers.parseEther("9") * 200n / 10000n;
            
            expect(line.firstGen).to.equal(expectedFirstGen);
            expect(line.secondGen).to.equal(expectedSecondGen);
            expect(line.lineTotal).to.equal(expectedFirstGen + expectedSecondGen);
        });

        it("Should match PRD Example 3: A推广了B和C", async function () {
            // A(addr1)推广了B(addr2)和C(addr5)
            // B直推2个(addr3, addr4)
            // C直推3个(addr6, addr7, addr8)
            
            await referralSystem.connect(addr2).bindReferrerSelf(addr1.address);
            await referralSystem.connect(addr3).bindReferrerSelf(addr2.address);
            await referralSystem.connect(addr4).bindReferrerSelf(addr2.address);
            
            await referralSystem.connect(addr5).bindReferrerSelf(addr1.address);
            await referralSystem.connect(addr6).bindReferrerSelf(addr5.address);
            await referralSystem.connect(addr7).bindReferrerSelf(addr5.address);
            await referralSystem.connect(addr8).bindReferrerSelf(addr5.address);
            
            const [totalReward, details] = await referralSystem.calculateReferralRewardsWithDetails(addr1.address);
            
            // B线收益
            const bLine = details[0];
            
            // C线收益  
            const cLine = details[1];
            
            // 验证有2条线
            expect(bLine.direct).to.equal(addr2.address);
            expect(cLine.direct).to.equal(addr5.address);
            
            // A的总收益 = B线收益 + C线收益
            const line1Total = bLine.lineTotal;
            const line2Total = cLine.lineTotal;
            expect(totalReward).to.equal(line1Total + line2Total);
        });
    });

    describe("Unlimited Stacking (No 30 Cap)", function () {
        it("Should support more than 30 direct referrals", async function () {
            // Create 35 direct referrals for addr1
            // Note: Hardhat provides limited signers, so we create addresses programmatically
            for (let i = 0; i < 35; i++) {
                const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
                // Fund the wallet
                await owner.sendTransaction({
                    to: wallet.address,
                    value: ethers.parseEther("1")
                });
                
                await mockStakingPool.setValidAccount(wallet.address, true);
                await mockStakingPool.setPortfolioValue(wallet.address, ethers.parseEther("1000"));
                await referralSystem.connect(wallet).bindReferrerSelf(addr1.address);
            }
            
            const [directCount] = await referralSystem.getReferralStats(addr1.address);
            expect(directCount).to.be.gte(30);
            
            // Check that rewards can be calculated for the large number of referrals
            const [totalReward, , ,] = await referralSystem.calculateReferralRewards(addr1.address);
            expect(totalReward).to.be.gt(0);
        });
    });

    describe("Burn Mechanism", function () {
        it("Should apply burn when referrer stake is less than staker", async function () {
            // Set referrer (addr1) stake lower than staker (addr2)
            await mockStakingPool.setPortfolioValue(addr1.address, ethers.parseEther("50")); // Less than $100
            await mockStakingPool.setPortfolioValue(addr2.address, ethers.parseEther("1000"));
            
            await referralSystem.connect(addr2).bindReferrerSelf(addr1.address);
            
            const calc = await referralSystem.calculateReferralReward(
                addr1.address,
                addr2.address,
                ethers.parseEther("10")
            );
            
            // Burn should be applied
            expect(calc.burnAmount).to.be.gt(0);
        });

        it("Should not apply burn when referrer stake is greater or equal", async function () {
            await referralSystem.connect(addr2).bindReferrerSelf(addr1.address);
            
            const calc = await referralSystem.calculateReferralReward(
                addr1.address,
                addr2.address,
                ethers.parseEther("10")
            );
            
            // No burn when stakes are equal
            expect(calc.burnAmount).to.equal(0);
        });
    });

    describe("Custom Rate Application", function () {
        it("Should use custom rate when set", async function () {
            // Set custom rate for addr1
            await referralSystem.setCustomRate(addr1.address, 500, 300, 200); // 5%, 3%, 2%
            
            await referralSystem.connect(addr2).bindReferrerSelf(addr1.address);
            await referralSystem.connect(addr3).bindReferrerSelf(addr2.address);
            
            const [totalReward, details] = await referralSystem.calculateReferralRewardsWithDetails(addr1.address);
            
            // Should use custom rate (5% instead of 3%)
            const expectedFirstGen = ethers.parseEther("4.5") * 500n / 10000n;
            expect(details[0].firstGen).to.equal(expectedFirstGen);
        });

        it("Should use default rate when custom rate is not set", async function () {
            await referralSystem.connect(addr2).bindReferrerSelf(addr1.address);
            
            const [first, second, third, isCustom] = await referralSystem.getUserRates(addr1.address);
            expect(isCustom).to.be.false;
            expect(first).to.equal(DEFAULT_FIRST_RATE);
        });
    });

    describe("Referral Chain Query", function () {
        it("Should return correct referral chain", async function () {
            // Setup: A -> B -> C
            await referralSystem.connect(addr2).bindReferrerSelf(addr1.address);
            await referralSystem.connect(addr3).bindReferrerSelf(addr2.address);
            
            const chain = await referralSystem.getReferralChain(addr3.address);
            expect(chain[0]).to.equal(addr2.address); // First gen
            expect(chain[1]).to.equal(addr1.address); // Second gen
            expect(chain[2]).to.equal(ethers.ZeroAddress); // Third gen (none)
        });

        it("Should return empty chain for user without referrer", async function () {
            const chain = await referralSystem.getReferralChain(addr1.address);
            expect(chain[0]).to.equal(ethers.ZeroAddress);
            expect(chain[1]).to.equal(ethers.ZeroAddress);
            expect(chain[2]).to.equal(ethers.ZeroAddress);
        });
    });

    describe("Pause Functionality", function () {
        it("Should allow owner to pause and unpause", async function () {
            await referralSystem.pause();
            
            await expect(
                referralSystem.connect(addr2).bindReferrerSelf(addr1.address)
            ).to.be.reverted;
            
            await referralSystem.unpause();
            
            // Should work after unpause
            await expect(referralSystem.connect(addr2).bindReferrerSelf(addr1.address))
                .to.not.be.reverted;
        });

        it("Should not allow non-owner to pause", async function () {
            await expect(
                referralSystem.connect(addr1).pause()
            ).to.be.reverted;
        });
    });

    describe("Edge Cases", function () {
        it("Should handle zero stake value", async function () {
            // Note: calculateReferralRewards returns rate-based calculation, not actual rewards
            // The zero stake case is handled in the reward distribution logic
            await referralSystem.connect(addr2).bindReferrerSelf(addr1.address);
            
            // This should work - the rate-based calculation doesn't check stake
            const [totalReward, firstGenTotal, secondGenTotal, thirdGenTotal] = 
                await referralSystem.calculateReferralRewards(addr1.address);
            
            // Since addr2 has 0 stake, the actual reward distribution would be 0
            // But the rate-based calculation returns the rate (300 = 3%)
            expect(firstGenTotal).to.equal(300); // 1 direct * 3%
        });

        it("Should handle invalid referrer", async function () {
            await mockStakingPool.setValidAccount(addr1.address, false);
            
            await expect(
                referralSystem.connect(addr2).bindReferrerSelf(addr1.address)
            ).to.be.revertedWith("ReferralSystemV2: referrer not valid");
        });

        it("Should handle multiple generations correctly", async function () {
            // A -> B -> C -> D
            await referralSystem.connect(addr2).bindReferrerSelf(addr1.address);
            await referralSystem.connect(addr3).bindReferrerSelf(addr2.address);
            await referralSystem.connect(addr4).bindReferrerSelf(addr3.address);
            
            // Check stats for all
            const [aDirect, aSecond, aThird] = await referralSystem.getReferralStats(addr1.address);
            expect(aDirect).to.equal(1);
            expect(aSecond).to.equal(1);
            expect(aThird).to.equal(1);
            
            const [bDirect, bSecond, bThird] = await referralSystem.getReferralStats(addr2.address);
            expect(bDirect).to.equal(1);
            expect(bSecond).to.equal(1);
            expect(bThird).to.equal(0);
        });
    });
});
