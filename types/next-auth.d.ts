import NextAuth, { Profile, User } from 'next-auth';

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

export interface GoogleOrAzureProfile extends Profile {
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  tid?: string;
}

export interface CrushSuiteAdminUser extends Profile {
  given_name?: string;
  family_name?: string;
  role?: string;
}

export interface ServerSession {
  user: User;
}
