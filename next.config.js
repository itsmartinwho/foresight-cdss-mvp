/** @type {import('next').NextConfig} */
const nextConfig = {
  // Development optimizations
  experimental: {
    // Use SWC for faster compilation
    swcMinify: true,
    // Enable faster refresh
    fastRefresh: true,
    // Optimize bundle analyzer for dev
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
    // Enable turbo mode for faster builds
    turbo: {
      loaders: {
        '.svg': ['@svgr/webpack'],
      },
    },
  },
  
  // Compiler optimizations
  compiler: {
    // Remove console.logs in production but keep in development
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Image optimization
  images: {
    dangerouslyAllowSVG: true,
    // Optimize for development
    unoptimized: process.env.NODE_ENV === 'development',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  
  // Development server optimizations
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  
  // Webpack optimizations for development
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Speed up development builds
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      };
      
      // Faster source maps for development
      config.devtool = 'eval-cheap-module-source-map';
    }
    
    return config;
  },
};

module.exports = nextConfig; 