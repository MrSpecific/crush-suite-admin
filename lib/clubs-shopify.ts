import { prismaClubs } from '@/lib/prisma-clubs';

/**
 * The clubs app's offline Admin API token for a shop, or null if missing or expired.
 *
 * Read-only: the clubs app and worker own this credential and rotate it with a
 * single-use refresh token. Refreshing here would invalidate their chain, so an
 * expired token is simply treated as unavailable.
 */
export async function getClubsShopAccessToken(shop: string) {
  const session = await prismaClubs.appSession.findFirst({
    where: { shop, isOnline: false },
    select: { accessToken: true, expires: true },
  });

  if (!session?.accessToken) return null;
  if (session.expires && session.expires.getTime() <= Date.now()) return null;

  return session.accessToken;
}

// The Clubs app's handle in Shopify admin differs per environment
const clubsAppHandles: Partial<Record<string, string>> = {
  production: 'crushsuite-clubs',
  staging: 'crushsuite-wineclub-staging',
};

/**
 * The order's page inside the embedded Clubs app, or null when this
 * environment has no known app handle (set CLUBS_SHOPIFY_APP_HANDLE to override).
 */
export function getClubsAppOrderUrl(shop: string, releaseId: string, releaseOrderId: string) {
  const handle =
    process.env.CLUBS_SHOPIFY_APP_HANDLE || clubsAppHandles[process.env.NEXT_PUBLIC_ENV ?? ''];
  if (!handle) return null;

  const slug = shop.trim().replace(/^https?:\/\//, '').replace(/\.myshopify\.com\/?$/, '');
  return `https://admin.shopify.com/store/${slug}/apps/${handle}/releases/${releaseId}/orders/${releaseOrderId}`;
}
