import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const apiKey = process.env.CG_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { error: 'CoinGecko API key not configured' },
            { status: 500 }
        );
    }

    try {
        const response = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_last_updated_at=true',
            {
                headers: {
                    'x-cg-demo-api-key': apiKey,
                },
                next: {
                    revalidate: 60, // Cache for 60 seconds
                },
            }
        );

        if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.status}`);
        }

        const data = await response.json();

        return NextResponse.json({
            bitcoin: {
                price: data.bitcoin?.usd || null,
                lastUpdated: data.bitcoin?.last_updated_at || null,
            },
            ethereum: {
                price: data.ethereum?.usd || null,
                lastUpdated: data.ethereum?.last_updated_at || null,
            },
        });
    } catch (error) {
        console.error('CoinGecko API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch prices from CoinGecko' },
            { status: 500 }
        );
    }
}
