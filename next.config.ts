import type { NextConfig } from "next";

// 사내 프록시 SSL 우회
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const nextConfig: NextConfig = {
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
