import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que Turbopack use el package-lock del home del usuario como raíz del monorepo.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
