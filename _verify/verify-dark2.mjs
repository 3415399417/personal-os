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

async function go(path, theme) {
  await page.goto(BASE + path, { waitUntil: "load", timeout: 45000 });
  if (theme === "dark") {
    await page.evaluate(() => {
      localStorage.setItem("theme", "dark");
      document.documentElement.dataset.theme = "dark";
    });
    await page.reload({ waitUntil: "load", timeout: 45000 });
  }
  await new Promise((r) => setTimeout(r, 1500));
}

// ---- /today dark: start-card ----
await go("/today", "dark");
const today = await page.evaluate(() => {
  const cs = (sel, prop) => {
    const el = document.querySelector(sel);
    return el ? getComputedStyle(el)[prop] : `(missing) ${sel}`;
  };
  return {
    startCardBg: cs(".start-card", "backgroundImage"),
    startGreet: cs(".start-greet", "color"),
    startItemText: cs(".start-item-text", "color"),
    startColBg: cs(".start-col", "backgroundColor"),
    startBtnColor: cs(".start-btn", "color"),
    progressBars: document.querySelectorAll(".task-group .progress").length,
  };
});
console.log("=== /today DARK ===");
console.log(JSON.stringify(today, null, 2));

// ---- / dark: tokens + tag colors + project/note titles ----
await go("/", "dark");
const home = await page.evaluate(() => {
  const root = getComputedStyle(document.documentElement);
  const tags = [...document.querySelectorAll(".tag")].slice(0, 6).map((el) => getComputedStyle(el).color);
  const cs = (sel, prop) => {
    const el = document.querySelector(sel);
    return el ? getComputedStyle(el)[prop] : `(missing) ${sel}`;
  };
  return {
    accentSoft: root.getPropertyValue("--accent-soft").trim(),
    accentDeep: root.getPropertyValue("--accent-deep").trim(),
    fg: root.getPropertyValue("--fg").trim(),
    tagColors: tags,
    projNameB: cs('[data-od-id="card-projects"] .proj-name-text b', "color"),
    noteTitleB: cs('[data-od-id="card-notes"] .note-item b', "color"),
  };
});
console.log("=== / DARK tokens & texts ===");
console.log(JSON.stringify(home, null, 2));

await browser.close();
console.log("DONE");
