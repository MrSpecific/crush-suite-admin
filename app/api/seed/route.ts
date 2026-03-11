import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash } from '@/lib/hashing';
import { upsertUser } from '@/app/users/upsertUser';

// Set a SEED_USER env var with a JSON object like this:
// {
//   email: 'EMAIL',
//   givenName: 'FIRSTNAME',
//   familyName: 'LASTNAME',
//   role: 'USER',
//   password: 'password',
// }

export const dynamic = 'force-dynamic';

export const GET = async () => {
  if (!process.env.SEED_USER) {
    return new Response('No seed user provided');
  }

  const user = JSON.parse(process.env.SEED_USER);

  // const result = await upsertUser(user);

  let result;

  try {
    result = await prisma.adminUser.create({
      data: {
        email: user.email,
        givenName: user.givenName,
        familyName: user.familyName,
        role: user.role || 'USER',
        password: hash(user.password),
      },
      select: {
        id: true,
      },
    });
  } catch (error: any) {
    return new Response(error?.message, { status: 400 });
  }

  // return { status: 'success', message: 'User added', user: result };

  return new Response(JSON.stringify(result));
};
