import { NextRequest, NextResponse } from 'next/server';
import rateLimit from '../../../../lib/rate-limit';

const limiter = rateLimit({
    interval: 60 * 1000,
    uniqueTokenPerInterval: 500,
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ address: string }> }
) {
    const { address } = await params;

    // Validate address format
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return NextResponse.json(
            { error: 'Invalid Ethereum address' },
            { status: 400 }
        );
    }

    try {
        // Rate Limit: 20 requests per minute per IP
        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
        await limiter.check(20, ip);
    } catch {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const alchemyApiKey = process.env.ALCHEMY_API_KEY;
    const contractAddress = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS;

    if (!alchemyApiKey) {
        return NextResponse.json(
            { error: 'Alchemy API key not configured', transactions: [] },
            { status: 500 }
        );
    }

    try {
        // Determine network based on chain ID
        const chainId = process.env.NEXT_PUBLIC_BASE_CHAIN_ID || "8453";
        const network = chainId === "84532" ? "base-sepolia" : "base-mainnet";

        // Using Alchemy's getAssetTransfers API - queries by wallet address directly
        const alchemyUrl = `https://${network}.g.alchemy.com/v2/${alchemyApiKey}`;

        const requestBody = {
            jsonrpc: '2.0',
            id: 1,
            method: 'alchemy_getAssetTransfers',
            params: [{
                fromAddress: address,
                toAddress: contractAddress,
                category: ['external'],
                maxCount: '0x14', // 20 in hex
                order: 'desc',
                excludeZeroValue: false
            }]
        };

        const response = await fetch(alchemyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            // Changed from 'no-store' to 'force-cache' with next.revalidate to caching results for 15 seconds.
            // This prevents spamming Alchemy if the user refreshes rapidly.
            cache: 'force-cache',
            next: { revalidate: 15 }
        });

        if (!response.ok) {
            console.error('Alchemy HTTP error:', response.status, response.statusText);
            throw new Error(`Alchemy returned ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            console.error('Alchemy API error:', data.error);
            return NextResponse.json(
                { error: data.error.message || 'Alchemy API error', transactions: [] },
                { status: 502 }
            );
        }

        // Transform Alchemy's response to match expected format
        const transfers = data.result?.transfers || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transactions = transfers.map((transfer: any) => ({
            hash: transfer.hash,
            from: transfer.from,
            to: transfer.to,
            value: transfer.value,
            blockNum: transfer.blockNum,
            isError: '0' // Alchemy only returns successful transfers
        }));

        console.log(`Found ${transactions.length} transactions to contract from ${address}`);

        return NextResponse.json({
            transactions: transactions
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Alchemy API fetch error:', errorMessage);
        return NextResponse.json(
            { error: `Failed to fetch transactions: ${errorMessage}`, transactions: [] },
            { status: 500 }
        );
    }
}
