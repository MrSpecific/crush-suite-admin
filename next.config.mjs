// @ts-check
/** @type {import('next').NextConfig} */
import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';

const prismaPlugin = new PrismaPlugin();

const nextConfig = {
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.svg$/i,
      use: ['@svgr/webpack'],
    });

    if (isServer) {
      config.plugins = [...config.plugins, prismaPlugin];
    }

    return config;
  },
};

export default nextConfig;
