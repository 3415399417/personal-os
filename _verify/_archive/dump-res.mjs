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

  const res = await page.$('[data-od-id="card-resources"]');
  await res.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\final-res.png" });

  const info = await page.evaluate(() => {
    const c = document.querySelector('[data-od-id="card-resources"]');
    const cells = [...c.querySelectorAll(".res-row-cell")].map((el) => ({
      text: el.textContent.replace(/\s+/g, " ").trim(),
      href: el.getAttribute("href"),
    }));
    return {
      titleIco: !!c.querySelector(".res-title-ico"),
      title: c.querySelector(".card-title")?.textContent,
      hasAddBtn: !!c.querySelector(".btn-add"),
      hasDeleteBtn: !!c.querySelector(".task-del"),
      hasCountNote: /共 \d+ 条/.test(c.textContent),
      cells,
      foot: c.querySelector(".card-foot")?.textContent.trim(),
      hasBoxArt: c.querySelector(".card-art")?.innerHTML.includes("#D97706") ?? false,
      gridCols: getComputedStyle(c.querySelector(".res-grid2")).gridTemplateColumns,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
