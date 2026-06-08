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

Create a local `.env` file:

```bash
cp supabase.env.example .env
```

Fill in:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

Use the base project URL, not the `/rest/v1/` URL.

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

This requires `psql` and local database connection details in `.env`.

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

Get the URL from Supabase Dashboard -> Connect -> Shared Pooler or Session pooler. Keep this value local and never commit `.env`.

Prefer the shared/session pooler URL over the direct `db.<project-ref>.supabase.co:5432` URL. The direct host may require IPv6 and can fail on some networks with `No route to host`.

## Run

```bash
npx expo start -c
```

For web, open:

```text
http://localhost:8081
```

For iPhone, scan the Expo QR code or open the LAN `exp://...` URL in Expo Go.

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
