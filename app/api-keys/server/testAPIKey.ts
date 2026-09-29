'use server';
import { prisma } from '@/lib/prisma';
import { serverSession } from '@/lib/hooks/useSession';
import { authorize } from '@/lib/authorize';
import { getEnvironment } from '@/lib/getEnvironment';

const SERVICE_API_URLS = {
  production: 'https://crush-suite-production.up.railway.app/service-api',
  staging: 'https://crush-suite-staging.up.railway.app/service-api',
};

const getServiceApiUrl = () =>
  process.env.SERVICE_API_URL ||
  (getEnvironment().name === 'production' ? SERVICE_API_URLS.production : SERVICE_API_URLS.staging);

export type TestAPIKeyResult = {
  status: 'success' | 'warning' | 'error';
  message: string;
  url?: string;
  statusCode?: number;
};

// Sends an empty body to /compliance/alcohol-fee. The service API authenticates and rate
// limits before validating the body, so a 400 means the key was accepted, and nothing is
// computed or recorded.
export const testAPIKey = async (id: string): Promise<TestAPIKeyResult> => {
  const session = await serverSession();
  if (!session) return { status: 'error', message: 'Not Authenticated' };

  if (!authorize({ session, role: 'ADMIN' }).authorized)
    return { status: 'error', message: 'Not Authorized' };

  const apiKey = await prisma.apiAccess.findUnique({ where: { id } });
  if (!apiKey) return { status: 'error', message: 'API Key not found' };

  const url = `${getServiceApiUrl()}/compliance/alcohol-fee`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey.privateKey },
      body: '{}',
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error(error);
    return {
      status: 'error',
      message: `Couldn't reach the service API: ${error instanceof Error ? error.message : 'Unknown error'}`,
      url,
    };
  }

  const statusCode = response.status;

  if (statusCode === 401)
    return { status: 'error', message: 'Key rejected (401 Not Authorized)', url, statusCode };

  if (statusCode === 429)
    return {
      status: 'warning',
      message: `Key accepted, but it's over its rate limit. Retry after ${response.headers.get('Retry-After') ?? '?'}s.`,
      url,
      statusCode,
    };

  if (statusCode === 400 || response.ok)
    return { status: 'success', message: 'Key accepted by the service API', url, statusCode };

  return {
    status: 'error',
    message: `Couldn't verify the key: unexpected ${statusCode} response (${(await response.text()).slice(0, 200)})`,
    url,
    statusCode,
  };
};
