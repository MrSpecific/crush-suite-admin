'use server';
import { Role, AdminUser } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { serverSession } from '@/lib/hooks/useSession';
import { authorize } from '@/lib/authorize';
import { hash } from '@/lib/hashing';

export const createUser = async (prevState: any, formData: FormData) => {
  const session = await serverSession();
  if (!authorize({ session, role: 'ADMIN' }).authorized)
    return { success: false, message: 'Not Authorized' };

  let data;

  try {
    const email = formData.get('email') as string;
    const givenName = formData.get('givenName') as string;
    const familyName = formData.get('familyName') as string;
    const role = formData.get('role') as Role;
    const password = formData.get('password') as string;

    data = await prisma.adminUser.create({
      data: { email, givenName, familyName, role: role || 'USER', password: hash(password) },
    });
  } catch (error) {
    return { status: 'error', message: (error as Error).message };
  }

  return { status: 'success', message: 'User added', data };
};
