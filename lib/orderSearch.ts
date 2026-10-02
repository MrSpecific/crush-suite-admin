import { Prisma } from '@prisma/client';
import { QueryMode } from '@/lib/prisma';

const maxInt32 = 2_147_483_647;

// "$1,234.56", "1234.5", "$50"
const amountPattern = /^\$?(\d{1,3}(,\d{3})+|\d+)(\.\d{0,2})?$/;

const textFields = [
  'customerFirstName',
  'customerLastName',
  'customerEmail',
  'compliancePartnerOrderId',
  'platformOrderId',
  'platformOrderName',
] as const;

/**
 * Builds an order `where` clause from a free-text search. Each whitespace
 * separated term must match at least one of: customer name or email, order
 * ID, compliance partner order ID, Shopify order ID or number, or order total.
 * Matching per term lets "jane smith" hit first + last name.
 */
export const getOrderSearchWhere = (search?: string | string[]): Prisma.OrderWhereInput => {
  const value = (Array.isArray(search) ? search[0] : search)?.trim();
  if (!value) return {};

  return { AND: value.split(/\s+/).map(getTermWhere) };
};

const getTermWhere = (term: string): Prisma.OrderWhereInput => {
  const OR: Prisma.OrderWhereInput[] = textFields.map((field) => ({
    [field]: { contains: term, mode: QueryMode.insensitive },
  }));

  OR.push({ customer: { email: { contains: term, mode: QueryMode.insensitive } } });

  if (/^\d+$/.test(term) && Number(term) <= maxInt32) {
    OR.push({ id: Number(term) });
  }

  const totalValue = getTotalValueRange(term);
  if (totalValue) OR.push({ totalValue });

  return { OR };
};

// Totals are floats, so match a range: to the cent when cents are given,
// otherwise anything within that whole dollar ("$50" matches $50.00–$50.99).
const getTotalValueRange = (term: string): Prisma.FloatFilter | undefined => {
  const match = term.match(amountPattern);
  if (!match) return undefined;

  const amount = Number(term.replace(/[$,]/g, ''));
  if (!Number.isFinite(amount)) return undefined;

  const hasCents = !!match[3] && match[3].length > 1;

  return hasCents
    ? { gte: amount - 0.005, lt: amount + 0.005 }
    : { gte: amount, lt: amount + 1 };
};
