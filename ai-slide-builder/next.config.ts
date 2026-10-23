import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep standalone builds inside this program in the shared repository.
  turbopack: { root: process.cwd() },
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
