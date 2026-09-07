/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'bcryptjs', 'pdfjs-dist'],
  },
};

export default nextConfig;
