import { NextResponse } from 'next/server';
import { BANGLADESH_BANK_URL, BB_CURRENCIES, parseBangladeshBankRate } from '@/lib/exchange-rate.mjs';

export const runtime = 'nodejs';

export async function GET(request) {
  const currency = (request.nextUrl.searchParams.get('currency') || '').toUpperCase();
  if (!BB_CURRENCIES.includes(currency)) {
    return NextResponse.json({ error: 'This currency is not in the Bangladesh Bank rate table.' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(BANGLADESH_BANK_URL, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; TradeFinanceTools/1.0; +https://trade-finance-tools.vercel.app)',
      },
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error(`Bangladesh Bank returned ${response.status}`);

    const rate = parseBangladeshBankRate(await response.text(), currency);
    if (!rate) throw new Error('The published rate table could not be read');

    return NextResponse.json(
      { ...rate, fetchedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    );
  } catch (error) {
    console.error('Bangladesh Bank rate lookup failed:', error.message);
    return NextResponse.json(
      { error: 'The latest rate is unavailable right now. Enter the exchange rate manually or try again.', sourceUrl: BANGLADESH_BANK_URL },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  } finally {
    clearTimeout(timeout);
  }
}
