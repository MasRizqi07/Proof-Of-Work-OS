const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 720 },
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'node e2e/test-server.js',
      port: 4000,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      env: {
        NODE_ENV: 'test',
        PORT: '4000',
        RATE_LIMIT_MAX: '10000',
        DATABASE_URL:
          process.env.DATABASE_URL ||
          'postgresql://postgres:postgres@localhost:5433/proof_of_work_os_test',
      },
    },
    {
      command: 'npm --workspace client run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      env: {
        VITE_SUPABASE_URL:
          process.env.SUPABASE_URL || 'https://test-project.supabase.co',
        VITE_SUPABASE_ANON_KEY:
          process.env.SUPABASE_ANON_KEY || 'test-anon-key-pow-os-12345',
        VITE_API_URL: 'http://localhost:4000/api',
      },
    },
  ],
});
