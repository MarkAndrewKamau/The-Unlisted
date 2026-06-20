import { chromium } from "playwright";
import fs from "fs";

const base = "http://localhost:5173";
const shots = "/tmp/shots";
fs.mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({
  args: ["--no-sandbox"],
  executablePath: "/home/scotch/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push("pageerror: " + err.message));

async function visit(path, waitText, shotName) {
  await page.goto(base + path, { waitUntil: "networkidle" });
  if (waitText) await page.waitForSelector(`text=${waitText}`, { timeout: 10000 });
  await page.screenshot({ path: `${shots}/${shotName}.png`, fullPage: true });
  console.log(`OK ${path} -> ${shotName}.png`);
}

await visit("/", "Pipeline Overview".slice(0,0) || "Run Pipeline", "dashboard");
await visit("/candidates", "Candidate Database", "candidates");
await visit("/top-50", "Hidden Champions", "top50");

// click first ranked card to go to a profile
await page.goto(base + "/top-50", { waitUntil: "networkidle" });
const firstCard = await page.locator('a[href^="/profiles/"]').first();
await firstCard.click();
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${shots}/profile.png`, fullPage: true });
console.log("OK profile.png", page.url());

await visit("/outreach", "Founder Outreach", "outreach");
await visit("/docs", "Operating principle", "docs");

console.log("CONSOLE ERRORS:", errors.length ? errors : "none");
await browser.close();
