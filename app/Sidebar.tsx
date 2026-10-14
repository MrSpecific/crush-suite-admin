'use client';
import { useState, useTransition } from 'react';
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
  Separator,
  Spinner,
  Text,
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

const appOrder: App[] = ['compliance', 'clubs', 'seats'];

export const Sidebar = ({ user }: { user?: SessionUser }) => {
  const pathname = usePathname();
  const mode = getModeFromPathname(pathname);
  const environment = getEnvironment(mode);
  const router = useRouter();
  const [pendingMode, setPendingMode] = useState<App | null>(null);
  const [isModeTransitionPending, startModeTransition] = useTransition();
  const effectivePendingMode = pendingMode === mode ? null : pendingMode;
  const selectedMode = effectivePendingMode ?? mode;
  const isModeLoading = effectivePendingMode !== null || isModeTransitionPending;

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
        backgroundColor: 'var(--color-background)',
        borderRight: '1px solid var(--gray-a5)',
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
        <Grid columns="1" gap="1" mb="3">
          {appOrder.map((app) => {
            const isSelected = selectedMode === app;
            const isPending = isModeLoading && pendingMode === app;

            return (
              <Button
                key={app}
                size="2"
                variant={isSelected ? 'solid' : 'soft'}
                color={isSelected ? environment.apps[app].color : 'gray'}
                disabled={isModeLoading}
                onClick={() => handleModeChange(app)}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <Flex align="center" gap="2" width="100%">
                  {isPending ? (
                    <Spinner size="1" />
                  ) : (
                    <Box
                      width="8px"
                      height="8px"
                      flexShrink="0"
                      style={{
                        borderRadius: '50%',
                        backgroundColor: isSelected
                          ? 'currentColor'
                          : `var(--${environment.apps[app].color}-9)`,
                      }}
                    />
                  )}
                  <Text>{environment.apps[app].label}</Text>
                </Flex>
              </Button>
            );
          })}
        </Grid>
      </Box>

      <ScrollArea>
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
    <NavItem href="/fulfillments">Fulfillments</NavItem>
    <NavItem href="/webhook-logs">Webhook Logs</NavItem>
    <NavItem href="/bulk-operations">Bulk Operations</NavItem>

    <Separator size="4" />

    {/* <Flex align="center" justify="between" gap="2">
      <NavItem href="/users" style={{ flexGrow: '2' }}>
        Admin
      </NavItem>
    </Flex> */}
    <AdminDropdown />

    <Flex align="center" justify="between" gap="2">
      <NavItem href="/users" style={{ flexGrow: '2' }}>
        Admin Users
      </NavItem>
      <UsersDropdown />
    </Flex>

    {/* <NavItem href="/tools">
      Tools
    </NavItem>
    <NavItem href="/gdpr">
      GDPR
    </NavItem> */}
  </>
);

const ClubsNav = () => (
  <>
    <NavItem href="/clubs/all">All Clubs</NavItem>
    <NavItem href="/clubs/releases">All Releases</NavItem>
    <NavItem href="/clubs/merchants">Merchants</NavItem>
    <NavItem href="/clubs/members">Members</NavItem>
    <NavItem href="/clubs/orders">Orders</NavItem>
    <Separator size="4" />
    <NavItem href="/clubs/billing-plans">Billing Plans</NavItem>
    <NavItem href="/clubs/migrations">Migrations</NavItem>
    <NavItem href="/clubs/gdpr">GDPR</NavItem>
    <NavItem href="/clubs/feature-flags">Feature Flags</NavItem>
    <Flex align="center" justify="between" gap="2">
      <NavItem href="/clubs/logs" style={{ flexGrow: '2' }}>
        Logs
      </NavItem>
      <LogsDropdown />
    </Flex>
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
        <Button variant="soft" color="gray" className="sidebar-nav-item">
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
        <DropdownMenu.Separator />
        <DropdownMenu.Item asChild onSelect={() => setOpen(false)}>
          <Link href="/merchants?connection=ERROR">Connection Errors</Link>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};

const LogsDropdown = () => {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger>
        <Button variant="soft" color="gray" className="sidebar-nav-item">
          <DropdownMenu.TriggerIcon />
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content>
        <DropdownMenu.Item asChild onSelect={() => setOpen(false)}>
          <Link href="/clubs/logs/usage-billing">Usage Billing</Link>
        </DropdownMenu.Item>
        <DropdownMenu.Item asChild onSelect={() => setOpen(false)}>
          <Link href="/clubs/logs/reprocess">Reprocess Log</Link>
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
        <Button variant="soft" color="gray" className="sidebar-nav-item">
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

const AdminDropdown = () => {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger>
        <Button variant="soft" color="gray" className="sidebar-nav-item">
          Admin <DropdownMenu.TriggerIcon />
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content>
        <DropdownMenu.Item asChild onSelect={() => setOpen(false)}>
          <Link href="/tools">Tools</Link>
        </DropdownMenu.Item>
        <DropdownMenu.Item asChild onSelect={() => setOpen(false)}>
          <Link href="/gdpr">GDPR</Link>
        </DropdownMenu.Item>
        <DropdownMenu.Item asChild onSelect={() => setOpen(false)}>
          <Link href="/issues">App Issues</Link>
        </DropdownMenu.Item>
        <DropdownMenu.Item asChild onSelect={() => setOpen(false)}>
          <Link href="/enums">Enums &amp; Lists</Link>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};

export const NavItem = ({
  href,
  children,
  icon,
  active: defaultActive,
  color,
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
  const [prevPathname, setPrevPathname] = useState(pathname);
  const active = defaultActive || pathname === href;

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setLoading(false);
  }

  return (
    <ButtonLink
      href={href}
      variant="soft"
      size="2"
      color={active || loading ? color : 'gray'}
      className="sidebar-nav-item"
      data-active={active || undefined}
      style={style}
      onClick={() => setLoading(true)}
    >
      {icon}
      {children}
    </ButtonLink>
  );
};
