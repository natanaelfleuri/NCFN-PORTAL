/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        instrumentationHook: true,
        serverComponentsExternalPackages: ['geoip-lite'],
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    }
};

export default nextConfig;
