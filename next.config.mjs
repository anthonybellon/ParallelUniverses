import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Linting runs on its own (npm run lint) with the ESLint 9 flat config,
  // which `next build` in Next 14 can't read.
  eslint: { ignoreDuringBuilds: true },
};

export default withNextIntl(nextConfig);
