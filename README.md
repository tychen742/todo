# Todo

Todo is an Expo app for personal todos and lightweight project/team management. The near-term goal is a shared task workspace that works on web and iPhone, backed by Supabase.

## Documentation

- [Product](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [TODOs](docs/TODOS.md)
- [Decisions](docs/DECISIONS.md)
- [Setup](docs/SETUP.md)
- [Database](docs/DATABASE.md)

## Quick Start

Use Node from `.nvmrc`, install dependencies, and start Expo:

```bash
source ~/.nvm/nvm.sh
nvm use
npm ci
npx expo start -c
```

See [Setup](docs/SETUP.md) for Supabase and iPhone details.

## Database Updates

After schema changes, apply `supabase/schema.sql` manually in Supabase SQL Editor or run:

```bash
npm run db:apply
```

See [Setup](docs/SETUP.md) for the required local `SUPABASE_DB_URL`.

## Deployment

Production web deploys through Vercel's GitHub integration. Push or merge a
commit to the GitHub production branch, normally `main`, and Vercel detects the
change, runs `npm run build`, and serves the generated `dist/` directory.

See [Setup](docs/SETUP.md) for Vercel environment variables and post-deploy
checks.
