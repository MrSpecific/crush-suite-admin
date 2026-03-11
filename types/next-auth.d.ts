import NextAuth, { Profile, User } from 'next-auth';
import { JWT as NextAuthJWT } from 'next-auth/jwt';

declare global {
  interface SessionUser {
    id?: string;
    email?: string;
    givenName?: string | undefined;
    familyName?: string | undefined;
    role?: string | null | undefined;
  }
}

declare module 'next-auth' {
  interface Session {
    user: SessionUser;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends NextAuthJWT {
    id?: string;
    givenName?: string;
    familyName?: string;
    role?: string | null;
    userSyncedAt?: number;
  }
}

export interface GoogleOrAzureProfile extends Profile {
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  tid?: string;
}

export interface CrushSuiteAdminUser extends Profile {
  given_name?: string;
  family_name?: string;
  email_verified?: boolean;
  role?: string;
}

export interface ServerSession {
  user: User;
}
