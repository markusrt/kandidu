import { defineConfig, devices } from "@playwright/test";

// Override when 4173 is taken locally (e.g. by an editor's port forwarding).
const port = Number(process.env.KANDIDU_E2E_PORT ?? 4173);
const origin = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // Journeys run the whole application path; generous but bounded.
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: origin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Prompt copying (FR-016) uses the async clipboard API.
    permissions: ["clipboard-read", "clipboard-write"],
    locale: "de-DE",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `pnpm preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: origin,
    reuseExistingServer: false,
  },
});
