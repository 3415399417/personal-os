// 验证：最近沉淀卡片 - 类型标签 + 今日高亮
import puppeteer from "puppeteer-core";

const BASE = "http://127.0.0.1:3000";

async function callData(action, payload) {
  const resp = await fetch(`${BASE}/api/data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  return resp.json();
}

(async () => {
  // 造一条今天的笔记 + 一条灵感类型笔记（用于验证标签渲染）
  const n1 = await callData("createNote", { title: "today-test-高亮验证", content: "x", type: "灵感" });
  const n2 = await callData("createNote", { title: "yesterday-test-标签验证", content: "x", type: "复盘" });
  // 把 n2 改成昨天创建（node:sqlite 直改，只动测试数据）
  const { execSync } = await import("node:child_process");
  const script = `
    const { DatabaseSync } = require("node:sqlite");
    const db = new DatabaseSync("E:/我的项目/personal-os/dev.db");
    const old = new Date(Date.now() - 86400000).toISOString();
    const r = db.prepare("UPDATE Note SET createdAt = ? WHERE id = ?").run(old, ${JSON.stringify(n2?.id)});
    console.log("patched:", r.changes);
    db.close();
  `;
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  const sp = path.join(os.tmpdir(), "patch-note.cjs");
  fs.writeFileSync(sp, script);
  try { execSync(`node "${sp}"`, { encoding: "utf8", stdio: "inherit" }); } catch (e) { console.error("patch fail:", e.message); }
  fs.rmSync(sp, { force: true });

  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3500));

  const state = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-notes"]');
    if (!card) return null;
    const items = Array.from(card.querySelectorAll(".note-item")).slice(0, 3).map((li) => ({
      text: li.textContent,
      today: li.classList.contains("note-today"),
      tag: li.querySelector(".note-type-tag")?.textContent ?? null,
    }));
    return items;
  });
  console.log(JSON.stringify(state, null, 2));

  const hasTag = (state ?? []).some((i) => i.tag);
  const todayHighlighted = (state ?? []).some((i) => i.today && i.text.includes("today-test"));
  const ok = hasTag && todayHighlighted;
  console.log(ok ? "✅ 类型标签 + 今日高亮都生效" : "❌ " + JSON.stringify({ hasTag, todayHighlighted }));

  await browser.close();
  // 清理测试笔记
  await callData("deleteNote", { id: n1?.id });
  await callData("deleteNote", { id: n2?.id });
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
