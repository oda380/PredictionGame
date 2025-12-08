
import { NextRequest, NextResponse } from 'next/server';
import rateLimit from '../../../../../lib/rate-limit';

const limiter = rateLimit({
    interval: 60 * 1000, // 60 seconds
    uniqueTokenPerInterval: 500, // Max 500 unique IPs per interval
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ timestamp: string }> }
) {
    const { timestamp } = await params;

    if (!timestamp || isNaN(Number(timestamp))) {
        return NextResponse.json({ error: 'Invalid timestamp' }, { status: 400 });
    }

    try {
        // Rate Limit: 20 requests per minute per IP
        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
        await limiter.check(20, ip);
    } catch {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const rawTargetTime = parseInt(timestamp);

    // VALIDATION & ROUNDING
    // Round to nearest 10 minutes (600 seconds) to maximize cache hits across users
    // asking for slightly different times in the same round window.
    const targetTime = Math.round(rawTargetTime / 600) * 600;

    // Create a 4 hour window around the target time (2h before, 2h after) to ensure we find a data point
    const fromTime = targetTime - 7200;
    const toTime = targetTime + 7200;

    try {
        const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=${fromTime}&to=${toTime}`;

        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
            },
            next: { revalidate: 3600 } // Server-side fetch cache for 1 hour
        });

        if (!response.ok) {
            // If we hit CoinGecko rate limits, pass that info back 500/429
            if (response.status === 429) {
                return NextResponse.json({ error: 'Upstream rate limit' }, { status: 429 });
            }
            throw new Error(`CoinGecko API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.prices || data.prices.length === 0) {
            return NextResponse.json({ error: 'No price data found for this time range' }, { status: 404 });
        }

        const prices = data.prices as [number, number][];

        // Find price closest to the ROUNDED targetTime
        let closestPrice = prices[0][1];
        let minTimeDiff = Math.abs((prices[0][0] / 1000) - targetTime);

        for (let i = 1; i < prices.length; i++) {
            const timeDiff = Math.abs((prices[i][0] / 1000) - targetTime);
            if (timeDiff < minTimeDiff) {
                minTimeDiff = timeDiff;
                closestPrice = prices[i][1];
            }
        }

        // Return with Cache-Control headers for the browser/CDN
        return NextResponse.json({
            price: closestPrice,
            timestamp: targetTime,
            requestedTimestamp: rawTargetTime
        }, {
            headers: {
                // Cache for 1 hour (3600s), allow stale data for another 10 mins while revalidating
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=600',
            }
        });

    } catch (error) {
        console.error('Error fetching historical price:', error);
        return NextResponse.json({ error: 'Failed to fetch historical price' }, { status: 500 });
    }
}
