import authOptions from '@/lib/authOptions';
import { getServerSession } from 'next-auth/next';

export const useServerSession = async () => {
  return await getServerSession(authOptions);
};

export const serverSession = async () => {
  return await getServerSession(authOptions);
};
