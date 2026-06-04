const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const OUT = "C:\\Users\\HELLO\\Desktop\\pagination-shots";
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // ── Dịch vụ trang 1 — cuộn tới đúng chỗ pagination ──
  await page.goto("http://localhost:3000/dich-vu", { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(1000);
  // Scroll đến element pagination
  await page.evaluate(() => {
    const el = document.querySelector("nav[aria-label='Phân trang']");
    if (el) el.scrollIntoView({ behavior: "instant", block: "center" });
    else window.scrollTo(0, document.body.scrollHeight - 1200);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "dich-vu-pagination.png") });
  console.log("✓ dich-vu pagination");

  // ── Dịch vụ trang 2 ──
  await page.goto("http://localhost:3000/dich-vu?page=2", { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "dich-vu-page2-top.png") });
  await page.evaluate(() => {
    const el = document.querySelector("nav[aria-label='Phân trang']");
    if (el) el.scrollIntoView({ behavior: "instant", block: "center" });
    else window.scrollTo(0, document.body.scrollHeight - 1200);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "dich-vu-page2-pagination.png") });
  console.log("✓ dich-vu page 2");

  // ── Tut-tricks (4 items < 9 = no pagination, confirm ok) ──
  await page.goto("http://localhost:3000/tut-tricks", { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "tut-full.png"), fullPage: true });
  console.log("✓ tut-tricks");

  await browser.close();
  console.log("Saved to:", OUT);
})();
