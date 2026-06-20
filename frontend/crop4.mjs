import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--no-sandbox"], executablePath: "/home/scotch/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome" });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto("http://localhost:5173/outreach", { waitUntil: "networkidle" });
await page.waitForSelector("text=Founder Outreach");
await page.screenshot({ path: "/tmp/shots/outreach_full.png" });
await browser.close();
