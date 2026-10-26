import type {NextConfig} from 'next';

// Served from uzookafor.com/lunon-living-report/ as a static folder inside the
// portfolio's GitHub Pages deploy, so every asset needs the prefix.
const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/lunon-living-report',
  trailingSlash: true,
  images: {unoptimized: true},
  devIndicators: false,
};

// Next.js only reads a default export here (an exception to named exports).
export default nextConfig;
