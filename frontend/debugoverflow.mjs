import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--no-sandbox"], executablePath: "/home/scotch/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
const info = await page.evaluate(() => {
  const vw = window.innerWidth;
  const results = [];
  document.querySelectorAll("*").forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1) {
      results.push({ tag: el.tagName, cls: el.className?.toString().slice(0,80), right: r.right, width: r.width });
    }
  });
  return { vw, bodyScrollWidth: document.body.scrollWidth, count: results.length, sample: results.slice(0, 15) };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
