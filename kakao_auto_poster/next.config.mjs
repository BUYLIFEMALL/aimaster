/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep standalone builds inside this program in the shared repository.
  turbopack: { root: process.cwd() },};

export default nextConfig;
