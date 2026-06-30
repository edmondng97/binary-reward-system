import { defineConfig } from '@playwright/test';

// e2e requires the full stack running: docker mongo+redis, backend on :3001,
// frontend on :3000. See README. CI-less by design for this demo.
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:3000', headless: true },
  timeout: 30_000,
});
