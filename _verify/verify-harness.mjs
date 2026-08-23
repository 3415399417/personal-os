import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto("http://localhost:3000/github", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3500));

  await page.evaluate(() => {
    [...document.querySelectorAll(".github-subtab")].find((b) => b.textContent === "Harness")?.click();
  });
  await new Promise((r) => setTimeout(r, 4000));

  const info = await page.evaluate(() => {
    const subs = [...document.querySelectorAll(".github-subtab")].map((b) => ({
      text: b.textContent,
      active: b.className.includes("active"),
    }));
    const cards = [...document.querySelectorAll(".github-card .github-name")].map((n) => n.textContent);
    return { subs, count: cards.length, first: cards[0], names: cards.slice(0, 6) };
  });
  console.log("HARNESS:", JSON.stringify(info, null, 2));

  const rect = await page.evaluate(() => {
    const el = document.querySelector(".github-subtabs");
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x) - 8, y: Math.round(r.y) - 8, width: Math.round(r.width) + 16, height: Math.round(r.height) + 16 };
  });
  await page.screenshot({ path: "_verify/github-harness-subtabs.png", clip: rect });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
