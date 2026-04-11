import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/login",
        permanent: false, // Ensure it's not cached forever if you ever want a real home page
      },
    ];
  },
};

export default nextConfig;
