const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const OUT = "C:\\Users\\HELLO\\Desktop\\homepage-shots";
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto("http://localhost:3000", { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(1200);

  // Scroll qua toàn bộ trang để trigger IntersectionObserver
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let y = 0;
      const step = 300;
      const delay = 120;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        y += step;
        if (y >= document.body.scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve(undefined);
        }
      }, delay);
    });
  });

  // Chờ tất cả animation kết thúc (counter 1.6s + buffer)
  await page.waitForTimeout(2200);

  // ── Chụp từng section ──
  const shots = [
    { label: "hero",       y: 200 },
    { label: "expert",     y: 1100 },
    { label: "services",   y: 2100 },
    { label: "stats",      y: 2700 },
    { label: "categories", y: 3100 },
    { label: "tuts",       y: 3500 },
    { label: "products",   y: 4200 },
    { label: "faq",        y: 5200 },
  ];

  for (const { label, y } of shots) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, `${label}.png`) });
    console.log(`✓ ${label}`);
  }

  // Full page
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "full.png"), fullPage: true });
  console.log("✓ full page");

  await browser.close();
  console.log("\nSaved to:", OUT);
})();
