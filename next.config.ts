import type { NextConfig } from "next";
import { resolveAllowedDevOrigins } from "./src/config/dev-origins";

const nextConfig: NextConfig = {
  allowedDevOrigins: resolveAllowedDevOrigins(),
};

export default nextConfig;
