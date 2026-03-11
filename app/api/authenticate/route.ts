import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyHash } from '@/lib/hashing';

export const GET = undefined;

export async function POST(req: NextRequest): Promise<NextResponse<any>> {
  const headersList = req.headers;
  // const nextHeadersList = headers();
  const [authType, authToken] = headersList.get('Authorization')?.split(' ') || [];

  if (authType !== 'Bearer' || authToken !== process.env.AUTH_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 });
  }

  // return NextResponse.json({ error: 'TODO: Auth not configured' }, { status: 500 });

  const user = await prisma.adminUser.findFirst({
    where: {
      email: {
        equals: username,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      email: true,
      givenName: true,
      familyName: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      password: true,
    },
  });

  if (!user || !user.password) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (!verifyHash(password, user.password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const { password: _password, ...safeUser } = user;

  return NextResponse.json({
    user: safeUser,
  });
}
