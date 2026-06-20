import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--no-sandbox"], executablePath: "/home/scotch/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", e => console.log("pageerror:", e.message));
page.on("console", m => { if (m.type()==="error") console.log("console error:", m.text()); });
await page.goto("http://localhost:5173/docs", { waitUntil: "networkidle" });
await page.screenshot({ path: "/tmp/shots/docs_debug.png", fullPage: true });
console.log(await page.content());
await browser.close();
