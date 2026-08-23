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

  const readExec = () =>
    page.evaluate(() => {
      const exec = document.querySelector('[data-od-id="card-exec"]');
      return {
        cats: [...exec.querySelectorAll(".exec-cats li")].map((li) => li.textContent.trim()),
        stats: [...exec.querySelectorAll(".exec-status-list li")].map((li) => li.textContent.trim()),
      };
    });

  const before = await readExec();
  console.log("BEFORE:", JSON.stringify(before));

  // 找侧边栏待办列表中的勾选框，点击第一个未完成的
  const clicked = await page.evaluate(() => {
    const items = document.querySelectorAll('[data-od-id="sidebar"] .todo-item, [data-od-id="sidebar"] li, [data-od-id="sidebar"] .todo-check');
    // 查找可点击的勾选元素
    const checks = [...document.querySelectorAll('[data-od-id="sidebar"] input[type="checkbox"], [data-od-id="sidebar"] .todo-check, [data-od-id="sidebar"] .check')];
    if (checks.length === 0) return { ok: false, reason: "no checks found", html: document.querySelector('[data-od-id="sidebar"]')?.innerHTML.slice(0, 800) };
    // 点击第一个
    const el = checks[0];
    el.click();
    return { ok: true, tag: el.tagName, cls: el.className };
  });
  console.log("CLICK:", JSON.stringify(clicked));

  // 等 1.5 秒，不刷新页面
  await new Promise((r) => setTimeout(r, 2000));

  const after = await readExec();
  console.log("AFTER:", JSON.stringify(after));
  console.log("CHANGED:", JSON.stringify(before) !== JSON.stringify(after));

  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
