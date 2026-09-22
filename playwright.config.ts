import { defineConfig, devices } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env manually so Supabase env vars are available in test fixtures
// (Playwright doesn't auto-source .env; Astro's vite plugin doesn't help at test time).
const envPath = resolve(import.meta.dirname, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: '**/mobile.spec.ts',
    },
    {
      name: 'iphone-13',
      use: { ...devices['iPhone 13'] },
      testMatch: '**/mobile.spec.ts',
    },
    {
      name: 'pixel-6',
      use: { ...devices['Pixel 6'] },
      testMatch: '**/mobile.spec.ts',
    },
    {
      name: 'ipad',
      use: { ...devices['iPad (gen 7)'] },
      testMatch: '**/mobile.spec.ts',
    },
  ],
});
