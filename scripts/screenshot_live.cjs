const { chromium } = require('../frontend/node_modules/@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  
  // 1. Home
  await page.goto('https://demo.congnguyen.me/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'artifacts/demo-ui-rollout-20261027/live-nav-with-address.png', fullPage: false });
  console.log('Saved screenshot 1: live-nav-with-address.png');

  // 2. Profile page
  await page.goto('https://demo.congnguyen.me/profile', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'artifacts/demo-ui-rollout-20261027/live-profile-links.png', fullPage: false });
  console.log('Saved screenshot 2: live-profile-links.png');

  await browser.close();
})();
