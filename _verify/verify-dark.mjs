import puppeteer from "puppeteer-core";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BASE = "http://localhost:3001";

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

async function probe(path, theme) {
  await page.goto(BASE + path, { waitUntil: "load", timeout: 45000 });
  if (theme === "dark") {
    await page.evaluate(() => {
      localStorage.setItem("theme", "dark");
      document.documentElement.dataset.theme = "dark";
    });
    await page.reload({ waitUntil: "load", timeout: 45000 });
  }
  await new Promise((r) => setTimeout(r, 1500));
  return await page.evaluate(() => {
    const pick = (sel, prop) => {
      const el = document.querySelector(sel);
      if (!el) return `(missing) ${sel}`;
      return getComputedStyle(el)[prop];
    };
    return {
      startCardBg: pick(".start-card", "backgroundImage"),
      startGreetColor: pick(".start-greet", "color"),
      resCellColor: pick(".res-row-cell", "color"),
      resCellBg: pick(".res-row-cell", "backgroundColor"),
      resNumColor: pick(".res-row-cell .num", "color"),
      noteItemColor: pick('.note-item b', "color"),
      tagColor: pick(".note-type-tag", "color"),
      btnPrimaryColor: pick(".start-btn", "color"),
      bodyBg: pick("body", "backgroundColor"),
    };
  });
}

console.log("=== HOME light ===");
console.log(JSON.stringify(await probe("/?ts=" + Date.now(), "light"), null, 2));
console.log("=== HOME dark ===");
console.log(JSON.stringify(await probe("/?ts=" + Date.now(), "dark"), null, 2));

await browser.close();
console.log("DONE");
