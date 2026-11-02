
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // InternHub là ứng dụng HTML + ES Modules
  // được triển khai trong public/Interhub.

  // Hiển thị InternHub ngay tại domain gốc,
  // giữ nguyên URL trên thanh địa chỉ.
  async rewrites() {
    return [
      {
        source: "/",
        destination: "/Interhub/index.html",
      },
    ];
  },

  // Giữ các đường dẫn tương thích cũ.
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
