import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--no-sandbox"], executablePath: "/home/scotch/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.mouse.wheel(0, 600);
await page.waitForTimeout(200);
await page.screenshot({ path: "/tmp/shots/mobile_scroll_viewport.png" });
await browser.close();
