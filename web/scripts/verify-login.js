const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const OUT = "C:\\Users\\HELLO\\Desktop\\login-validation";
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto("http://localhost:3000/dang-nhap", { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(600);

  const emailInput    = 'input[placeholder="Email hoặc số điện thoại"]';
  const passwordInput = 'input[placeholder="Nhập mật khẩu của bạn"]';

  // 1. Email sai → blur
  await page.fill(emailInput, "abc@");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "1-email-invalid.png") });

  // 2. SĐT sai → blur
  await page.fill(emailInput, "012345");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "2-phone-invalid.png") });

  // 3. Mật khẩu quá ngắn
  await page.fill(emailInput, "test@gmail.com");
  await page.fill(passwordInput, "abc");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "3-password-too-short.png") });

  // 4. Mật khẩu thiếu chữ hoa
  await page.fill(passwordInput, "abcdefghijk1!");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "4-password-no-upper.png") });

  // 5. Mật khẩu đúng → lỗi mất
  await page.fill(passwordInput, "Abcdefghijk1!");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "5-password-valid.png") });

  await browser.close();
  console.log("Done →", OUT);
})();
