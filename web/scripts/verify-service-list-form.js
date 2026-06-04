const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const OUT = "C:\\Users\\HELLO\\Desktop\\service-list-form";
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto("http://localhost:3000/dich-vu", { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(800);
  await page.locator('button:has-text("Đặt hàng ngay")').first().click();
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const panel = document.querySelector('[class*="scroll-mt"]');
    if (panel) panel.scrollIntoView({ behavior: "instant", block: "start" });
  });
  await page.waitForTimeout(400);

  // 1. Link sai IMEI → blur
  const linkInput = page.locator('input[placeholder*="352456"]').first();
  await linkInput.fill("abc123");
  await linkInput.press("Tab");
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(OUT, "1-link-invalid.png") });

  // 2. Link đúng IMEI → lỗi mất
  await linkInput.fill("352456789013456");
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "2-link-valid.png") });

  // 3. Gmail sai format → blur (tìm field gmail nếu có)
  // Click vào service non-iCloud nếu có
  await page.locator('button:has-text("Hủy")').first().click();
  await page.waitForTimeout(400);

  // Chọn service thứ 2 (có thể là non-iCloud)
  const cards = page.locator('button:has-text("Đặt hàng ngay")');
  const count = await cards.count();
  if (count > 1) {
    await cards.nth(1).click();
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      const panel = document.querySelector('[class*="scroll-mt"]');
      if (panel) panel.scrollIntoView({ behavior: "instant", block: "start" });
    });
    await page.waitForTimeout(400);

    const gmailInput = page.locator('input[placeholder="Gmail/pass cũ"]');
    if (await gmailInput.count() > 0) {
      await gmailInput.fill("notanemail");
      await gmailInput.press("Tab");
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(OUT, "3-gmail-invalid.png") });

      await gmailInput.fill("test@gmail.com:matkhau123");
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, "4-gmail-valid.png") });
    }

    // Link URL sai
    const linkUrl = page.locator('input[placeholder*="Link"]');
    if (await linkUrl.count() > 0) {
      await linkUrl.fill("facebook.com/profile");
      await linkUrl.press("Tab");
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(OUT, "5-link-url-invalid.png") });

      await linkUrl.fill("https://facebook.com/profile");
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, "6-link-url-valid.png") });
    }
  }

  await browser.close();
  console.log("Done →", OUT);
})();
