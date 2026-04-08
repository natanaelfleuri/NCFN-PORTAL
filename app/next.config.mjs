/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ['cdn.builder.io'],
    },
    experimental: {
        instrumentationHook: true,
        serverComponentsExternalPackages: ['geoip-lite', '@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner', 'playwright', 'playwright-core', 'googleapis', 'webdav'],
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    async redirects() {
        return [
            // www.ncfn.net → ncfn.net (canonical)
            {
                source: '/:path*',
                has: [{ type: 'host', value: 'www.ncfn.net' }],
                destination: 'https://ncfn.net/:path*',
                permanent: true,
            },
        ];
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-Frame-Options',
                        value: 'ALLOW-FROM https://builder.io',
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: "frame-ancestors 'self' https://builder.io https://*.builder.io",
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=()',
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
