// src/app/api/auth/verify-owner/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, Address } from 'viem';
import { base } from 'viem/chains';

const GAME_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS as Address;
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';

// Minimal ABI for owner() function
const OWNER_ABI = [
    {
        inputs: [],
        name: 'owner',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

export async function POST(request: NextRequest) {
    try {
        const { address } = await request.json();

        if (!address || typeof address !== 'string') {
            return NextResponse.json(
                { error: 'Address required', isOwner: false },
                { status: 400 }
            );
        }

        if (!GAME_CONTRACT_ADDRESS) {
            return NextResponse.json(
                { error: 'Contract address not configured', isOwner: false },
                { status: 500 }
            );
        }

        // Create a public client to read from the blockchain
        const publicClient = createPublicClient({
            chain: base,
            transport: http(RPC_URL),
        });

        // Call owner() on the contract
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contractOwner = await (publicClient as any).readContract({
            address: GAME_CONTRACT_ADDRESS,
            abi: OWNER_ABI,
            functionName: 'owner',
        }) as `0x${string}`;

        const isOwner = contractOwner.toLowerCase() === address.toLowerCase();

        return NextResponse.json({ isOwner, owner: contractOwner });
    } catch (error) {
        console.error('Error verifying owner:', error);
        return NextResponse.json(
            { error: 'Failed to verify owner', isOwner: false },
            { status: 500 }
        );
    }
}
