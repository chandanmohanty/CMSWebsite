import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output bundles a self-contained server (.next/standalone/server.js)
  // so Hostinger's Node.js app hosting (Passenger) can run it directly, without
  // installing node_modules on the server.
  output: "standalone",
};

export default nextConfig;
