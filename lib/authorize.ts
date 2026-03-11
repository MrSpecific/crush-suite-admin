import type { Session } from 'next-auth';
import type { Role } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
export { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
export { authOptions } from '@/lib/authOptions';
// export { NotAuthorized } from '@/components/messaging/NotAuthorized';

export const serverSession = async () => {
  const session = await getServerSession(authOptions);
  return session;
};

export const useServerSession = async () => {
  const session = await getServerSession(authOptions);
  return session;
};

export const RoleHeirarchy: { [key in Role]: Role[] } = {
  DISABLED: [],
  VIEWER: ['SUPERADMIN', 'ADMIN', 'USER', 'VIEWER'],
  USER: ['SUPERADMIN', 'ADMIN', 'USER'],
  ADMIN: ['SUPERADMIN', 'ADMIN'],
  SUPERADMIN: ['SUPERADMIN'],
};

Object.freeze(RoleHeirarchy);

export type AuthorizeProps = {
  session?: Session | null;
  role?: Role;
};

export const authorize = ({ session, role }: AuthorizeProps) => {
  if (!session || !session.user) return { authorized: false, actions: [], message: 'No session' };

  if (session.user.role && role && RoleHeirarchy[role].includes(session.user.role as Role)) {
    // console.log('Authorized with role: ', session.user.role);
    return { authorized: true, actions: [], message: 'Authorized' };
  }

  if (session.user?.role === 'SUPERADMIN')
    return { authorized: true, actions: [], message: 'Authorized' };

  return { authorized: false, actions: [], message: 'Not Authorized' };
};
