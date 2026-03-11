import { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { CrushSuiteAdminUser } from '@/types/next-auth';
import { prisma } from '@/lib/prisma';

const findAdminUserByEmail = async (email: string) =>
  prisma.adminUser.findFirst({
    where: {
      email: {
        equals: email,
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
    },
  });

export const authOptions: AuthOptions = {
  // Configure one or more authentication providers
  providers: [
    // GithubProvider({
    //   clientId: process.env.GITHUB_ID,
    //   clientSecret: process.env.GITHUB_SECRET,
    // }),
    // ...add more providers here
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      // The name to display on the sign in form (e.g. 'Sign in with...')
      name: 'Credentials',
      // The credentials is used to generate a suitable form on the sign in page.
      // You can specify whatever fields you are expecting to be submitted.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: {
        username: { label: 'Username', type: 'text', placeholder: 'jsmith' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        // You need to provide your own logic here that takes the credentials
        // submitted and returns either a object representing a user or value
        // that is false/null if the credentials are invalid.
        // e.g. return { id: 1, name: 'J Smith', email: 'jsmith@example.com' }
        // You can also use the `req` object to obtain additional parameters
        // (i.e., the request IP address)
        const res = await fetch(
          `${process.env.NEXTAUTH_URL || req.headers?.origin}/api/authenticate`,
          {
            method: 'POST',
            body: JSON.stringify(credentials),
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.AUTH_TOKEN}`,
              'X-Auth-Token': process.env.AUTH_TOKEN || '',
            },
          }
        );
        const result = await res.json();

        // If no error and we have user data, return it
        if (res.ok && result.user) {
          return result.user;
        }

        // Return null if user data could not be retrieved
        return null;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, profile, account }) {
      const userEmail = user.email;

      if (!userEmail) {
        console.error('No email found');
        return false;
      }

      const adminUser = await findAdminUserByEmail(userEmail);

      if (!adminUser || adminUser.role === 'DISABLED') {
        return false;
      }

      const { given_name = undefined, family_name = undefined, email_verified = undefined } = profile
        ? (profile as CrushSuiteAdminUser)
        : ({} as CrushSuiteAdminUser);

      if (account?.provider === 'google' && email_verified === false) {
        return false;
      }

      await prisma.adminUser.update({
        where: {
          id: adminUser.id,
        },
        data: {
          lastLogin: new Date(),
          ...(account?.provider === 'google'
            ? {
                givenName: given_name || adminUser.givenName,
                familyName: family_name || adminUser.familyName,
              }
            : {}),
        },
      });

      return true;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;

      return baseUrl;
    },
    async session({ session }) {
      if (!session || !session.user || !session.user.email) return session;

      const userData = await findAdminUserByEmail(session.user.email);

      if (!userData) {
        session.user = {
          ...session.user,
          role: 'DISABLED',
        };
        return session;
      }

      if (userData.role === 'DISABLED') {
        session.user = {
          ...session.user,
          ...userData,
        };
        return session;
      }

      session.user = {
        ...session.user,
        ...userData,
      };

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default authOptions;
