import { Box, Flex, Grid, Theme, ThemePanel } from '@radix-ui/themes';
import { ButtonLink } from '../components/ButtonLink';

export default async function ReportLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Grid rows="auto 1fr" p="2">
      <Flex>
        <ButtonLink href="/reports/orders">Orders</ButtonLink>
      </Flex>
      {children}
    </Grid>
  );
}
