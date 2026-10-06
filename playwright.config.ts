import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

// Smoke-test credentials live in the git-ignored .env.local (see docs/SETUP.md).
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const remoteBaseUrl = process.env.SMOKE_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  use: {
    baseURL: remoteBaseUrl ?? 'http://localhost:8081',
    // Uses the installed Google Chrome; set PLAYWRIGHT_CHANNEL= to use Playwright's Chromium.
    channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',
    trace: 'retain-on-failure',
  },
  // Without SMOKE_BASE_URL, test the local Expo web dev server (reusing one that is already running).
  webServer: remoteBaseUrl
    ? undefined
    : {
        command: 'npx expo start --web --port 8081',
        url: 'http://localhost:8081',
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
