import type { Metadata } from 'next';
// import { getServerSession } from 'next-auth/next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Grid, Theme, ThemePanel } from '@radix-ui/themes';
import { Sidebar } from './Sidebar';
import { AuthContext } from '@/app/components/auth/AuthContext';
import Unauthenticated from '@/app/components/auth/Unauthenticated';
import { serverSession } from '@/lib/authorize';
import '@radix-ui/themes/styles.css';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

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
    <AuthContext session={session}>
      <html lang="en" className={jakarta.variable}>
        <body>
          <Theme accentColor="ruby" grayColor="sand" radius="large" panelBackground="solid">
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
