// 验证：首页无 hover 垃圾桶 + 详情页删除项目（确认弹窗 → 删除 → 跳转）
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";

const EDGE_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const EDGE = EDGE_CANDIDATES.find(existsSync);
const BASE = "http://localhost:3000";

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ["--no-sandbox", "--disable-gpu"] });
let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " -> " + detail : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 建一个测试项目
const resp = await fetch(`${BASE}/api/data`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "createProject", payload: { name: "删除测试项目", status: "active" } }),
});
const created = await resp.json();
const pid = created.id;
console.log("created test project:", pid);

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. 首页 hover 项目行：不应出现 .task-del 垃圾桶
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(900);
  const projCard = await page.evaluate(() => {
    const items = [...document.querySelectorAll(".proj-list li")];
    return items.map((li) => li.textContent.trim());
  });
  check("首页项目列表包含测试项目", projCard.some((t) => t.includes("删除测试项目")), projCard.join(" | "));
  const hovered = await page.evaluate(async () => {
    const li = [...document.querySelectorAll(".proj-list li")].find((x) => x.textContent.includes("删除测试项目"));
    if (!li) return null;
    const rect = li.getBoundingClientRect();
    // 真实鼠标移到项目行上
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  });
  if (hovered) {
    await page.mouse.move(hovered.x, hovered.y);
    await sleep(400);
    const delVisible = await page.evaluate(() => {
      const li = [...document.querySelectorAll(".proj-list li")].find((x) => x.textContent.includes("删除测试项目"));
      const btn = li?.querySelector(".task-del");
      if (!btn) return "no button";
      const st = getComputedStyle(btn);
      return `opacity=${st.opacity}`;
    });
    check("首页 hover 无垃圾桶按钮（重影消除）", delVisible === "no button", String(delVisible));
  } else {
    check("首页 hover 无垃圾桶按钮（重影消除）", false, "未找到测试项目行");
  }

  // 2. 进详情页：有删除项目按钮
  await page.goto(`${BASE}/projects/${pid}`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(800);
  const delBtn = await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")];
    return btns.find((b) => b.textContent.includes("删除项目")) ? true : false;
  });
  check("详情页有「删除项目」按钮", delBtn);

  // 3. 点删除 → 弹确认框
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")];
    btns.find((b) => b.textContent.includes("删除项目")).click();
  });
  await sleep(500);
  const modalShown = await page.evaluate(() => {
    const modal = [...document.querySelectorAll(".modal, [class*=modal]")].find((m) => m.textContent.includes("删除项目") && m.textContent.includes("不可恢复"));
    return !!modal;
  });
  check("点击后弹出确认弹窗（含不可恢复提示）", modalShown);

  // 4. 点取消 → 项目还在
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")];
    btns.find((b) => b.textContent.trim() === "取消").click();
  });
  await sleep(400);
  const stillThere = await page.evaluate(() => document.body.textContent.includes("删除测试项目"));
  check("取消后项目仍在", stillThere);

  // 5. 再删除 → 确认 → 跳转项目列表页，项目消失
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")];
    btns.find((b) => b.textContent.includes("删除项目")).click();
  });
  await sleep(400);
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")];
    btns.find((b) => b.textContent.trim() === "删除").click();
  });
  await sleep(1200);
  const url = page.url();
  check("确认后跳转到 /projects", url.includes("/projects"), url);
  const gone = await page.evaluate(() => !document.body.textContent.includes("删除测试项目"));
  check("列表页不再显示该项目", gone);

  // 6. API 确认数据库已删
  const dash = await fetch(`${BASE}/api/data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getDashboard", payload: null }),
  }).then((r) => r.json());
  check("API 确认项目已从数据库删除", !dash.projects.some((p) => p.id === pid));

  await page.screenshot({ path: "_verify/del-flow-final.png" });
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
