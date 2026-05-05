'use client';
import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Badge,
  Box,
  Button,
  DropdownMenu,
  Flex,
  Grid,
  Heading,
  ScrollArea,
  Select,
  Separator,
  Spinner,
  VisuallyHidden,
} from '@radix-ui/themes';
import { UserCard } from './UserCard';
import { Link } from '@/app/components/Link';
import { getEnvironment, type App } from '@/lib/getEnvironment';
import Logo from '@/app/svg/crush-suite-admin-logo.svg';
import { ButtonLink } from './components/ButtonLink';
import type { RadixColor } from '@/types/radix-ui';

const getModeFromPathname = (pathname: string): App => {
  if (pathname.startsWith('/clubs')) return 'clubs';
  if (pathname.startsWith('/seats')) return 'seats';
  return 'compliance';
};

const modeRoots: Record<App, string> = {
  compliance: '/merchants',
  clubs: '/clubs/merchants',
  seats: '/seats',
};

export const Sidebar = ({ user }: { user?: SessionUser }) => {
  const pathname = usePathname();
  const mode = getModeFromPathname(pathname);
  const environment = getEnvironment(mode);
  const router = useRouter();
  const [pendingMode, setPendingMode] = useState<App | null>(null);
  const [isModeTransitionPending, startModeTransition] = useTransition();
  const selectedMode = pendingMode ?? mode;
  const currentAppColor = environment.appColorScheme.color;
  const selectedAppColor = environment.apps[selectedMode].color;
  const isModeLoading = pendingMode !== null || isModeTransitionPending;

  useEffect(() => {
    if (pendingMode === mode) {
      setPendingMode(null);
    }
  }, [mode, pendingMode]);

  const handleModeChange = (value: string) => {
    const nextMode = value as App;

    if (nextMode === mode) return;

    setPendingMode(nextMode);
    startModeTransition(() => {
      router.push(modeRoots[nextMode]);
    });
  };

  if (!user) return null;

  return (
    <Grid
      p="2"
      columns="1"
      rows="min-content 1fr min-content"
      minHeight="100vh"
      maxHeight="100vh"
      position="sticky"
      top="0"
      style={{
        backgroundColor: `var(--${currentAppColor}-2)`,
        borderRight: `1px solid var(--${currentAppColor}-5)`,
        transition: 'background-color 150ms ease, border-color 150ms ease',
      }}
    >
      <Box>
        <Heading as="h2" size="4" mb="3" style={{ position: 'relative' }}>
          <Badge
            color={environment.color}
            size="2"
            radius="full"
            variant="solid"
            style={{
              // width: '100%',
              position: 'absolute',
              top: '0.5em',
              right: '0.5em',
              textAlign: 'center',
              justifyContent: 'center',
              textTransform: 'uppercase',
              pointerEvents: 'none',
            }}
          >
            {environment.label}
          </Badge>

          <Box pl="1" pt="2" pr="6" pb="4">
            <Link href="/" style={{ display: 'block' }}>
              <Logo />
            </Link>
          </Box>
          <VisuallyHidden>Crush Suite Admin</VisuallyHidden>
        </Heading>
        <Select.Root
          size="1"
          value={selectedMode}
          onValueChange={handleModeChange}
          disabled={isModeLoading}
        >
          <Select.Trigger color={selectedAppColor} style={{ width: '100%' }} mb="3">
            <Flex align="center" gap="2">
              {isModeLoading && <Spinner size="1" />}
              <span>{environment.apps[selectedMode].label}</span>
            </Flex>
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="compliance">Compliance</Select.Item>
            <Select.Item value="clubs">Clubs</Select.Item>
            <Select.Item value="seats">Seats</Select.Item>
          </Select.Content>
        </Select.Root>
      </Box>

      <ScrollArea>
        <Grid columns="1" gap="2" my="2">
          {mode === 'compliance' && <ComplianceNav color={currentAppColor} />}
          {mode === 'clubs' && <ClubsNav color={currentAppColor} />}
          {mode === 'seats' && <SeatsNav color={currentAppColor} />}
        </Grid>
      </ScrollArea>

      <UserCard {...user} />
    </Grid>
  );
};

const ComplianceNav = ({ color }: { color: RadixColor }) => (
  <>
    <Flex align="center" justify="between" gap="2">
      <NavItem href="/merchants" color={color} style={{ flexGrow: '2' }}>
        Merchants
      </NavItem>
      <MerchantsDropdown />
    </Flex>
    <NavItem href="/products" color={color}>
      Products
    </NavItem>
    <NavItem href="/customers" color={color}>
      Customers
    </NavItem>
    <NavItem href="/orders" color={color}>
      Orders
    </NavItem>
    <NavItem href="/billing-plans" color={color}>
      Billing Plans
    </NavItem>
    <NavItem href="/discounts" color={color}>
      Discounts
    </NavItem>
    <NavItem href="/api-keys" color={color}>
      API Keys
    </NavItem>
    <NavItem href="/issues" color={color}>
      App Issues
    </NavItem>
    <NavItem href="/fulfillments" color={color}>
      Fulfillments
    </NavItem>
    <NavItem href="/webhook-logs" color={color}>
      Webhook Logs
    </NavItem>
    <NavItem href="/bulk-operations" color={color}>
      Bulk Operations
    </NavItem>
    <Separator size="4" />
    <Flex align="center" justify="between" gap="2">
      <NavItem href="/users" color={color} style={{ flexGrow: '2' }}>
        Admin Users
      </NavItem>
      <UsersDropdown />
    </Flex>
    <NavItem href="/tools" color={color}>
      Tools
    </NavItem>
    <NavItem href="/gdpr" color={color}>
      GDPR
    </NavItem>
  </>
);

const ClubsNav = ({ color }: { color: RadixColor }) => (
  <>
    <NavItem href="/clubs/all" color={color}>
      All Clubs
    </NavItem>
    <NavItem href="/clubs/merchants" color={color}>
      Merchants
    </NavItem>
    <NavItem href="/clubs/members" color={color}>
      Members
    </NavItem>
    <Separator size="4" />
    <NavItem href="/clubs/billing-plans" color={color}>
      Billing Plans
    </NavItem>
    <NavItem href="/clubs/migrations" color={color}>
      Migrations
    </NavItem>
    <NavItem href="/clubs/gdpr" color={color}>
      GDPR
    </NavItem>
    <NavItem href="/clubs/feature-flags" color={color}>
      Feature Flags
    </NavItem>
  </>
);

const SeatsNav = ({ color }: { color: RadixColor }) => (
  <>
    <NavItem href="/seats" color={color}>
      Coming Soon
    </NavItem>
  </>
);

const MerchantsDropdown = () => {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger>
        <Button variant="soft" color="gray">
          <DropdownMenu.TriggerIcon />
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content>
        <DropdownMenu.Item asChild onSelect={() => setOpen(false)}>
          <Link href="/merchants">All</Link>
        </DropdownMenu.Item>
        <DropdownMenu.Item asChild onSelect={() => setOpen(false)}>
          <Link href="/merchants?status=READY">Active</Link>
        </DropdownMenu.Item>
        <DropdownMenu.Item asChild onSelect={() => setOpen(false)}>
          <Link href="/merchants?status=INSTALLED">Installed</Link>
        </DropdownMenu.Item>
        <DropdownMenu.Item asChild onSelect={() => setOpen(false)}>
          <Link href="/merchants?status=REMOVED">Removed</Link>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};

const UsersDropdown = () => {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger>
        <Button variant="soft" color="gray">
          <DropdownMenu.TriggerIcon />
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content>
        {/* <DropdownMenu.Item shortcut="⌘ N" asChild> */}
        <DropdownMenu.Item asChild onSelect={() => setOpen(false)}>
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
  color = 'ruby',
  style,
}: {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  active?: boolean;
  color?: RadixColor;
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
      color={active || loading ? color : 'gray'}
      style={style}
      onClick={() => setLoading(true)}
    >
      {icon}
      {children}
    </ButtonLink>
  );
};
