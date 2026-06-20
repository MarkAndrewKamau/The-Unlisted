import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--no-sandbox"], executablePath: "/home/scotch/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
const info = await page.evaluate(() => {
  const link = document.querySelector('a[href^="/profiles/"]');
  function dump(el, depth) {
    if (!el || depth > 6) return [];
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const row = { tag: el.tagName, cls: (el.className||"").toString().slice(0,60), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), overflowX: cs.overflowX, minWidth: cs.minWidth, display: cs.display };
    let rows = [row];
    for (const child of el.children) rows = rows.concat(dump(child, depth+1).map(x => ({...x, depth: (x.depth||0)+1})));
    return rows;
  }
  return dump(link, 0);
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
