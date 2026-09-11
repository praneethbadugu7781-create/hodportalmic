/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'bcryptjs', 'pdfjs-dist', 'nodemailer'],
  },
};

export default nextConfig;
