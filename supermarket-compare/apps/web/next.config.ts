import type { NextConfig } from 'next';
const config: NextConfig = { devIndicators: false, transpilePackages: ['@market/core', '@market/connectors'] };
export default config;
