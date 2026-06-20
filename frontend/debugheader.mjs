import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--no-sandbox"], executablePath: "/home/scotch/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
const info = await page.evaluate(() => {
  const header = document.querySelector("header");
  const out = [];
  header.querySelectorAll(":scope > *").forEach(el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out.push({ cls: el.className, display: cs.display, left: r.left, right: r.right, width: r.width });
  });
  return { headerRect: header.getBoundingClientRect(), children: out };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
