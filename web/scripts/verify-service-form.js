const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const OUT = "C:\\Users\\HELLO\\Desktop\\service-form";
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });

  // Dùng dịch vụ có warranty options
  await page.goto("http://localhost:3000/dich-vu/unlock", { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(800);

  // Chụp form ban đầu (chưa có lỗi)
  await page.screenshot({ path: path.join(OUT, "1-form-clean.png") });

  // ── Test phone: nhập sai → blur → thấy lỗi ──
  const phoneInput = page.locator('input[placeholder="VD: 0901234567"]');
  await phoneInput.fill("012345");
  await phoneInput.press("Tab");
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(OUT, "2-phone-invalid-blur.png") });

  // ── Phone: nhập tiếp đúng → lỗi mất ──
  await phoneInput.fill("0901234567");
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "3-phone-valid-realtime.png") });

  // ── Test warranty: blur mà không chọn ──
  const warrantySelect = page.locator("select").first();
  await warrantySelect.focus();
  await page.keyboard.press("Tab");
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(OUT, "4-warranty-blur-error.png") });

  // ── Warranty: chọn một option → lỗi mất ──
  await warrantySelect.selectOption({ index: 1 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "5-warranty-selected-ok.png") });

  // ── Submit khi phone trống + warranty chưa chọn → cả 2 lỗi cùng lúc ──
  await page.goto("http://localhost:3000/dich-vu/unlock", { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(800);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "6-submit-all-errors.png") });

  await browser.close();
  console.log("Done →", OUT);
})();
