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
