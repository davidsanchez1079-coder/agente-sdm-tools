import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Evita que Next infiera el root fuera del repo (por lockfiles externos).
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
