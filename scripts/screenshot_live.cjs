const { chromium } = require('../frontend/node_modules/@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  
  await page.goto('https://demo.congnguyen.me/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'artifacts/demo-ui-rollout-20261027/live-updated-latest.png', fullPage: false });
  console.log('Saved screenshot to artifacts/demo-ui-rollout-20261027/live-updated-latest.png');

  // Test typing in the search bar with Vietnamese text
  const searchInput = page.getByPlaceholder('Bạn đang tìm sản phẩm gì?');
  if (await searchInput.isVisible()) {
    await searchInput.fill('áo khoác');
    console.log('Typed "áo khoác" into live search input: OK');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'artifacts/demo-ui-rollout-20261027/live-search-typed.png', fullPage: false });
    console.log('Saved search screenshot to artifacts/demo-ui-rollout-20261027/live-search-typed.png');
  } else {
    console.log('Header search input not found, checking product sample input...');
    const sampleInput = page.getByPlaceholder('Tìm tai nghe, áo khoác, đèn bàn…');
    if (await sampleInput.isVisible()) {
      await sampleInput.fill('áo khoác');
      console.log('Typed "áo khoác" into sample search input: OK');
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'artifacts/demo-ui-rollout-20261027/live-search-typed.png', fullPage: false });
    }
  }

  await browser.close();
})();
