'use client';
import { AdminUser } from '@prisma/client';
import { useSession, signOut } from 'next-auth/react';
import { Box, Grid, Avatar, Text, Button } from '@radix-ui/themes';

export const UserCard = ({ givenName, familyName, email }: SessionUser) => {
  // eslint-disable-next-line no-nested-ternary
  const fallback = givenName ? givenName[0] : email ? email[0] : 'U';

  return (
    <Box>
      <Grid display="inline-grid" gap="2" columns="auto auto" width="auto">
        <Box display="inline-block">
          <Avatar fallback={fallback} />
        </Box>
        <Grid>
          <Text size="2" weight="bold">
            {givenName}
          </Text>

          <Text size="1">
            <Button type="button" onClick={() => signOut()} variant="ghost">
              Sign Out
            </Button>
          </Text>
        </Grid>
      </Grid>
    </Box>
  );
};
