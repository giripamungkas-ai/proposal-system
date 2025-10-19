/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { domains: [] },
  sassOptions: {
    includePaths: ["./src/styles"],
  },
};

module.exports = nextConfig;
