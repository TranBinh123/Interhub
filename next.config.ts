import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/Interhub",
        destination: "/Interhub/index.html",
        permanent: false,
      },
      {
        source: "/Interhub/",
        destination: "/Interhub/index.html",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
