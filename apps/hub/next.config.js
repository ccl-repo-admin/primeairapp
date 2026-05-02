const path = require("path");

/** @type {import('next').NextConfig} */
const config = {
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@primeair/ui", "@primeair/api", "@primeair/db"],
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
  env: {
    AUTH_SECRET: process.env.AUTH_SECRET ?? "",
  },
};

module.exports = config;
