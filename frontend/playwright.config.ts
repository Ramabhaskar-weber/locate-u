import { defineConfig, devices } from '@playwright/test';

const PORT = 8010;
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 860 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
  // The backend serves the built PWA (frontend/dist) and the API from one origin.
  webServer: {
    command: `python -m uvicorn app.main:app --host 127.0.0.1 --port ${PORT}`,
    cwd: '../backend',
    url: `http://127.0.0.1:${PORT}/api/v1/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DATABASE_URL: 'sqlite:///./e2e_test.sqlite3',
      APP_ENV: 'test',
      AUTO_SETUP: 'true',
      RATE_LIMIT_PER_MINUTE: '0',
      SECRET_KEY: 'e2e-only-secret-key-not-for-production',
    },
  },
});
