import { searchStores } from '@market/core';
import { connectors } from '@market/connectors';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const term = params.get('q')?.trim() ?? '';
  const city = params.get('city')?.trim() ?? 'الرياض';
  const requestedStores = [...new Set(params.getAll('store'))];
  if (requestedStores.some(id => !connectors.some(connector => connector.id === id))) {
    return Response.json({ error: 'Unknown store' }, { status: 400 });
  }
  if (!term || term.length > 200 || !city || city.length > 100) {
    return Response.json({ error: 'Provide q (1–200 characters) and city (1–100 characters)' }, { status: 400 });
  }
  const activeConnectors = requestedStores.length ? connectors.filter(connector => requestedStores.includes(connector.id)) : connectors;
  const result = await searchStores({ term, city }, activeConnectors);
  return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
