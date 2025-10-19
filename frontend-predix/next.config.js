/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    // appDir is now stable in Next.js 14
  },
  env: {
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    NEXT_PUBLIC_ALCHEMY_ID: process.env.NEXT_PUBLIC_ALCHEMY_ID,
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || '80002',
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology/',
    NEXT_PUBLIC_ROUND_MANAGER_ADDRESS: process.env.NEXT_PUBLIC_ROUND_MANAGER_ADDRESS,
    NEXT_PUBLIC_PREDICTION_POOL_ADDRESS: process.env.NEXT_PUBLIC_PREDICTION_POOL_ADDRESS,
    NEXT_PUBLIC_AI_API_URL: process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:8000',
  },
  images: {
    domains: ['assets.coingecko.com', 'logos.covalenthq.com'],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;
