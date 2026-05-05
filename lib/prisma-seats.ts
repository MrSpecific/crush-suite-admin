import { PrismaClient } from '../generated/prisma/seats';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const prismaSeatsClientSingleton = () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL_SEATS });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

declare const globalThis: {
  prismaSeatsGlobal: ReturnType<typeof prismaSeatsClientSingleton>;
} & typeof global;

export const prismaSeats = globalThis.prismaSeatsGlobal ?? prismaSeatsClientSingleton();

export default prismaSeats;

if (process.env.NODE_ENV !== 'production') globalThis.prismaSeatsGlobal = prismaSeats;
