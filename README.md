# Ali POS System

A point-of-sale and inventory-management web application for clothing stores.
Built with Next.js 16, TypeScript, Prisma (PostgreSQL), Tailwind CSS, shadcn/ui,
and the ZXing browser barcode library.

## Features

- **Dashboard** — KPI cards, 7-day sales chart, top sellers, low-stock alerts,
  recent receipts.
- **Articles** — Full CRUD inventory (SKU, name, category, brand, size, color,
  price, cost, stock). Live search.
- **New Sale (POS)** — Scan a barcode via USB scanner, phone camera (ZXing),
  or manual SKU entry. Cart with quantity controls, tax %, discount, payment
  method, paid amount + change. Checkout generates a numbered receipt and
  decrements stock atomically (Prisma transaction).
- **History** — Searchable list of past receipts. Re-print any receipt.
- **Receipts** — Standalone print window with 80mm thermal-printer page
  size (`@page { size: 80mm auto }`) — no dialog chrome, no clipping.
- **Admin login** — Single admin account stored in the database. HMAC-SHA-256
  signed httpOnly session cookie. All `/api/*` routes gated by middleware.
  Passwords hashed with scrypt (memory-hard KDF, RFC 7914).
- **Camera barcode scanning** — Both at the POS (scan to add to cart) and
  in the Article form (scan a product's manufacturer barcode to fill the
  SKU field).

## Default admin credentials

```
Username: admin
Password: admin321
```

The admin account lives in the `User` table of your PostgreSQL database.
To create or reset the admin user, run:

```bash
bun run seed:admin
```

You can override the default credentials by setting `SEED_ADMIN_USER`
and `SEED_ADMIN_PASS` env vars before running the seed script:

```bash
SEED_ADMIN_USER=myadmin SEED_ADMIN_PASS=strongpass bun run seed:admin
```

## Setup (local development)

1. Install dependencies:

   ```bash
   bun install
   # or: npm install / pnpm install
   ```

2. Copy the env template and edit:

   ```bash
   cp .env.example .env
   ```

   Set `DATABASE_URL` to your PostgreSQL connection string (Neon, Supabase,
   Railway, RDS, or local Postgres all work).

3. Push the database schema:

   ```bash
   bun run db:push
   ```

4. Create the admin user:

   ```bash
   bun run seed:admin
   ```

5. Start the dev server:

   ```bash
   bun run dev
   ```

   This uses webpack (more reliable for Prisma+PostgreSQL). If you prefer
   Turbopack (faster but experimental), use `bun run dev:turbo`.

6. Open http://localhost:3000 and sign in with **admin / admin321**.

7. (Optional) Click the **Dashboard** tab → **Load demo catalog** button to
   seed 12 sample articles for testing.

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | yes | PostgreSQL connection string. Must include `?sslmode=require` for managed providers like Neon. |
| `SESSION_SECRET` | recommended | HMAC key for signing session cookies. Set to `openssl rand -hex 32` output in production. If unset, a random one is generated per server start (cookies won't survive restarts). |
| `SEED_ADMIN_USER` | optional | Override the admin username when running `bun run seed:admin`. |
| `SEED_ADMIN_PASS` | optional | Override the admin password when running `bun run seed:admin`. |

## Database schema

| Table | Purpose |
|-------|---------|
| `User` | Admin accounts (username, passwordHash, passwordSalt, role) |
| `Article` | Inventory items (SKU, name, category, brand, size, color, price, cost, stock) |
| `Sale` | Sales receipts (receiptNo, customer, totals, payment) |
| `SaleItem` | Line items of each sale (article snapshot + qty + subtotal) |

## Tech stack

- **Framework:** Next.js 16 (App Router, webpack dev server)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Database:** Prisma ORM with PostgreSQL
- **State:** Zustand (cart, auth)
- **Charts:** Recharts
- **Barcode:** `@zxing/browser` + `@zxing/library`
- **Icons:** Lucide React
- **Auth:** Custom HMAC-SHA-256 signed cookie (Web Crypto API), with
  scrypt-hashed DB-stored admin credentials

## Print a real receipt

When you click **Print** on a receipt, the app opens a popup window with a
standalone HTML document containing the receipt markup + its own CSS. This
avoids the parent Dialog's `max-height` / `overflow` clipping issues and
prints at 80mm thermal-paper width.

For mobile printing (AirPrint, etc.), the popup pattern works reliably.

## Production deployment

1. Set `SESSION_SECRET` to `openssl rand -hex 32` output.
2. Set `DATABASE_URL` to your production PostgreSQL connection string.
3. Run `bun run db:push` to create the schema.
4. Run `bun run seed:admin` (optionally with `SEED_ADMIN_USER` /
   `SEED_ADMIN_PASS` overrides) to set the admin password.
5. Set `NODE_ENV=production`.
6. Build and start:

   ```bash
   bun run build
   bun run start
   ```

## File layout

```
prisma/
  schema.prisma              # User, Article, Sale, SaleItem models (PostgreSQL)
scripts/
  seed-admin.ts              # Create / reset admin user with scrypt-hashed password
src/
  app/
    page.tsx                 # Main shell — login gate + 4 tabs
    layout.tsx               # Root layout + metadata
    globals.css              # Tailwind + print CSS
    api/
      articles/route.ts      # GET (list), POST (create)
      articles/[id]/route.ts # GET, PUT, DELETE
      sales/route.ts         # GET (list), POST (checkout)
      sales/[id]/route.ts    # GET single receipt
      stats/route.ts         # Dashboard aggregation
      seed/route.ts          # Demo catalog seeder
      auth/login/route.ts    # POST credentials → signed cookie
      auth/logout/route.ts   # POST → clear cookie
      auth/me/route.ts       # GET current session
  components/
    store/
      login-screen.tsx
      dashboard.tsx
      articles-manager.tsx
      pos-terminal.tsx
      camera-scanner.tsx
      sales-history.tsx
      receipt.tsx
    ui/                       # shadcn/ui components (already installed)
  lib/
    db.ts                    # Prisma client
    auth-token.ts            # Edge-safe session token (Web Crypto API HMAC)
    auth.ts                  # Node-only: checkCredentials (DB + scrypt)
    format.ts                # PKR + date formatting
  stores/
    cart-store.ts            # Zustand cart state
    auth-store.ts            # Zustand auth state
  hooks/
    use-toast.ts             # shadcn toast hook
  middleware.ts              # Gates /api/* routes (except /api/auth/*)
.env.example
package.json
```

## Architecture notes

### Why split `auth-token.ts` and `auth.ts`?

Next.js middleware runs in the **Edge Runtime**, which does NOT support
Node-only modules like `node:crypto` or `@prisma/client`. The middleware
needs to verify session cookies (HMAC sign + verify via Web Crypto API),
so `auth-token.ts` only uses Edge-safe primitives.

The login route runs in the **Node Runtime** and needs DB access (to look
up users) + `node:crypto` (for scrypt password verification). That code
lives in `auth.ts`. The route handler imports both files; the middleware
only imports `auth-token.ts`, so Prisma and `node:crypto` stay out of the
Edge bundle.

### Why webpack instead of Turbopack?

Turbopack is the Next.js default bundler and is faster, but in this
project's setup (Prisma + PostgreSQL in the Edge middleware) it has
silent crashes during route compilation. The `bun run dev` script
explicitly passes `--webpack` for stability. `bun run dev:turbo` is
available if you want to try Turbopack.

## License

Personal use. Modify freely for your own store.
