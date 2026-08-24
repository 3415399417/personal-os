import puppeteer from "puppeteer-core";

(async () => {
  // 1) 首页资源中心：链接 + 计数
  const dash = await (await fetch("http://localhost:3000/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getDashboard" }),
  })).json();
  console.log("DASHBOARD RESOURCES:");
  console.log(JSON.stringify(dash.resources, null, 2));

  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,1200"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200, deviceScaleFactor: 1 });

  // 2) 四个资源页面：标题/空态/新建按钮
  for (const t of ["domain", "knowledge", "command", "template"]) {
    await page.goto(`http://localhost:3000/resources/${t}`, { waitUntil: "networkidle2", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1200));
    const info = await page.evaluate(() => {
      const head = document.querySelector(".page-head-title, .page-title, h1");
      const empty = document.querySelector(".empty-title, .empty-state");
      const btn = Array.from(document.querySelectorAll("button")).some((b) => b.textContent.includes("新建条目"));
      const err = document.querySelector(".error, [class*=err]");
      return {
        head: head ? head.textContent.trim() : null,
        emptyTitle: empty ? empty.textContent.replace(/\s+/g, " ").trim().slice(0, 40) : null,
        newBtn: btn,
        hasError: !!err && err.textContent.trim().length > 0,
        bodyText: document.body.textContent.replace(/\s+/g, " ").slice(0, 120),
      };
    });
    console.log(`\n/resources/${t}:`, JSON.stringify(info));
  }

  // 3) 新建 + 删除流程（在知识库造一条测试数据）
  await page.goto("http://localhost:3000/resources/knowledge", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const b = btns.find((x) => x.textContent.includes("新建条目"));
    b.click();
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.type("#rr-name", "测试知识条目", { delay: 15 });
  await page.type("#rr-desc", "验证用，稍后删除", { delay: 10 });
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const b = btns.find((x) => x.textContent.trim() === "保存");
    b.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  const afterCreate = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll(".note-item b")).map((x) => x.textContent.trim());
    return items;
  });
  console.log("\nafter create items:", JSON.stringify(afterCreate));
  const hasTest = afterCreate.includes("测试知识条目");
  console.log("create OK:", hasTest);

  // 删除测试条目
  if (hasTest) {
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll(".note-item"));
      const it = items.find((x) => x.querySelector("b")?.textContent === "测试知识条目");
      const del = it?.querySelector(".task-del");
      if (del) del.click();
    });
    await new Promise((r) => setTimeout(r, 1000));
    const afterDel = await page.evaluate(() => Array.from(document.querySelectorAll(".note-item b")).map((x) => x.textContent.trim()));
    console.log("after delete items:", JSON.stringify(afterDel));
    console.log("delete OK:", !afterDel.includes("测试知识条目"));
  }

  // 4) 首页卡片截图
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  const el = await page.$('[data-od-id="card-resources"]');
  if (el) await el.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-resources-card.png" });
  const links = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-resources"]');
    return Array.from(card.querySelectorAll("a")).map((a) => ({ label: a.textContent.trim(), href: a.getAttribute("href") }));
  });
  console.log("\nCARD LINKS:", JSON.stringify(links, null, 2));

  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
