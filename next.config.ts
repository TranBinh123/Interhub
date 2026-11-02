import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // InternHub là site tĩnh (HTML + ES modules) đặt trong public/Interhub.
  // Trang chủ chuyển thẳng tới màn hình đăng nhập.
  async redirects() {
    return [
      { source: "/", destination: "/Interhub/index.html", permanent: false },
      { source: "/Interhub", destination: "/Interhub/index.html", permanent: false },
      { source: "/Interhub/", destination: "/Interhub/index.html", permanent: false }
    ];
  }
};

export default nextConfig;
