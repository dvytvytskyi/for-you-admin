/**
 * Cloudflare Worker: Geo-routing for foryou-realestate.com
 * 
 * RU traffic  → Moscow server  (109.73.194.70)
 * BY traffic  → Moscow server  (109.73.194.70)   ← optional: also blocks
 * All others  → Hetzner origin (135.181.201.185)  ← default, no changes
 *
 * Phase 1: Moscow proxies everything to Hetzner via HAProxy (no content duplication)
 * Phase 2: Moscow runs full stack independently (switch MOSCOW_ORIGIN below)
 */

const HETZNER_IP = '135.181.201.185';
const MOSCOW_IP  = '109.73.194.70';

// Countries that should be served from Moscow
const MOSCOW_COUNTRIES = new Set(['RU', 'BY']);

export default {
  async fetch(request, env, ctx) {
    const country = request.cf?.country ?? 'XX';
    const useMoscow = MOSCOW_COUNTRIES.has(country);

    // Pass-through for non-RU traffic — default Cloudflare origin handles it
    if (!useMoscow) {
      return fetch(request);
    }

    // For RU/BY: re-resolve hostname to Moscow IP
    const url = new URL(request.url);

    // Clone request, strip cf-* internal headers to avoid loops
    const headers = new Headers(request.headers);
    headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') ?? '');
    headers.set('X-Geo-Routed', 'moscow');

    const moscowRequest = new Request(request, { headers });

    try {
      return await fetch(moscowRequest, {
        cf: {
          // Override DNS so this fetch goes to Moscow IP, not default origin
          resolveOverride: MOSCOW_IP,
        },
      });
    } catch (err) {
      // Fallback to Hetzner if Moscow is unreachable
      console.error('Moscow unreachable, falling back to Hetzner:', err.message);
      return fetch(request, {
        cf: { resolveOverride: HETZNER_IP },
      });
    }
  },
};
