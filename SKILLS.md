# Project Skills

## Stack

- Cross-platform app built with Expo SDK 54, React Native 0.81, React 19, TypeScript, and Expo Router.
- Web-specific interactions belong in `.web.tsx` modules when behavior differs from native.
- Read the exact Expo SDK 54 documentation at https://docs.expo.dev/versions/v54.0.0/ before changing Expo APIs or dependencies.

## Maps

- The Maps workspace view and its interaction logic live in `app/index.tsx`; map node helpers and persistence normalization live in `lib/mindmaps.ts`.
- Keep top-level node creation available from the map inspector, the selected central topic, and the canvas. Child-node creation belongs to the selected node's action menu.
- New nodes start with empty labels. Preserve existing node positions when adding branches, and keep map edits synced through the existing local-cache and Supabase flow.
- Update `docs/ARCHITECTURE.md`, `docs/PRODUCT.md`, and `docs/TODOS.md` whenever map behavior or product scope changes.
