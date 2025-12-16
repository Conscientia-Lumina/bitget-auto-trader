/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['bitget-api'],
  },
  transpilePackages: ['@supabase/ssr', '@supabase/supabase-js'],
};

module.exports = nextConfig;
