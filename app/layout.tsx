import type { Metadata } from 'next';
// import { getServerSession } from 'next-auth/next';
import { Inter } from 'next/font/google';
import { Grid, Theme, ThemePanel } from '@radix-ui/themes';
import { Sidebar } from './Sidebar';
import { AuthContext } from '@/app/components/auth/AuthContext';
import Unauthenticated from '@/app/components/auth/Unauthenticated';
import { serverSession } from '@/lib/authorize';
import '@radix-ui/themes/styles.css';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Crush Suite Admin',
  description: '',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await serverSession();

  if (!session?.user || session.user.role === 'DISABLED') {
    return <Unauthenticated />;
  }

  return (
    <AuthContext>
      <html lang="en">
        <body className={inter.className}>
          <Theme accentColor="ruby" grayColor="mauve" radius="large">
            <Grid columns="240px 1fr">
              <Sidebar user={session.user} />
              {children}
            </Grid>
            {/* <ThemePanel /> */}
          </Theme>
        </body>
      </html>
    </AuthContext>
  );
}
