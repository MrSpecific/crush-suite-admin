'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AdminUser } from '@prisma/client';
import NextLink from 'next/link';
import {
  Badge,
  Box,
  Button,
  DropdownMenu,
  Flex,
  Grid,
  Heading,
  ScrollArea,
  Separator,
  VisuallyHidden,
} from '@radix-ui/themes';
import { UserCard } from './UserCard';
import { Link } from '@/app/components/Link';
import { getEnvironment } from '@/lib/getEnvironment';
import Logo from '@/app/svg/crush-suite-admin-logo.svg';
import { ButtonLink } from './components/ButtonLink';

export const Sidebar = ({ user }: { user?: SessionUser }) => {
  if (!user) return null;

  const environment = getEnvironment();

  return (
    <Grid
      p="2"
      columns="1"
      rows="1fr min-content"
      minHeight="100vh"
      maxHeight="100vh"
      position="sticky"
      top="0"
      style={{ backgroundColor: 'var(--gray-2)' }}
    >
      <ScrollArea>
        <Heading as="h2" size="4" mb="3">
          <Flex mb="4">
            <Badge
              color={environment.color}
              size="2"
              radius="full"
              variant="solid"
              style={{
                width: '100%',
                textAlign: 'center',
                justifyContent: 'center',
                textTransform: 'uppercase',
              }}
            >
              {environment.label}
            </Badge>
          </Flex>
          <Box pl="1" pt="2" pr="6" pb="4">
            <Logo />
          </Box>
          <VisuallyHidden>Crush Suite Admin</VisuallyHidden>
        </Heading>
        <Grid columns="1" gap="2" my="2">
          <NavItem href="/merchants">Merchants</NavItem>
          <NavItem href="/products">Products</NavItem>
          <NavItem href="/customers">Customers</NavItem>
          <NavItem href="/orders">Orders</NavItem>
          <NavItem href="/billing-plans">Billing Plans</NavItem>
          <NavItem href="/discounts">Discounts</NavItem>
          <NavItem href="/api-keys">API Keys</NavItem>
          <Separator size="4" />
          <Flex align="center" justify="between" gap="2">
            <NavItem href="/users" style={{ flexGrow: '2' }}>
              Admin Users
            </NavItem>
            <UsersDropdown />
          </Flex>
          <NavItem href="/tools">Tools</NavItem>
          <NavItem href="/gdpr">GDPR</NavItem>
        </Grid>
      </ScrollArea>
      <UserCard {...user} />
    </Grid>
  );
};

const UsersDropdown = () => {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button variant="soft" color="gray">
          <DropdownMenu.TriggerIcon />
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content>
        {/* <DropdownMenu.Item shortcut="⌘ N" asChild> */}
        <DropdownMenu.Item asChild>
          <Link href="/users/new">New</Link>
        </DropdownMenu.Item>
        {/* <DropdownMenu.Item shortcut="⌘ D">Duplicate</DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item shortcut="⌘ N">Archive</DropdownMenu.Item>

        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger>More</DropdownMenu.SubTrigger>
          <DropdownMenu.SubContent>
            <DropdownMenu.Item>Move to project…</DropdownMenu.Item>
            <DropdownMenu.Item>Move to folder…</DropdownMenu.Item>

            <DropdownMenu.Separator />
            <DropdownMenu.Item>Advanced options…</DropdownMenu.Item>
          </DropdownMenu.SubContent>
        </DropdownMenu.Sub>

        <DropdownMenu.Separator />
        <DropdownMenu.Item>Share</DropdownMenu.Item>
        <DropdownMenu.Item>Add to favorites</DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item shortcut="⌘ ⌫" color="red">
          Delete
        </DropdownMenu.Item> */}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};

export const NavItem = ({
  href,
  children,
  icon,
  active: defaultActive,
  style,
}: {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  active?: boolean;
  style?: React.CSSProperties;
}) => {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const active = defaultActive || pathname === href;

  useEffect(() => {
    setLoading(false);
  }, [pathname]);

  return (
    <ButtonLink
      href={href}
      variant="soft"
      size="2"
      color={active ? 'ruby' : loading ? 'teal' : 'gray'}
      style={style}
      onClick={() => setLoading(true)}
    >
      {icon}
      {children}
    </ButtonLink>
  );
};
