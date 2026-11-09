import { chromium } from "../portrait-photo/node_modules/playwright/index.mjs";
import fs from "fs";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  console.log("Navigating to https://smartstore-register.buylife.xyz/login ...");
  const resp = await page.goto("https://smartstore-register.buylife.xyz/login", { waitUntil: "networkidle" });
  console.log("Response status:", resp ? resp.status() : "none");

  const dir = "D:/Antigravity/AIMaster/smartstore-register/docs";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  await page.screenshot({ path: `${dir}/evidence_login_v126.png`, fullPage: true });
  console.log("Screenshot saved to docs/evidence_login_v126.png");

  const logoVisible = await page.locator("div:has-text('🛒')").first().isVisible();
  const badgeText = await page.locator("text=AIMASTER SMARTSTORE REGISTER").innerText();
  const h1Text = await page.locator("h1").innerText();
  const btnText = await page.locator("button.btn-3d-sage").innerText();
  const termsText = await page.locator("text=진행 시").innerText();

  console.log("1. 68px 심볼 로고 (🛒):", logoVisible ? "PASS" : "FAIL");
  console.log("2. 영문 알약 뱃지:", badgeText);
  console.log("3. 한글 타이틀:", h1Text);
  console.log("4. 3D 엠보싱 세이지 버튼:", btnText);
  console.log("5. 1행 축소 약관 동의:", termsText);

  await browser.close();
}

run().catch(console.error);
