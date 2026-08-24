// 全站链接体检：抓取所有页面里的 <a href> 与跳转，检查是否指向存在路由（排除外部链接/API）
import puppeteer from "puppeteer-core";

const ROUTES = new Set([
  "/", "/ai", "/assets", "/github", "/inbox", "/learning", "/notes",
  "/projects", "/review", "/settings", "/stats", "/today", "/workbench",
  "/resources/domain", "/resources/knowledge", "/resources/command", "/resources/template",
]);

const PAGES = ["/", "/today", "/projects", "/learning", "/workbench", "/review", "/inbox", "/notes", "/assets", "/ai", "/settings", "/stats", "/github", "/resources/domain", "/resources/knowledge", "/resources/command", "/resources/template"];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,1000"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });

  const broken = [];
  for (const p of PAGES) {
    try {
      await page.goto(`http://localhost:3000${p}`, { waitUntil: "networkidle2", timeout: 45000 });
      await new Promise((r) => setTimeout(r, 800));
    } catch (e) {
      broken.push({ page: p, issue: "加载失败: " + e.message.slice(0, 80) });
      continue;
    }
    const links = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll("a[href]").forEach((a) => {
        const href = a.getAttribute("href");
        if (!href || href.startsWith("http") || href.startsWith("mailto") || href.startsWith("#") || href.startsWith("javascript")) return;
        out.push({ href, text: (a.textContent || "").trim().slice(0, 24) });
      });
      return out;
    });
    const seen = new Set();
    for (const l of links) {
      const key = l.href;
      if (seen.has(key)) continue;
      seen.add(key);
      const path = key.split("?")[0].split("#")[0].replace(/\/$/, "") || "/";
      const ok =
        ROUTES.has(path) ||
        /^\/projects\/[^/]+$/.test(path) ||
        /^\/resources\/(domain|knowledge|command|template)$/.test(path);
      if (!ok) {
        broken.push({ page: p, href: l.href, text: l.text, issue: "目标路由不存在" });
      }
    }
  }

  console.log(JSON.stringify(broken, null, 2));
  console.log("BROKEN COUNT:", broken.length);
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
