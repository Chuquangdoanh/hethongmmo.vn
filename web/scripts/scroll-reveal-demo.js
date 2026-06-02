const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const OUT = "C:\\Users\\HELLO\\Desktop\\scroll-demo";
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto("http://localhost:3000", { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(1000);

  let frame = 0;
  const pad = (n) => String(n).padStart(3, "0");

  // Scroll từ từ qua toàn bộ trang, chụp mỗi 150px
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  const step = 150;

  for (let y = 0; y <= totalHeight; y += step) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(180); // đủ để animation 0.7s bắt đầu rõ
    await page.screenshot({ path: path.join(OUT, `frame-${pad(frame)}.png`) });
    frame++;
    process.stdout.write(`\r  scroll ${y}/${totalHeight} — frame ${frame}`);
  }

  console.log(`\n\nTotal frames: ${frame}`);
  console.log("Saved to:", OUT);
  await browser.close();
})();
