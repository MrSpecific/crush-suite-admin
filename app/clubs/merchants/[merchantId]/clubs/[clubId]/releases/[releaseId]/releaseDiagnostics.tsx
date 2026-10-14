import {
  Badge,
  Box,
  Button,
  Callout,
  Code,
  Dialog,
  Flex,
  IconButton,
  Text,
} from '@radix-ui/themes';
import { ExclamationTriangleIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import { getClubsShopAccessToken } from '@/lib/clubs-shopify';
import {
  getShopifyAdminDeliveryProfileUrl,
  getShopifyAdminLocationUrl,
  getShopifyDeliveryProfile,
  getShopifyInventoryLevelsAtLocation,
  getShopifyLocationsByIds,
  getShopifyVariantsByPlatformVariantIds,
  type ShopifyDeliveryProfileDetail,
  type ShopifyInventoryItemLevel,
  type ShopifyLocationDetail,
  type ShopifyVariantSummary,
} from '@/lib/shopify';
import { DataTable } from '@/app/components/DataTable';
import { QuickDataList } from '@/app/components/QuickDataList';
import { ExternalButtonLink } from '@/app/components/ButtonLink';
import { dateTimeFormatter } from '@/lib/formatters';
import type { RadixColor } from '@/types/radix-ui';

// Diagnostics for the release detail page: live Shopify inventory and shipping alongside what the
// Clubs app recorded, plus the release pipeline's failure history and open order issues.

// Shopify

export type ReleaseShopifyData = {
  variants: ShopifyVariantSummary[];
  locationsById: Map<string, ShopifyLocationDetail>;
  // Keyed by `${platformLocationId}:${platformInventoryItemId}`
  inventoryLevels: Map<string, ShopifyInventoryItemLevel>;
  profiles: ShopifyDeliveryProfileDetail[];
  // False when stock levels couldn't be read, so a missing level means "unknown" rather than "absent"
  inventoryLoaded: boolean;
  // Shown on the page so missing live data never reads as "not stocked" or "no profile"
  errors: string[];
};

export const inventoryLevelKey = (platformLocationId: string, platformInventoryItemId: string) =>
  `${platformLocationId}:${platformInventoryItemId}`;

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Everything the page reads from Shopify, in two round trips: variants, locations and stock in
 * parallel, then the delivery profiles the variants belong to. Each lookup fails on its own, so a
 * Shopify error costs that section only.
 */
export async function loadReleaseShopifyData({
  shop,
  platformVariantIds,
  platformLocationIds,
  inventoryItems,
}: {
  shop: string;
  platformVariantIds: string[];
  platformLocationIds: string[];
  inventoryItems: { platformLocationId: string; platformInventoryItemId: string }[];
}): Promise<ReleaseShopifyData> {
  const errors: string[] = [];
  const empty: ReleaseShopifyData = {
    variants: [],
    locationsById: new Map(),
    inventoryLevels: new Map(),
    profiles: [],
    inventoryLoaded: false,
    errors,
  };

  const accessToken = await getClubsShopAccessToken(shop);
  if (!accessToken) {
    errors.push('No valid Clubs app token for this shop, so live Shopify data is unavailable.');
    return empty;
  }

  const attempt = async <T,>(label: string, run: () => Promise<T>, fallback: T) => {
    try {
      return await run();
    } catch (error) {
      console.error(`Failed to load Shopify ${label} for ${shop}`, error);
      errors.push(`Couldn't load ${label} from Shopify: ${errorMessage(error)}`);
      return fallback;
    }
  };

  const itemsByLocation = new Map<string, Set<string>>();
  for (const { platformLocationId, platformInventoryItemId } of inventoryItems) {
    const items = itemsByLocation.get(platformLocationId) ?? new Set<string>();
    items.add(platformInventoryItemId);
    itemsByLocation.set(platformLocationId, items);
  }

  const [variants, locations, levelsByLocation] = await Promise.all([
    attempt(
      'products',
      () => getShopifyVariantsByPlatformVariantIds({ shop, accessToken, platformVariantIds }),
      []
    ),
    attempt(
      'locations',
      () => getShopifyLocationsByIds({ shop, accessToken, platformLocationIds }),
      []
    ),
    attempt(
      'inventory levels',
      () =>
        Promise.all(
          [...itemsByLocation].map(async ([platformLocationId, items]) => ({
            platformLocationId,
            levels: await getShopifyInventoryLevelsAtLocation({
              shop,
              accessToken,
              platformLocationId,
              platformInventoryItemIds: [...items],
            }),
          }))
        ),
      null
    ),
  ]);

  const profileIds = [
    ...new Set(
      variants.flatMap((variant) => (variant.deliveryProfile ? [variant.deliveryProfile.id] : []))
    ),
  ];
  const profiles = await attempt(
    'shipping profiles',
    async () =>
      (
        await Promise.all(
          profileIds.map((deliveryProfileId) =>
            getShopifyDeliveryProfile({ shop, accessToken, deliveryProfileId })
          )
        )
      ).filter((profile): profile is ShopifyDeliveryProfileDetail => !!profile),
    []
  );

  return {
    variants,
    locationsById: new Map(locations.map((location) => [location.legacyResourceId, location])),
    inventoryLevels: new Map(
      (levelsByLocation ?? []).flatMap(({ platformLocationId, levels }) =>
        levels.map((level) => [
          inventoryLevelKey(platformLocationId, level.legacyResourceId),
          level,
        ])
      )
    ),
    profiles,
    inventoryLoaded: levelsByLocation !== null,
    errors,
  };
}

export const ShopifyErrors = ({ errors }: { errors: string[] }) =>
  errors.length > 0 ? (
    <Callout.Root color="amber" size="1" mb="4">
      <Callout.Icon>
        <ExclamationTriangleIcon />
      </Callout.Icon>
      <Callout.Text>
        Live Shopify data is incomplete, so some inventory and shipping figures are missing.
        {errors.map((error) => (
          <Text as="span" key={error} style={{ display: 'block' }}>
            {error}
          </Text>
        ))}
      </Callout.Text>
    </Callout.Root>
  ) : null;

// Pipeline failures and locks

// Release locks are `{uuid}::{timestamp}` and age out after two hours (the Clubs worker's
// processLock.ts). Older plain-UUID locks carry no timestamp and never expire on their own.
const releaseLockMaxAgeMs = 2 * 60 * 60 * 1000;

const parseLockedAt = (value: string) => {
  const separator = value.lastIndexOf('::');
  return separator === -1 ? NaN : parseInt(value.slice(separator + 2), 10);
};

// Read at request time: the page is a server component rendered once per request
const isLockStale = (lockedAt: number) => Date.now() - lockedAt > releaseLockMaxAgeMs;

export const LockStatus = ({ value }: { value: string }) => {
  const lockedAt = parseLockedAt(value);

  if (Number.isNaN(lockedAt)) {
    return (
      <Badge color="red" variant="soft">
        Held with no expiry: needs clearing
      </Badge>
    );
  }

  const since = dateTimeFormatter(new Date(lockedAt));
  return isLockStale(lockedAt) ? (
    <Badge color="amber" variant="soft">
      Stale since {since}
    </Badge>
  ) : (
    <Badge color="blue" variant="soft">
      Running since {since}
    </Badge>
  );
};

export const ErrorCallout = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box mt="3" p="2" style={{ backgroundColor: 'var(--red-2)', borderRadius: 'var(--radius-2)' }}>
    <Text size="1" color="red" weight="bold">
      {title}
    </Text>
    <Text
      as="p"
      size="1"
      color="red"
      mt="1"
      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
    >
      {children}
    </Text>
  </Box>
);

export const attemptsSummary = (count: number, lastAttemptAt: Date | null) =>
  `${count} failed attempt${count === 1 ? '' : 's'}${
    lastAttemptAt ? `, last ${dateTimeFormatter(lastAttemptAt)}` : ''
  }`;

// Open order issues

export type OpenIssueRow = {
  code: string;
  label: string;
  blocksProcessing: boolean;
  orders: number;
  oldestOpenedAt: Date | null;
};

// MISSING_SHIPPING_RATE → Missing shipping rate
export const humanizeCode = (code: string) =>
  code.charAt(0) + code.slice(1).toLowerCase().replace(/_/g, ' ');

export const openIssueHeaders = [
  { id: 'label', title: 'Issue' },
  { id: 'code', title: 'Code', as: 'code' as const },
  {
    id: 'blocksProcessing',
    title: 'Effect',
    formatter: (blocks: boolean) => (
      <Badge color={blocks ? 'red' : 'gray'} variant="soft">
        {blocks ? 'Blocks processing' : 'Advisory'}
      </Badge>
    ),
  },
  { id: 'orders', title: 'Orders' },
  {
    id: 'oldestOpenedAt',
    title: 'Oldest',
    formatter: (v: Date | null) => (v ? dateTimeFormatter(v) : '—'),
  },
];

// Locations

const yesNo = (value: boolean) => (value ? 'Yes' : 'No');

const formatAddress = ({ address }: ShopifyLocationDetail) =>
  [
    address.address1,
    address.address2,
    [address.city, address.provinceCode, address.zip].filter(Boolean).join(' '),
    address.countryCode,
  ]
    .filter(Boolean)
    .join(', ');

/** A location's name, with a button that opens everything Shopify holds about it. */
export const LocationCell = ({
  shop,
  platformLocationId,
  location,
}: {
  shop: string;
  platformLocationId: string;
  location?: ShopifyLocationDetail;
}) => (
  <Flex align="center" gap="2">
    {location ? (
      <Text>{location.name}</Text>
    ) : (
      <Code variant="ghost" color="gray">
        {platformLocationId}
      </Code>
    )}
    {location && !location.isActive && (
      <Badge color="red" variant="soft">
        Inactive
      </Badge>
    )}

    <Dialog.Root>
      <Dialog.Trigger>
        <IconButton variant="ghost" color="gray" size="1" aria-label="Location details">
          <InfoCircledIcon />
        </IconButton>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="520px">
        <Dialog.Title>{location?.name ?? 'Location'}</Dialog.Title>
        {!location && (
          <Dialog.Description size="2" color="gray" mb="3">
            Shopify didn’t return this location. It may have been deleted, or live data is
            unavailable.
          </Dialog.Description>
        )}

        <QuickDataList
          data={[
            { label: 'Location ID', value: platformLocationId, as: 'code', clipboard: true },
            ...(location
              ? [
                  { label: 'GID', value: location.id, as: 'code' as const, clipboard: true },
                  {
                    label: 'Status',
                    children: (
                      <Badge color={location.isActive ? 'green' : 'red'} variant="soft">
                        {location.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    ),
                  },
                  {
                    label: 'Default Inventory Location',
                    value: yesNo(location.shipsInventory),
                    tooltip: "The shop's default location for stock (Shopify's shipsInventory).",
                  },
                  { label: 'Fulfills Online Orders', value: yesNo(location.fulfillsOnlineOrders) },
                  {
                    label: 'Fulfillment Service',
                    value: yesNo(location.isFulfillmentService),
                    tooltip: 'Managed by a fulfillment app rather than the merchant.',
                  },
                  { label: 'Address', value: formatAddress(location) || undefined },
                  { label: 'Phone', value: location.address.phone },
                  {
                    label: 'Local Pickup',
                    value: location.localPickupSettingsV2
                      ? [
                          location.localPickupSettingsV2.pickupTime,
                          location.localPickupSettingsV2.instructions,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'Enabled'
                      : 'Not offered',
                  },
                ]
              : []),
          ]}
        />

        <Flex gap="3" mt="4" justify="end">
          <ExternalButtonLink
            href={getShopifyAdminLocationUrl(shop, platformLocationId)}
            variant="soft"
          >
            Open in Shopify
          </ExternalButtonLink>
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  </Flex>
);

// Inventory

type StockStatus = { label: string; color: RadixColor };

/**
 * The one-line verdict for a wine, worst first. Shopify's `reserved` counts every hold at the
 * location, not just this release's, so it can only prove a hold is missing (less than we hold),
 * never that it is ours.
 */
export const getStockStatus = ({
  held,
  deficit,
  level,
  liveDataLoaded,
}: {
  held: number;
  deficit: number;
  level?: ShopifyInventoryItemLevel;
  liveDataLoaded: boolean;
}): StockStatus | null => {
  if (!level) return liveDataLoaded ? { label: 'Not found in Shopify', color: 'red' } : null;
  if (!level.tracked) return { label: 'Not tracked', color: 'gray' };
  if (!level.quantities) return { label: 'Not stocked at location', color: 'red' };
  if (level.quantities.reserved < held) {
    return { label: `Shopify holds ${held - level.quantities.reserved} fewer`, color: 'red' };
  }
  if (deficit > 0 && level.quantities.available < deficit) {
    return { label: `Short ${deficit - level.quantities.available}`, color: 'red' };
  }
  if (deficit > 0) return { label: 'Shortfall, stock available', color: 'amber' };
  return { label: 'OK', color: 'green' };
};

const quantityOrDash = (v: number | null | undefined) => v ?? '—';

export const getReservationHeaders = (shop: string) => [
  { id: 'productName', title: 'Product' },
  {
    id: 'platformLocationId',
    title: 'Location',
    formatter: (platformLocationId: string, row: { location?: ShopifyLocationDetail }) => (
      <LocationCell shop={shop} platformLocationId={platformLocationId} location={row.location} />
    ),
  },
  {
    id: 'stockStatus',
    title: 'Status',
    formatter: (status: StockStatus | null) =>
      status ? (
        <Badge color={status.color} variant="soft">
          {status.label}
        </Badge>
      ) : (
        '—'
      ),
  },
  {
    id: 'requiredQuantity',
    title: 'Required',
    // 0 means the reconcile has never visited this row, not that nothing is required
    formatter: (v: number) =>
      v > 0 ? (
        v
      ) : (
        <Badge color="gray" variant="soft">
          Not reconciled
        </Badge>
      ),
  },
  { id: 'held', title: 'Held' },
  {
    id: 'deficit',
    title: 'Deficit',
    formatter: (v: number) =>
      v > 0 ? (
        <Badge color="red" variant="soft">
          {v}
        </Badge>
      ) : (
        '—'
      ),
  },
  { id: 'shopifyAvailable', title: 'Available', formatter: quantityOrDash },
  { id: 'shopifyReserved', title: 'Reserved (all)', formatter: quantityOrDash },
  { id: 'shopifyOnHand', title: 'On Hand', formatter: quantityOrDash },
  { id: 'quantityUnreserved', title: 'Returned' },
  {
    id: 'reservedAt',
    title: 'Reserved At',
    formatter: (v: Date | null) => (v ? dateTimeFormatter(v) : '—'),
  },
  {
    id: 'unreservedAt',
    title: 'Returned At',
    formatter: (v: Date | null) => (v ? dateTimeFormatter(v) : '—'),
  },
  { id: 'platformInventoryItemId', title: 'Inventory Item', as: 'code' as const },
];

// Shipping

type ShippingConfig = {
  deliveryMethods: string[];
  defaultPlatformShippingMethodName: string | null;
  enabledShippingMethods: string[];
};

const zoneCoverage = (zone: ShopifyDeliveryProfileDetail['zones'][number]) =>
  zone.countries
    .map(({ code, provinces }) =>
      code.restOfWorld
        ? 'Rest of world'
        : `${code.countryCode}${provinces.length ? ` (${provinces.length} regions)` : ''}`
    )
    .join(', ');

/**
 * The checks that explain most shipping-rate order issues: the release's method names are
 * delivery-profile method names, so a name a profile doesn't offer matches no rate for any order
 * containing that profile's products. Lists come from the first page of each connection, which
 * covers every profile seen in practice.
 */
const getShippingWarnings = ({
  config,
  profiles,
  productsByProfile,
  productsWithoutProfile,
  stockLocationIds,
  locationsById,
}: {
  config: ShippingConfig;
  profiles: ShopifyDeliveryProfileDetail[];
  productsByProfile: Map<string, string[]>;
  productsWithoutProfile: string[];
  stockLocationIds: string[];
  locationsById: Map<string, ShopifyLocationDetail>;
}) => {
  const warnings: string[] = [];
  if (!config.deliveryMethods.includes('SHIPPING')) return warnings;

  for (const profile of profiles) {
    const products = productsByProfile.get(profile.id) ?? [];
    const scope = `${profile.name} (${products.length} of this release's products)`;
    const activeMethods = new Set(
      profile.zones.flatMap((zone) => zone.methods.filter((m) => m.active).map((m) => m.name))
    );

    const defaultMethod = config.defaultPlatformShippingMethodName;
    if (defaultMethod && !activeMethods.has(defaultMethod)) {
      warnings.push(`Default method "${defaultMethod}" isn't an active method in ${scope}.`);
    }

    const missing = config.enabledShippingMethods.filter((name) => !activeMethods.has(name));
    if (missing.length > 0) {
      warnings.push(
        `Enabled method${missing.length === 1 ? '' : 's'} ${missing.map((n) => `"${n}"`).join(', ')} ${
          missing.length === 1 ? "isn't an active method" : "aren't active methods"
        } in ${scope}.`
      );
    }

    const shipsFrom = new Set(profile.locations.map((l) => l.legacyResourceId));
    const unshipped = stockLocationIds.filter((id) => !shipsFrom.has(id));
    if (profile.locations.length > 0 && unshipped.length > 0) {
      const names = unshipped.map((id) => locationsById.get(id)?.name ?? id).join(', ');
      warnings.push(`${scope} doesn't ship from ${names}, where this release holds its stock.`);
    }
  }

  if (productsWithoutProfile.length > 0) {
    warnings.push(
      `No shipping profile for ${productsWithoutProfile.join(', ')}. Shopify treats these as not requiring shipping.`
    );
  }

  return warnings;
};

export const ShippingProfiles = ({
  shop,
  config,
  profiles,
  productsByProfile,
  productsWithoutProfile,
  stockLocationIds,
  locationsById,
}: {
  shop: string;
  config: ShippingConfig;
  profiles: ShopifyDeliveryProfileDetail[];
  productsByProfile: Map<string, string[]>;
  productsWithoutProfile: string[];
  stockLocationIds: string[];
  locationsById: Map<string, ShopifyLocationDetail>;
}) => {
  const warnings = getShippingWarnings({
    config,
    profiles,
    productsByProfile,
    productsWithoutProfile,
    stockLocationIds,
    locationsById,
  });

  const rows = profiles.map((profile) => ({
    ...profile,
    products: productsByProfile.get(profile.id) ?? [],
  }));

  const headers = [
    {
      id: 'name',
      title: 'Profile',
      formatter: (name: string, row: (typeof rows)[number]) => (
        <Flex align="center" gap="2">
          {name}
          {row.default && (
            <Badge color="gray" variant="soft">
              General
            </Badge>
          )}
        </Flex>
      ),
      href: (_v: string, row: (typeof rows)[number]) =>
        getShopifyAdminDeliveryProfileUrl(shop, row.id),
    },
    {
      id: 'products',
      title: 'Release Products',
      formatter: (products: string[]) => <StackedLines lines={products} />,
    },
    {
      id: 'locations',
      title: 'Ships From',
      formatter: (locations: ShopifyDeliveryProfileDetail['locations']) => (
        <StackedLines lines={locations.map((l) => l.name)} />
      ),
    },
    {
      id: 'zones',
      title: 'Zones & Methods',
      formatter: (zones: ShopifyDeliveryProfileDetail['zones']) => (
        <StackedLines
          lines={zones.map(
            (zone) =>
              `${zone.name}: ${zoneCoverage(zone)} · ${
                zone.methods.map((m) => (m.active ? m.name : `${m.name} (inactive)`)).join(', ') ||
                'no methods'
              }`
          )}
        />
      ),
    },
  ];

  return (
    <>
      {warnings.map((warning) => (
        <Callout.Root key={warning} color="amber" size="1" mb="2">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{warning}</Callout.Text>
        </Callout.Root>
      ))}
      {rows.length > 0 ? (
        <DataTable headers={headers} data={rows} />
      ) : (
        <Text color="gray" size="2" as="p">
          No shipping profiles found for this release’s products.
        </Text>
      )}
    </>
  );
};

const StackedLines = ({ lines }: { lines: string[] }) =>
  lines.length > 0 ? (
    <Flex direction="column" gap="1">
      {lines.map((line, i) => (
        <Text key={i}>{line}</Text>
      ))}
    </Flex>
  ) : (
    '—'
  );

// Delivery breakdown

export type DeliveryBreakdownRow = {
  deliveryMethod: string;
  label: string;
  orders: number;
  avgCharged: number;
  totalCharged: number;
};

const deliveryMethodLabel: Record<string, string> = {
  SHIPPING: 'Shipping',
  PICKUP: 'Pickup',
  LOCAL_DELIVERY: 'Local delivery',
};

const money = (v: number) => `$${v.toFixed(2)}`;

export const deliveryBreakdownHeaders = [
  {
    id: 'deliveryMethod',
    title: 'Method',
    formatter: (v: string) => deliveryMethodLabel[v] ?? v,
  },
  { id: 'label', title: 'Rate / Location' },
  { id: 'orders', title: 'Orders' },
  { id: 'avgCharged', title: 'Avg Charged', formatter: money },
  { id: 'totalCharged', title: 'Total Charged', formatter: money },
];

/**
 * One row per method and what the order resolved to. Pickup stores its location in
 * `deliveryPickupTitle`; shipping stores the charged rate's title in `shippingRateTitle`.
 */
export const toDeliveryBreakdownRows = (
  groups: {
    deliveryMethod: string;
    shippingRateTitle: string | null;
    deliveryPickupTitle: string | null;
    _count: { _all: number };
    _sum: { deliveryPrice: number | null };
  }[]
): DeliveryBreakdownRow[] =>
  groups
    .map((group) => ({
      deliveryMethod: group.deliveryMethod,
      label:
        group.deliveryMethod === 'SHIPPING'
          ? (group.shippingRateTitle ?? 'No rate resolved')
          : group.deliveryMethod === 'PICKUP'
            ? (group.deliveryPickupTitle ?? 'No location')
            : '—',
      orders: group._count._all,
      avgCharged: group._count._all ? (group._sum.deliveryPrice ?? 0) / group._count._all : 0,
      totalCharged: group._sum.deliveryPrice ?? 0,
    }))
    .sort((a, b) => b.orders - a.orders);
