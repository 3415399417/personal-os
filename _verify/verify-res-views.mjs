import puppeteer from "puppeteer-core";

(async () => {
  // 造 4 条测试数据
  const mk = (name, type, description, url) =>
    fetch("http://localhost:3000/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "createResourceEntry", payload: { name, type, description, url } }),
    }).then((r) => r.json());

  const a = await mk("外贸海关数据平台", "domain", "查美国进口数据用", "https://usatrade.census.gov");
  const b = await mk("什么是 RAG", "knowledge", "# RAG\n\n检索增强生成，**核心**是：\n- 先检索\n- 再生成\n\n> 解决幻觉问题", "");
  const c = await mk("写日报指令", "command", "你是我的日报助手。请根据以下任务完成情况生成一份日报：\n1. 按项目分组\n2. 列出今日完成与卡点\n3. 给明天建议", "");
  const d = await mk("周报模板", "template", "## 本周总结\n\n### 完成\n- \n\n### 卡点\n- \n\n### 下周计划\n- \n", "");
  console.log("created:", [a.id, b.id, c.id, d.id]);

  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,1400"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1400, deviceScaleFactor: 1 });

  // 1) 领域库：书签卡片 + 打开按钮 + 域名
  await page.goto("http://localhost:3000/resources/domain", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200));
  const dom = await page.evaluate(() => ({
    cards: document.querySelectorAll(".res-domain-card").length,
    host: document.querySelector(".res-domain-host")?.textContent?.trim(),
    openBtn: Array.from(document.querySelectorAll("a")).some((x) => x.textContent.includes("打开")),
  }));
  console.log("DOMAIN:", JSON.stringify(dom));
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-res-domain.png" });

  // 2) 知识库：点击弹窗
  await page.goto("http://localhost:3000/resources/knowledge", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200));
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll(".res-know-item"));
    if (items[0]) items[0].click();
  });
  await new Promise((r) => setTimeout(r, 800));
  const know = await page.evaluate(() => {
    const modal = Array.from(document.querySelectorAll(".modal")).find((m) => m.offsetParent !== null);
    return {
      hasModal: !!modal,
      mdRendered: modal ? !!modal.querySelector("h1, h2, h3, strong") : false,
      text: modal ? modal.textContent.replace(/\s+/g, " ").slice(0, 80) : "",
    };
  });
  console.log("KNOWLEDGE:", JSON.stringify(know));
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-res-knowledge.png" });
  // 关闭弹窗
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll(".modal button"));
    const b = btns.find((x) => x.textContent.includes("关闭"));
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 400));

  // 3) 指令库：代码块 + 复制按钮
  await page.goto("http://localhost:3000/resources/command", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200));
  const cmd = await page.evaluate(() => ({
    cards: document.querySelectorAll(".res-cmd-card").length,
    pre: !!document.querySelector(".res-cmd-body"),
    copyBtn: Array.from(document.querySelectorAll("button")).some((x) => x.textContent.includes("复制指令")),
  }));
  console.log("COMMAND:", JSON.stringify(cmd));
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-res-command.png" });

  // 4) 模板库：预览 + 复制
  await page.goto("http://localhost:3000/resources/template", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200));
  const tpl = await page.evaluate(() => ({
    cards: document.querySelectorAll(".res-tpl-card").length,
    previewBtn: Array.from(document.querySelectorAll("button")).some((x) => x.textContent.includes("预览")),
    copyBtn: Array.from(document.querySelectorAll("button")).some((x) => x.textContent.includes("复制模板")),
  }));
  console.log("TEMPLATE:", JSON.stringify(tpl));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const b = btns.find((x) => x.textContent.includes("预览"));
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-res-template.png" });

  await browser.close();

  // 清理测试数据
  for (const x of [a, b, c, d]) {
    await fetch("http://localhost:3000/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deleteResource", payload: { id: x.id } }),
    });
  }
  console.log("cleaned");
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
