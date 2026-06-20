import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--no-sandbox"], executablePath: "/home/scotch/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

for (const path of ["/candidates", "/outreach", "/top-50", "/docs"]) {
  await page.goto("http://localhost:5173" + path, { waitUntil: "networkidle" });
  const sw = await page.evaluate(() => document.body.scrollWidth);
  console.log(path, "scrollWidth:", sw);
  await page.screenshot({ path: `/tmp/shots/mobile_${path.replace(/\//g,"")}.png` });
}
await browser.close();
