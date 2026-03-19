import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Turbopack 配置（Next.js 16 默认使用）
  turbopack: {},
  webpack: (config) => {
    // 排除某些依赖在服务端渲染（Web3Modal/WalletConnect 相关）
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

export default nextConfig;
