import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir: './tests/e2e',
 use: { baseURL: 'http://localhost:3017', trace: 'retain-on-failure' },
 webServer: { command: 'npm run start -- --port 3017', url: 'http://localhost:3017/login', reuseExistingServer: !process.env.CI },
 reporter: [['list']],
});
