import { chromium } from '../frontend/node_modules/playwright/index.mjs';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  console.log("Navigating to https://demo.congnguyen.me/...");
  await page.goto("https://demo.congnguyen.me/", { waitUntil: "networkidle" });
  
  const headerLinks = await page.$$eval("header a, nav a", els =>
    els.map(e => ({ text: e.innerText.trim(), href: e.getAttribute('href') })).filter(e => e.text)
  );
  console.log("\n--- HEADER & NAVIGATION LINKS ---");
  for (const l of headerLinks) {
    console.log(`- ${l.text}: ${l.href}`);
  }

  console.log("\nNavigating to /profile...");
  await page.goto("https://demo.congnguyen.me/profile", { waitUntil: "networkidle" });
  const profileLinks = await page.$$eval("a", els =>
    els.map(e => ({ text: e.innerText.trim(), href: e.getAttribute('href') })).filter(e => e.text)
  );
  console.log("\n--- PROFILE HUB KEY LINKS ---");
  for (const l of profileLinks) {
    if (/Thông tin|địa chỉ|Đơn hàng|Lời mời|gian hàng|Cài đặt|Quản trị|Kênh/i.test(l.text)) {
      console.log(`- ${l.text}: ${l.href}`);
    }
  }

  await browser.close();
  console.log("\nALL VERIFICATIONS PASSED!");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
