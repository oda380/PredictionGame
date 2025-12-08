// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_SESSION_COOKIE = 'admin_session';
const GAME_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS;

export async function middleware(request: NextRequest) {
    // Only protect /admin routes
    if (!request.nextUrl.pathname.startsWith('/admin')) {
        return NextResponse.next();
    }

    // Get session cookie
    const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE);

    if (!sessionCookie) {
        // No session - redirect to home with message
        const url = new URL('/', request.url);
        url.searchParams.set('auth', 'required');
        return NextResponse.redirect(url);
    }

    try {
        const session = JSON.parse(sessionCookie.value);
        const { address, timestamp } = session;

        // Check if session is expired (24 hours)
        const SESSION_MAX_AGE = 60 * 60 * 24 * 1000;
        if (Date.now() - timestamp > SESSION_MAX_AGE) {
            const response = NextResponse.redirect(new URL('/?auth=expired', request.url));
            response.cookies.delete(ADMIN_SESSION_COOKIE);
            return response;
        }

        // Verify owner by calling API (server-to-server)
        const verifyUrl = new URL('/api/auth/verify-owner', request.url);
        const verifyResponse = await fetch(verifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address }),
        });

        if (!verifyResponse.ok) {
            return NextResponse.redirect(new URL('/?auth=error', request.url));
        }

        const { isOwner } = await verifyResponse.json();

        if (!isOwner) {
            // Not the owner - redirect with unauthorized message
            return NextResponse.redirect(new URL('/?auth=unauthorized', request.url));
        }

        // Owner verified - allow access
        return NextResponse.next();
    } catch (error) {
        console.error('Middleware error:', error);
        return NextResponse.redirect(new URL('/?auth=error', request.url));
    }
}

export const config = {
    matcher: '/admin/:path*',
};
