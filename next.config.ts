import type { NextConfig } from 'next';
const config: NextConfig = {
  distDir: process.env.EVENTSIGNAL_TEST_DIST ?? '.next',
  env: {
    EVENTSIGNAL_BUILD_OWNER:
      process.env.EVENTSIGNAL_MODE === 'owner' ? 'yes' : 'no',
  },
  poweredByHeader: false,
};
export default config;
