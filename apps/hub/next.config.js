const path = require("path");

/** @type {import('next').NextConfig} */
const config = {
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@primeair/ui", "@primeair/api", "@primeair/db"],
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "@prisma/engines"],
    outputFileTracingIncludes: {
      "/**": [
        "../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/*.node",
        "../../node_modules/.pnpm/@prisma+engines@*/node_modules/@prisma/engines/*.node",
      ],
    },
  },
  env: {
    AUTH_SECRET: process.env.AUTH_SECRET ?? "",
  },
};

module.exports = config;
