import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Expose to client so runner dashboard can skip geolocation when dev flag is on.
    RUNNER_SKIP_CLOCK_IN_GEO_CHECK: process.env.RUNNER_SKIP_CLOCK_IN_GEO_CHECK,
  },
};

export default nextConfig;
