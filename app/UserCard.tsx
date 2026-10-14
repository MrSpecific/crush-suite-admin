'use client';
import { AdminUser } from '@prisma/client';
import { useSession, signOut } from 'next-auth/react';
import { Box, Grid, Avatar, Text, Button } from '@radix-ui/themes';

export const UserCard = ({ givenName, familyName, email }: SessionUser) => {
  // eslint-disable-next-line no-nested-ternary
  const fallback = givenName ? givenName[0] : email ? email[0] : 'U';

  return (
    <Box px="1" pb="2">
      <Grid gap="3" columns="auto 1fr" align="center">
        <Avatar fallback={fallback} size="2" radius="full" color="amber" variant="soft" />
        <Grid minWidth="0">
          <Text size="2" weight="medium" truncate>
            {[givenName, familyName].filter(Boolean).join(' ') || email}
          </Text>
          {email && (
            <Text size="1" color="gray" truncate>
              {email}
            </Text>
          )}
        </Grid>
      </Grid>
      <Button type="button" onClick={() => signOut()} variant="ghost" color="gray" size="1" mt="3">
        Sign out
      </Button>
    </Box>
  );
};
