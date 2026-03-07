import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
    function middleware(req) {
        const { nextUrl, nextauth } = req;
        const role = (nextauth.token as any)?.role;

        if (nextUrl.pathname.startsWith('/admin') && role !== 'admin') {
            return NextResponse.redirect(new URL('/login?error=unauthorized', nextUrl));
        }
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
        pages: {
            signIn: '/login',
        },
    }
);

export const config = {
    matcher: ['/admin/:path*'],
};
