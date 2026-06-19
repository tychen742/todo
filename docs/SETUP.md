# Setup

## Prerequisites

- Node from `.nvmrc`
- npm
- Expo Go on iPhone
- Supabase project

## Install

```bash
source ~/.nvm/nvm.sh
nvm use
npm ci
```

## Environment

Create a local `.env.local` or `.env` file:

```bash
cp supabase.env.example .env.local
```

Fill in:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

Use the base project URL, not the `/rest/v1/` URL.

In Supabase Dashboard -> Authentication -> URL Configuration, set the local
development redirect URLs to the Expo web ports you use, for example:

```text
http://localhost:8081
http://localhost:8082
```

Magic links and password reset links will fail if Supabase redirects to a port
where Expo is not running, such as `http://localhost:3000`.

## Database

Open Supabase SQL Editor and run the full contents of:

```bash
supabase/schema.sql
```

From Terminal, print it for copying:

```bash
cat supabase/schema.sql
```

Or apply the schema from Terminal:

```bash
npm run db:apply
```

This requires `psql` and local database connection details in `.env.local` or `.env`.

Recommended:

```bash
SUPABASE_DB_HOST=aws-1-us-east-1.pooler.supabase.com
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres.<project-ref>
SUPABASE_DB_PASSWORD=your-database-password
```

This keeps the password separate so characters like `@`, `#`, and `/` do not need manual URL encoding.

You can also use one database URL:

```bash
SUPABASE_DB_URL=postgresql://postgres.<project-ref>:<password>@aws-1-us-east-1.pooler.supabase.com:5432/postgres
```

Get the URL from Supabase Dashboard -> Connect -> Shared Pooler or Session pooler. Keep this value local and never commit local env files.

Prefer the shared/session pooler URL over the direct `db.<project-ref>.supabase.co:5432` URL. The direct host may require IPv6 and can fail on some networks with `No route to host`.

## Run

```bash
npx expo start -c
```

For web, open:

```text
http://localhost:8081
```

## TypeScript Database Types

Generate authoritative TypeScript types from the live database schema:

```bash
npx supabase gen types typescript --project-id <your-project-ref> > lib/database.types.ts
```

Replace `<your-project-ref>` with the ID from your Supabase project URL (e.g. `abcdefghijklmnop`).

The generated file gives you a `Database` type you can use to type Supabase queries:

```ts
import type { Database } from '../lib/database.types';
const supabase = createClient<Database>(url, key);
```

Re-run the command after any schema change to keep types in sync. Do not edit `lib/database.types.ts` by hand.

For iPhone, scan the Expo QR code or open the LAN `exp://...` URL in Expo Go.

## Vercel Cron Supabase Keep-Alive

`vercel.json` schedules a daily Vercel Cron request to:

```text
/api/keep-supabase-awake
```

The route calls the `touch_supabase_heartbeat()` Supabase RPC using the deployed
environment variables:

```bash
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are also accepted as server-only aliases.

The schedule is `17 8 * * *`, which runs once per day at 08:17 UTC. The route is
operational only; it does not contain product logic. Its purpose is to create one
trivial daily Supabase write so the hosted project is less likely to be treated
as idle.

Before relying on the cron route, apply `supabase/schema.sql` so the private
`app_private.supabase_heartbeat` table and `touch_supabase_heartbeat()` RPC
exist in Supabase.

Manual check after deployment:

```bash
curl https://<deployment-host>/api/keep-supabase-awake
```

## mba/mst Workflow

On each machine:

```bash
git pull
source ~/.nvm/nvm.sh
nvm use
npm ci
npx expo start -c
```

Keep `node_modules/` local. Commit dependency changes through `package.json` and `package-lock.json`.
