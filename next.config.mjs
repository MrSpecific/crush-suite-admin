// @ts-check
/** @type {import('next').NextConfig} */

const nextConfig = {
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.svg$/i,
      use: ['@svgr/webpack'],
    });

    if (isServer) {
      config.plugins = [...config.plugins];
    }

    return config;
  },
};

export default nextConfig;
