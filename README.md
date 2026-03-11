# Crush Suite Admin

Internal admin application for managing CrushSuite data and operations. The app is built with Next.js App Router, Prisma, PostgreSQL, Radix UI, and `next-auth`.

## What It Does

- Manage merchants, products, customers, and orders
- Manage billing plans, discounts, API keys, and admin users
- Review GDPR-related records
- Run internal tools such as force-update sync actions
- View reports from the admin interface

Primary navigation lives in [app/Sidebar.tsx](/Users/willchristenson/git/crushsuite/crush-suite-admin/app/Sidebar.tsx).

## Stack

- Next.js 14
- React 18
- TypeScript
- Prisma ORM
- PostgreSQL
- Radix UI Themes
- NextAuth.js v4

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy the env template and fill in the values:

```bash
cp .env.template .env.local
```

3. Start the dev server:

```bash
npm run dev
```

The app runs on `http://localhost:3006`.

Useful scripts:

- `npm run dev` starts the Next.js dev server on port `3006`
- `npm run build` builds the app
- `npm run start` runs the production build
- `npm run lint` runs ESLint
- `npm run type-check` runs TypeScript without emitting files
- `npm run prisma:generate` regenerates the Prisma client
- `npm run prisma:studio` opens Prisma Studio

## Environment Variables

Defined in [.env.template](/Users/willchristenson/git/crushsuite/crush-suite-admin/.env.template):

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/my_app"
NEXTAUTH_URL="http://localhost:3006"
NEXTAUTH_SECRET=""
AUTH_TOKEN=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

Common additional env vars used by the app:

- `NEXT_PUBLIC_ENV` controls the environment badge shown in the sidebar
- `SEED_USER` can be used by the seed route to create an initial admin user

`NEXT_PUBLIC_ENV` supports `local`, `development`, `staging`, `production`, and `unknown`. See [lib/getEnvironment.ts](/Users/willchristenson/git/crushsuite/crush-suite-admin/lib/getEnvironment.ts).

## Authentication

Authentication is configured in [lib/authOptions.ts](/Users/willchristenson/git/crushsuite/crush-suite-admin/lib/authOptions.ts).

Supported sign-in methods:

- Credentials login against the `AdminUser` table
- Google OAuth through `next-auth`

Google sign-in is restricted to existing `AdminUser` records. A Google account can sign in only if its email matches an existing admin user email.

Required Google OAuth settings for local development:

- Authorized JavaScript origin: `http://localhost:3006`
- Authorized redirect URI: `http://localhost:3006/api/auth/callback/google`

The app redirects unauthenticated users to the NextAuth sign-in flow from [app/components/auth/Unauthenticated.tsx](/Users/willchristenson/git/crushsuite/crush-suite-admin/app/components/auth/Unauthenticated.tsx).

## Data Model

Prisma schema: [prisma/schema.prisma](/Users/willchristenson/git/crushsuite/crush-suite-admin/prisma/schema.prisma)

Core models include:

- `Merchant`
- `Product`
- `Customer`
- `Order`
- `BillingPlan`
- `SubscriptionDiscount`
- `AdminUser`
- `AdminAction`
- `GDPR`
- `ApiAccess`

## Admin Areas

Top-level routes currently include:

- `/merchants`
- `/products`
- `/customers`
- `/orders`
- `/billing-plans`
- `/discounts`
- `/api-keys`
- `/users`
- `/tools`
- `/gdpr`
- `/reports`

Root layout and auth gate live in [app/layout.tsx](/Users/willchristenson/git/crushsuite/crush-suite-admin/app/layout.tsx).

## Seeding an Initial Admin User

There is a simple seed endpoint at [app/api/seed/route.ts](/Users/willchristenson/git/crushsuite/crush-suite-admin/app/api/seed/route.ts).

Set `SEED_USER` to a JSON string like:

```json
{
  "email": "admin@example.com",
  "givenName": "Admin",
  "familyName": "User",
  "role": "SUPERADMIN",
  "password": "change-me"
}
```

Then request:

```bash
GET /api/seed
```

This is intended for local/bootstrap use, not general runtime admin provisioning.

## Notes

- The README documents the current local setup and auth flow as of March 11, 2026.
- The existing credentials flow still depends on `AUTH_TOKEN` for the internal auth API.
