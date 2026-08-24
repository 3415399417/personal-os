import puppeteer from "puppeteer-core";

(async () => {
  // 1) 找到「个人任务看板」项目 id + 卡住任务 id
  const projList = await (await fetch("http://localhost:3000/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getProjects" }),
  })).json();
  const proj = projList.find((p) => p.name === "个人任务看板");
  if (!proj) { console.log("PROJECT NOT FOUND"); process.exit(1); }
  console.log("project:", proj.id, proj.progress + "%");

  const task = proj.tasks.find((t) => t.text.includes("完善文档") || t.text.includes("部署交付"));
  console.log("target task:", task ? task.id + " " + task.text : "NOT FOUND");
  if (!task) process.exit(1);

  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,1400"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1400, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:3000/projects/${proj.id}`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));

  // 2) 展开目标任务
  const expanded = await page.evaluate((tid) => {
    const items = Array.from(document.querySelectorAll(".task-item"));
    for (const it of items) {
      const t = it.querySelector(".task-text");
      if (t && t.textContent.includes("完善文档") || t && t.textContent.includes("部署交付")) {
        it.click();
        return t.textContent.trim();
      }
    }
    return null;
  }, task.text);
  console.log("expanded:", expanded);
  await new Promise((r) => setTimeout(r, 1200));

  // 3) 反选按钮存在？
  const hasBtn = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".task-expand-actions button")).some((b) => b.textContent.includes("从实际文件反选"));
  });
  console.log("picker button exists:", hasBtn);
  if (!hasBtn) { await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-picker-fail.png" }); process.exit(1); }

  // 4) 打开弹窗
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll(".task-expand-actions button"));
    const b = btns.find((x) => x.textContent.includes("从实际文件反选"));
    b.click();
  });
  await new Promise((r) => setTimeout(r, 1500));

  const pickerState = await page.evaluate(() => {
    const modal = Array.from(document.querySelectorAll(".modal")).find((m) => m.offsetParent !== null);
    if (!modal) return { open: false };
    const items = Array.from(modal.querySelectorAll(".file-picker-item")).map((x) => x.textContent.trim());
    return {
      open: true,
      root: (modal.querySelector(".file-picker-root") || {}).textContent || "",
      count: items.length,
      sample: items.slice(0, 8),
      hasReadme: items.some((x) => x.toLowerCase().includes("readme")),
    };
  });
  console.log("picker state:", JSON.stringify(pickerState, null, 2));
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-picker-open.png" });

  // 5) 搜索 package
  await page.type(".file-picker-search", "package", { delay: 20 });
  await new Promise((r) => setTimeout(r, 500));
  const filtered = await page.evaluate(() => Array.from(document.querySelectorAll(".file-picker-item")).map((x) => x.textContent.trim()));
  console.log("filtered:", JSON.stringify(filtered));

  const clicked = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll(".file-picker-item"));
    const target = items.find((x) => x.textContent.trim().toLowerCase().includes("package.json"));
    if (!target) return false;
    target.click();
    return true;
  });
  console.log("clicked package.json:", clicked);
  await new Promise((r) => setTimeout(r, 800));

  // 6) textarea 内容
  const artsValue = await page.evaluate(() => {
    const ta = document.querySelector(".task-expand-arts");
    return ta ? ta.value : null;
  });
  console.log("artsDraft after pick:\n" + artsValue);

  // 7) 保存产物
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll(".task-expand-actions button"));
    const b = btns.find((x) => x.textContent.includes("保存产物"));
    b.click();
  });
  await new Promise((r) => setTimeout(r, 1800));
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-picker-saved.png" });

  // 8) API 验证产物命中状态
  const status = await (await fetch("http://localhost:3000/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getTaskArtifactStatus", payload: { taskId: task.id } }),
  })).json();
  console.log("artifact status:", JSON.stringify(status, null, 2));

  // 9) 修正事件是否写入（路径修正次数 +1）
  const evs = await (await fetch("http://localhost:3000/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getProgressEvents", payload: { taskId: task.id } }),
  })).json();
  console.log("recent events:", evs.slice(0, 3).map((e) => e.type + " " + e.detail));

  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
