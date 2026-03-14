import { http, createConfig } from 'wagmi';
import { bsc, bscTestnet } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

/**
 * Wagmi v2 配置
 * 配置支持的链和连接器
 */

// 创建配置
export const wagmiConfig = createConfig({
  chains: [bsc, bscTestnet],
  connectors: [
    // MetaMask / TrustWallet / 其他浏览器钱包
    injected({ target: 'metaMask' }),
    // WalletConnect
    walletConnect({
      projectId: 'etr_dapp_walletconnect_project_id',
      metadata: {
        name: '赤道ETR DAPP',
        description: '赤道ETR - 去中心化质押挖矿平台',
        url: 'https://etr.finance',
        icons: ['https://etr.finance/logo.png'],
      },
      showQrModal: true,
    }),
  ],
  transports: {
    [bsc.id]: http(),
    [bscTestnet.id]: http(),
  },
});

export { bsc, bscTestnet };
export default wagmiConfig;
