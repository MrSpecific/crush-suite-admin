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
import { getEnvironment } from '@/lib/getEnvironment';
import Logo from '@/app/svg/crush-suite-admin-logo.svg';
import { ButtonLink } from './components/ButtonLink';

type AppMode = 'compliance' | 'clubs' | 'seats';

const getModeFromPathname = (pathname: string): AppMode => {
  if (pathname.startsWith('/clubs')) return 'clubs';
  if (pathname.startsWith('/seats')) return 'seats';
  return 'compliance';
};

const modeRoots: Record<AppMode, string> = {
  compliance: '/merchants',
  clubs: '/clubs/merchants',
  seats: '/seats',
};

const modeLabels: Record<AppMode, string> = {
  compliance: 'Compliance',
  clubs: 'Clubs',
  seats: 'Seats',
};

export const Sidebar = ({ user }: { user?: SessionUser }) => {
  const environment = getEnvironment();
  const pathname = usePathname();
  const router = useRouter();
  const mode = getModeFromPathname(pathname);
  const [pendingMode, setPendingMode] = useState<AppMode | null>(null);
  const [isModeTransitionPending, startModeTransition] = useTransition();
  const selectedMode = pendingMode ?? mode;
  const isModeLoading = pendingMode !== null || isModeTransitionPending;

  useEffect(() => {
    if (pendingMode === mode) {
      setPendingMode(null);
    }
  }, [mode, pendingMode]);

  const handleModeChange = (value: string) => {
    const nextMode = value as AppMode;

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
          <Select.Trigger style={{ width: '100%' }} mb="3">
            <Flex align="center" gap="2">
              {isModeLoading && <Spinner size="1" />}
              <span>{modeLabels[selectedMode]}</span>
            </Flex>
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="compliance">Compliance</Select.Item>
            <Select.Item value="clubs">Clubs</Select.Item>
            <Select.Item value="seats">Seats</Select.Item>
          </Select.Content>
        </Select.Root>
        <Grid columns="1" gap="2" my="2">
          {mode === 'compliance' && <ComplianceNav />}
          {mode === 'clubs' && <ClubsNav />}
          {mode === 'seats' && <SeatsNav />}
        </Grid>
      </ScrollArea>
      <UserCard {...user} />
    </Grid>
  );
};

const ComplianceNav = () => (
  <>
    <Flex align="center" justify="between" gap="2">
      <NavItem href="/merchants" style={{ flexGrow: '2' }}>
        Merchants
      </NavItem>
      <MerchantsDropdown />
    </Flex>
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
  </>
);

const ClubsNav = () => (
  <>
    <NavItem href="/clubs/merchants">Merchants</NavItem>
    <NavItem href="/clubs/all">All Clubs</NavItem>
  </>
);

const SeatsNav = () => (
  <>
    <NavItem href="/seats">Coming Soon</NavItem>
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
