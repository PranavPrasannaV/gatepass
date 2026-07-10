import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@gatepass/findings", "@gatepass/shared"],
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),
};

export default nextConfig;
