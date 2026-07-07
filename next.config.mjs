/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
