import { NotAuthorized } from '@/app/components/auth/NotAuthorized';
import { authorize, serverSession } from '@/lib/authorize';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await serverSession();
  const authed = authorize({ session, role: 'SUPERADMIN' });
  if (!authed.authorized) return <NotAuthorized />;

  return children;
}
