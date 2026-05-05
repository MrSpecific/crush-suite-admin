import { PrismaClient } from '../generated/prisma/clubs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const prismaClubsClientSingleton = () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL_CLUBS });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

declare const globalThis: {
  prismaClubsGlobal: ReturnType<typeof prismaClubsClientSingleton>;
} & typeof global;

export const prismaClubs = globalThis.prismaClubsGlobal ?? prismaClubsClientSingleton();

export default prismaClubs;

if (process.env.NODE_ENV !== 'production') globalThis.prismaClubsGlobal = prismaClubs;
