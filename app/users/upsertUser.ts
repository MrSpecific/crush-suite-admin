'use server';
import type { Role, AdminUser } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { serverSession } from '@/lib/hooks/useSession';
import { authorize } from '@/lib/authorize';
import { hash } from '@/lib/hashing';

export type UpsertUserProps = SomeRequired<
  AdminUser,
  'email' | 'givenName' | 'familyName' | 'password'
>;

// export async function addUser({}: FormInputProps): Promise<void> {
export async function upsertUser({
  email,
  givenName,
  familyName,
  role,
  password,
}: UpsertUserProps) {
  const session = await serverSession();
  if (!authorize({ session, role: 'ADMIN' }).authorized)
    return { success: false, message: 'Not Authorized' };

  const sharedProps = {
    email,
    givenName,
    familyName,
    role: role || 'USER',
    password: hash(password),
  };

  const user = await prisma.adminUser.upsert({
    where: {
      email,
    },
    update: {
      ...sharedProps,
    },
    create: {
      ...sharedProps,
    },
    select: {
      id: true,
    },
  });

  return { status: 'success', message: 'User added', user };
}

export type UpsertUserResult = PromiseReturnType<ReturnType<typeof upsertUser>>;
