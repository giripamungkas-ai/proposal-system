/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  generateEtags: false,

  // Development optimizations
  reactStrictMode: true,
  swcMinify: true,

  // Watchpack configuration - ignore Windows system files
  webpackDevMiddleware: (config) => {
    config.watchOptions.ignored = [
      '**/node_modules/**',
      '**/.next/**',
      '**/.git/**',
      '**/dist/**',
      'C:\\pagefile.sys',
      'C:\\hiberfil.sys',
      'C:\\swapfile.sys',
      'C:\\DumpStack.log.tmp',
      'C:\\hiberfil.sys',
      'C:\\pagefile.sys',
      'C:\\swapfile.sys',
      '**/Logs/**',
      '**/log/**',
      '**/temp/**'
    ]
    return config
  },

  // CORS configuration
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization' },
        ],
      },
    ]
  },

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/',
        permanent: false,
      },
    ]
  },

  // Path aliases
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }
    return config
  },

  // Experimental features
  experimental: {
    serverActions: {
      bodySize: '10mb',
    },
    optimizeCss: true,
    optimizePackageImports: true,
  },

  // Static optimization
  output: 'standalone',

  // Security headers
  async securityHeaders() {
    return [
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on',
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
    ]
  },
}

export default nextConfig
```

## 🛠️ **Step 5: Test Perbaikan**
