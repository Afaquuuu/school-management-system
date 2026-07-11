/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, must-revalidate",
          },
        ],
      },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: [
      "@whiskeysockets/baileys",
      "ws",
      "bufferutil",
      "utf-8-validate",
      "qrcode",
    ],
  },
};

export default nextConfig;
