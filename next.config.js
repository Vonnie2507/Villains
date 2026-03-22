/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Skip pre-rendering errors for pages that need Supabase at runtime
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
}

module.exports = nextConfig
