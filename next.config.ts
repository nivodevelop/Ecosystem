import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Загрузка нескольких скринов за раз
    serverActions: { bodySizeLimit: "100mb" },
  },
};

export default nextConfig;
