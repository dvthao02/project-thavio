const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('response', async (res) => {
    if (res.url().includes('/platform/auth/login')) {
      console.log('[login-response]', res.status(), res.url());
    }
  });

  await page.goto('http://localhost:3001/admin/login', { waitUntil: 'networkidle' });

  const identifier = page.locator('#identifier');
  const password = page.locator('#password');

  await identifier.click();
  await identifier.fill('admin');
  await password.click();
  await password.fill('Admin@123');

  console.log('[typed]', await identifier.inputValue(), await password.inputValue());

  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(4000);

  console.log('[url]', page.url());
  const token = await page.evaluate(() => localStorage.getItem('admin_token'));
  console.log('[token-exists]', Boolean(token));
  console.log('[cookie]', await page.evaluate(() => document.cookie));

  await page.screenshot({ path: 'd:/dvthao/project/project-thavio/admin-login-after-click.png', fullPage: true });
  await browser.close();
})();
