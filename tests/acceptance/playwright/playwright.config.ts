import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

// bddgen turns the synced .feature files into runnable Playwright specs — the
// direct analog of Reqnroll generating .feature.cs. Output lands in .features-gen/
// (gitignored). The tag filter keeps this lane to the browser levels: @api
// scenarios (owned by the Reqnroll lane) are excluded so their HTTP-vocabulary
// steps are never required to bind here. @nfr stays excluded for future NFR specs.
const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  // Include the DSL fixtures file so bddgen can resolve the custom `test`
  // instance (base.extend) the steps are bound to.
  steps: ['steps/**/*.ts', 'dsl/fixtures.ts'],
  tags: process.env.BDD_TAGS ?? 'not @nfr and not @api',
});

export default defineConfig({
  testDir,
  // Fail the run if someone leaves test.only in a step file.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['list'], ['junit', { outputFile: 'test-results/results.xml' }]]
    : 'list',
  use: {
    // The Angular app under test. The frontend is served by the API itself (one
    // container, one port), so it defaults to the same origin as the API rather
    // than a separate `ng serve` on 4200.
    baseURL: process.env.FRONTEND_BASE_URL ?? 'http://localhost:8080',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
