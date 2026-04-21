import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Prevent Turbopack from bundling Prisma client so it reads DATABASE_URL
  // from the runtime environment instead of baking it in at build time
  serverExternalPackages: ['@prisma/client', '.prisma/client'],
};

export default nextConfig;
