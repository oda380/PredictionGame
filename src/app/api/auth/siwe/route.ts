// src/app/api/auth/siwe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyMessage } from 'viem';
import { cookies } from 'next/headers';

const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours

interface SiweMessage {
    address: string;
    signature: string;
    message: string;
    nonce: string;
}

// POST: Verify signature and create session
export async function POST(request: NextRequest) {
    try {
        const { address, signature, message, nonce }: SiweMessage = await request.json();

        if (!address || !signature || !message || !nonce) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Verify the signature
        const isValid = await verifyMessage({
            address: address as `0x${string}`,
            message,
            signature: signature as `0x${string}`,
        });

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 401 }
            );
        }

        // Verify the message contains the expected nonce
        if (!message.includes(nonce)) {
            return NextResponse.json(
                { error: 'Invalid nonce' },
                { status: 401 }
            );
        }

        // Create session cookie with the verified address
        const sessionData = JSON.stringify({
            address: address.toLowerCase(),
            timestamp: Date.now(),
        });

        const cookieStore = await cookies();
        cookieStore.set(ADMIN_SESSION_COOKIE, sessionData, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: SESSION_MAX_AGE,
            path: '/',
        });

        return NextResponse.json({ success: true, address });
    } catch (error) {
        console.error('SIWE verification error:', error);
        return NextResponse.json(
            { error: 'Verification failed' },
            { status: 500 }
        );
    }
}

// DELETE: Clear session
export async function DELETE() {
    const cookieStore = await cookies();
    cookieStore.delete(ADMIN_SESSION_COOKIE);
    return NextResponse.json({ success: true });
}

// GET: Check current session
export async function GET() {
    const cookieStore = await cookies();
    const session = cookieStore.get(ADMIN_SESSION_COOKIE);

    if (!session) {
        return NextResponse.json({ authenticated: false });
    }

    try {
        const { address, timestamp } = JSON.parse(session.value);

        // Check if session is expired
        if (Date.now() - timestamp > SESSION_MAX_AGE * 1000) {
            cookieStore.delete(ADMIN_SESSION_COOKIE);
            return NextResponse.json({ authenticated: false });
        }

        return NextResponse.json({ authenticated: true, address });
    } catch {
        return NextResponse.json({ authenticated: false });
    }
}
