
/**
 * DividendPool 合约 ABI
 * Auto-generated from contract artifacts
 */
export const DividendPoolABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_etrToken",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_governanceAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_presaleAddress",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "enum DividendPool.DividendLevel",
        "name": "level",
        "type": "uint8"
      }
    ],
    "name": "DividendClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "governanceAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "presaleAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "dividendAmount",
        "type": "uint256"
      }
    ],
    "name": "DividendDeposited",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "v1Amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "v2Amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "v3Amount",
        "type": "uint256"
      }
    ],
    "name": "DividendDistributed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "enum DividendPool.DividendLevel",
        "name": "level",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "userCount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalWeight",
        "type": "uint256"
      }
    ],
    "name": "LevelStatsUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "Paused",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "Unpaused",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "enum DividendPool.DividendLevel",
        "name": "oldLevel",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "enum DividendPool.DividendLevel",
        "name": "newLevel",
        "type": "uint8"
      }
    ],
    "name": "UserLevelUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "enum DividendPool.DividendLevel",
        "name": "level",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "smallZonePerformance",
        "type": "uint256"
      }
    ],
    "name": "UserQualified",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "BPS_DENOMINATOR",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DISTRIBUTION_INTERVAL",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DIVIDEND_SHARE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "GOVERNANCE_SHARE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "PRESALE_SHARE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "PRICE_PRECISION",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "V1_DIRECT_REFERRALS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "V1_MIN_STAKE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "V1_SHARE_PERCENT",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "V1_SMALL_ZONE_MIN",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "V2_DIRECT_REFERRALS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "V2_MIN_STAKE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "V2_SHARE_PERCENT",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "V2_SMALL_ZONE_MIN",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "V3_DIRECT_REFERRALS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "V3_MIN_STAKE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "V3_SHARE_PERCENT",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "V3_SMALL_ZONE_MIN",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "users",
        "type": "address[]"
      }
    ],
    "name": "batchUpdateUserLevels",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "claimDividend",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "depositSlippageFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "distributeDividend",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "emergencyWithdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "estimateUserDividend",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "etrToken",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getLevelRequirements",
    "outputs": [
      {
        "internalType": "uint256[3]",
        "name": "directReqs",
        "type": "uint256[3]"
      },
      {
        "internalType": "uint256[3]",
        "name": "stakeReqs",
        "type": "uint256[3]"
      },
      {
        "internalType": "uint256[3]",
        "name": "zoneReqs",
        "type": "uint256[3]"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum DividendPool.DividendLevel",
        "name": "level",
        "type": "uint8"
      }
    ],
    "name": "getLevelStats",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "userCount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalWeight",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "dividendPool",
            "type": "uint256"
          }
        ],
        "internalType": "struct DividendPool.LevelStats",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPoolStatus",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "totalBalance",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "availableForDistribution",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastDistributionTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalDistributed",
            "type": "uint256"
          }
        ],
        "internalType": "struct DividendPool.PoolStatus",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getUserDividendInfo",
    "outputs": [
      {
        "components": [
          {
            "internalType": "enum DividendPool.DividendLevel",
            "name": "level",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "personalStake",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "smallZonePerformance",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalTeamPerformance",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxDirectPerformance",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastClaimTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalDividendClaimed",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isQualified",
            "type": "bool"
          }
        ],
        "internalType": "struct DividendPool.UserDividendInfo",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "governanceAddress",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum DividendPool.DividendLevel",
        "name": "",
        "type": "uint8"
      }
    ],
    "name": "levelStats",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "userCount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalWeight",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "dividendPool",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paused",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "poolStatus",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "totalBalance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "availableForDistribution",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "lastDistributionTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalDistributed",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "presaleAddress",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "referralSystem",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_governance",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_presale",
        "type": "address"
      }
    ],
    "name": "setAddresses",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_stakingPool",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_referralSystem",
        "type": "address"
      }
    ],
    "name": "setContracts",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "stakingPool",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "unpause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "updateUserLevel",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "userInfos",
    "outputs": [
      {
        "internalType": "enum DividendPool.DividendLevel",
        "name": "level",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "personalStake",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "smallZonePerformance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalTeamPerformance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maxDirectPerformance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "lastClaimTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalDividendClaimed",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isQualified",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export default DividendPoolABI;
