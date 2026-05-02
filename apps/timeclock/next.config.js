/** @type {import('next').NextConfig} */
const config = {
  transpilePackages: ["@primeair/ui", "@primeair/api", "@primeair/db"],
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
  env: {
    AUTH_SECRET: process.env.AUTH_SECRET ?? "",
  },
  async rewrites() {
    const hubUrl = process.env.HUB_URL ?? "http://localhost:3000";
    return [
      {
        source: "/uploads/:path*",
        destination: `${hubUrl}/uploads/:path*`,
      },
    ];
  },
};

module.exports = config;
