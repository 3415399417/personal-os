import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,900"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const fails = [];
  page.on("requestfailed", (req) => fails.push(`${req.url()} ${req.failure()?.errorText}`));
  page.on("console", (msg) => { if (msg.type() === "error") fails.push(`[console] ${msg.text()}`); });

  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  // 三种视口宽度截图
  for (const w of [1440, 1024, 900]) {
    await page.setViewport({ width: w, height: 900 });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: `C:\\Users\\34153\\.openclaw\\workspace\\full-${w}.png` });
  }
  await page.setViewport({ width: 1440, height: 900 });
  await new Promise((r) => setTimeout(r, 800));

  const state = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".grid-row")].map((row) => ({
      cols: getComputedStyle(row).gridTemplateColumns,
      cards: [...row.querySelectorAll(".card")].map((c) => ({
        od: c.getAttribute("data-od-id"),
        h: Math.round(c.getBoundingClientRect().height),
      })),
    }));
    const notes = document.querySelector('[data-od-id="card-notes"]');
    const noteItems = notes ? [...notes.querySelectorAll(".note-item")].map((n) => n.textContent.slice(0, 30)) : [];
    const foots = {};
    for (const id of ["card-exec", "card-projects", "card-notes"]) {
      const el = document.querySelector(`[data-od-id="${id}"]`);
      foots[id] = el?.querySelector(".card-foot")?.textContent.trim() ?? "NO FOOT";
    }
    return { rows, noteItems, foots, bodyH: document.body.scrollHeight };
  });
  console.log(JSON.stringify(state, null, 2));
  console.log("FAILS:", fails.slice(0, 10).join("\n") || "none");
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
