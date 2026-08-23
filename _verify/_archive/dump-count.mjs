import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,900"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  const info = await page.evaluate(() => {
    const proj = document.querySelector('[data-od-id="card-projects"]');
    const notes = document.querySelector('[data-od-id="card-notes"]');
    const exec = document.querySelector('[data-od-id="card-exec"]');
    return {
      projCount: proj?.querySelectorAll(".proj-line").length ?? -1,
      noteCount: notes?.querySelectorAll(".note-item").length ?? -1,
      execCats: exec?.querySelectorAll(".exec-cats li").length ?? -1,
      execStats: exec?.querySelectorAll(".exec-status-list li").length ?? -1,
      projNames: [...(proj?.querySelectorAll(".proj-name-text b") ?? [])].map((b) => b.textContent),
      noteTitles: [...(notes?.querySelectorAll(".note-item b") ?? [])].map((b) => b.textContent?.slice(0, 20)),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
