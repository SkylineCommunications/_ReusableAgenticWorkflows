import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const AUTH_FILE = path.join(__dirname, '../playwright/.auth/user.json');
// Use AUDIT_APP_URL if provided (set by the Copilot extension), otherwise fall back to FleetOps.
const APP_URL = process.env.AUDIT_APP_URL ?? '/app/7defd98c-50b9-40fb-bb55-2ceba50085ef/Overview';
const MAX_AGE_HOURS = 8;

/**
 * One-time interactive setup. Run with:
 *   npx playwright test --project=setup
 *
 * Skips automatically if a valid auth file exists that is less than 8 hours old.
 * A browser window will open when login is needed — sign in via SAML → Microsoft → MFA.
 * Re-run this setup whenever your session expires.
 */
setup('authenticate via SAML + Microsoft', async ({ page }) => {
  setup.setTimeout(300_000);

  // Skip silently if the auth file is recent — no browser window needed.
  if (fs.existsSync(AUTH_FILE)) {
    const ageHours = (Date.now() - fs.statSync(AUTH_FILE).mtimeMs) / 3_600_000;
    if (ageHours < MAX_AGE_HOURS) {
      console.log(`✅  Auth file is ${ageHours.toFixed(1)}h old — reusing session, no login needed.`);
      return;
    }
  }

  await page.goto(APP_URL);

  if (page.url().includes('/app/')) {
    console.log('✅  Already authenticated — saving state.');
    await page.context().storageState({ path: AUTH_FILE });
    return;
  }

  console.log('\n👉  Browser is open. Please sign in via SAML → Microsoft → complete MFA.\n');
  console.log('    Waiting up to 3 minutes...\n');

  await page.waitForURL(url => url.href.includes('/app/'), { timeout: 180_000 });
  await page.waitForLoadState('networkidle');

  await page.context().storageState({ path: AUTH_FILE });
  console.log('✅  Session saved to', AUTH_FILE);
});
