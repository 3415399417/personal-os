import puppeteer from "puppeteer-core";

const API = "http://localhost:3000/api/data";
async function call(action, payload) {
  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  return r.json();
}

(async () => {
  // 1) 扫描结果
  const dirs = await call("scanProjectsDir");
  console.log("scan count:", dirs.length);
  console.log("imported marked:", JSON.stringify(dirs.filter((d) => d.imported).map((d) => d.name)));
  console.log("candidates:", JSON.stringify(dirs.filter((d) => !d.imported).map((d) => d.name)));

  // 2) 导入 1 个真实目录（ai-chat）验证，然后删除
  const target = dirs.find((d) => d.name === "ai-chat" && !d.imported);
  if (target) {
    const created = await call("importProjects", { inputs: [{ name: target.name, folderPath: target.folderPath, status: "completed" }] });
    console.log("imported:", JSON.stringify(created.map((p) => ({ name: p.name, status: p.status, folderPath: p.folderPath }))));

    // 3) 页面弹窗验证
    const browser = await puppeteer.launch({
      executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      headless: "new",
      args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,1200"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1200, deviceScaleFactor: 1 });
    await page.goto("http://localhost:3000/projects", { waitUntil: "networkidle2", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1800));
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const b = btns.find((x) => x.textContent.includes("导入历史项目"));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 1200));
    const ui = await page.evaluate(() => {
      const modal = Array.from(document.querySelectorAll(".modal")).find((m) => m.offsetParent !== null);
      if (!modal) return { open: false };
      return {
        open: true,
        dirs: Array.from(modal.querySelectorAll(".incubate-asset b")).map((x) => x.textContent.trim()),
        importedTags: Array.from(modal.querySelectorAll(".badge.done")).map((x) => x.textContent.trim()),
        hasAiChat: Array.from(modal.querySelectorAll(".incubate-asset b")).some((x) => x.textContent.trim() === "ai-chat"),
        aiChatDisabled: (() => {
          const items = Array.from(modal.querySelectorAll(".incubate-asset"));
          const it = items.find((x) => x.querySelector("b")?.textContent === "ai-chat");
          return it ? it.querySelector("input").disabled : null;
        })(),
      };
    });
    console.log("UI:", JSON.stringify(ui));
    await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-import-modal.png" });
    await browser.close();

    // 清理：删除刚导入的 ai-chat 项目
    const projs = await call("getProjects");
    const p = projs.find((x) => x.name === "ai-chat");
    if (p) await call("deleteProject", { id: p.id });
    console.log("cleaned ai-chat:", !!p);
  } else {
    console.log("ai-chat not found in candidates");
  }
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
