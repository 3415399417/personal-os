// 全页面冒烟：12 个页面 × 亮/暗两种主题，检查渲染 + console 错误 + hydration
import puppeteer from "puppeteer-core";

const PAGES = [
  { path: "/", name: "首页" },
  { path: "/today", name: "今天" },
  { path: "/projects", name: "项目列表" },
  { path: "/projects/cmt5oq7oj000e0ouvibxfdftk", name: "项目详情(真实数据)" },
  { path: "/learning", name: "学习" },
  { path: "/workbench", name: "工作台" },
  { path: "/review", name: "复盘" },
  { path: "/github", name: "GitHub情报" },
  { path: "/inbox", name: "收集箱" },
  { path: "/notes", name: "笔记" },
  { path: "/assets", name: "资产" },
  { path: "/ai", name: "AI对话" },
  { path: "/settings", name: "设置" },
  { path: "/stats", name: "统计" },
];

async function runTheme(browser, theme, results) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.evaluateOnNewDocument((t) => {
    localStorage.setItem("theme", t);
  }, theme);

  for (const p of PAGES) {
    const errors = [];
    const onErr = (msg) => {
      // 只算 error / pageerror，忽略 info/log（React DevTools 提示等）和无害 404
      if (msg.type() !== "error") return;
      const t = msg.text();
      if (/404|Failed to load resource/i.test(t)) return;
      errors.push(`[error] ${t.slice(0, 200)}`);
    };
    page.on("console", onErr);
    page.on("pageerror", (e) => errors.push(`[pageerror] ${String(e.message).slice(0, 200)}`));
    try {
      await page.goto(`http://127.0.0.1:3000${p.path}`, { waitUntil: "networkidle2", timeout: 45000 });
      await new Promise((r) => setTimeout(r, 1200));
      const state = await page.evaluate(() => ({
        app: !!document.querySelector(".app"),
        bodyBg: getComputedStyle(document.body).backgroundColor,
        theme: document.documentElement.dataset.theme ?? null,
      }));
      const ok = state.app && errors.length === 0;
      results.push({
        theme, page: p.name, ok,
        detail: `${state.app ? "渲染✓" : "空✗"} bg=${state.bodyBg} theme=${state.theme} ${errors.length ? "| " + errors.join(" || ") : ""}`,
      });
    } catch (e) {
      results.push({ theme, page: p.name, ok: false, detail: `加载异常: ${e.message.slice(0, 120)}` });
    }
    page.off("console", onErr);
    page.off("pageerror", onErr);
  }
  await page.close();
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const results = [];
  await runTheme(browser, "light", results);
  await runTheme(browser, "dark", results);

  let pass = 0, fail = 0;
  for (const r of results) {
    r.ok ? pass++ : fail++;
    console.log(`${r.ok ? "✅" : "❌"} [${r.theme}] ${r.page}: ${r.detail}`);
  }
  console.log(`\n结果：${pass} 通过，${fail} 失败 / ${results.length}`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
