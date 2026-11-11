import type { NextConfig } from 'next';
const config: NextConfig = { transpilePackages: ['@market/core', '@market/connectors'] };
export default config;
