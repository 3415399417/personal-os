import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,900"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  const info = await page.evaluate(() => {
    const gs = (el) => { const s = getComputedStyle(el); return { ff: s.fontFamily.split(",")[0], fs: s.fontSize }; };
    return {
      body: gs(document.body),
      sidebarBrand: gs(document.querySelector(".sidebar-brand b")),
      sidebarTodo: gs(document.querySelector(".todo-text")),
      sidebarStat: gs(document.querySelector(".stat-cell b")),
      cardTitle: gs(document.querySelector(".card-title")),
      execCat: gs(document.querySelector(".exec-cats li")),
      btnAdd: gs(document.querySelector(".btn-add")),
      heroTitle: gs(document.querySelector(".hero-title")),
      input: gs(document.querySelector("input")),
      noteItem: gs(document.querySelector(".note-item b")),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\final-allkaiti.png" });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
