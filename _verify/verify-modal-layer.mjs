// 验证：文件夹弹窗中点击笔记 → 查看弹窗置顶（不被文件夹弹窗遮挡）
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";

const EDGE_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const EDGE = EDGE_CANDIDATES.find(existsSync);
const BASE = "http://localhost:3000";
const api = (action, payload) =>
  fetch(`${BASE}/api/data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  }).then((r) => r.json());

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ["--no-sandbox", "--disable-gpu"] });
let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " -> " + detail : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const proj = await api("createProject", { name: "层级测试项目", status: "active" });
const pid = proj.id;
await api("createNote", { title: "[层级]笔记A", content: "层级A内容", type: "笔记", projectId: pid });
await api("createNote", { title: "[层级]笔记B", content: "层级B内容", type: "笔记", projectId: pid });

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/notes`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1800);

  // 打开文件夹
  await page.evaluate(() => {
    [...document.querySelectorAll(".mini-card")].find((c) => c.textContent.includes("层级测试项目")).click();
  });
  await sleep(600);

  // 点笔记 A 打开查看
  await page.evaluate(() => {
    const modal = [...document.querySelectorAll(".modal")].find((m) => m.textContent.includes("层级测试项目"));
    [...modal.querySelectorAll(".note-item")].find((li) => li.textContent.includes("[层级]笔记A")).click();
  });
  await sleep(600);

  // 检查两个弹窗的 z-index 与叠放顺序：查看弹窗应在顶层
  const layers = await page.evaluate(() => {
    const masks = [...document.querySelectorAll(".modal-mask")];
    return masks.map((m) => {
      const modal = m.querySelector(".modal");
      const cs = getComputedStyle(m);
      const mc = modal ? getComputedStyle(modal) : null;
      return {
        z: cs.zIndex,
        cls: m.className,
        text: modal ? (modal.textContent || "").slice(0, 20) : "",
        rect: modal ? { top: Math.round(modal.getBoundingClientRect().top), left: Math.round(modal.getBoundingClientRect().left) } : null,
      };
    });
  });
  console.log("layers:", JSON.stringify(layers, null, 2));

  // 查看弹窗（note-modal-top 类）z-index 应为 70，文件夹弹窗为 60
  const view = layers.find((l) => l.cls.includes("note-modal-top"));
  const folder = layers.find((l) => !l.cls.includes("note-modal-top"));
  check("查看弹窗 z-index = 70", view?.z === "70", view?.z);
  check("文件夹弹窗 z-index = 60", folder?.z === "60", folder?.z);
  check("查看弹窗可见（不被遮挡）", !!view, "view not found");

  // 视觉验证：查看弹窗中心点应可点击到（elementFromPoint 应为查看弹窗内容）
  const hitTest = await page.evaluate(() => {
    const viewModal = [...document.querySelectorAll(".modal-mask")].find((m) => m.textContent.includes("层级A内容"));
    const r = viewModal.getBoundingClientRect();
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    const el = document.elementFromPoint(cx, cy);
    const inView = el ? (el.closest(".modal")?.textContent ?? "").includes("层级A内容") : false;
    return { cx: Math.round(cx), cy: Math.round(cy), inView };
  });
  console.log("hit test:", JSON.stringify(hitTest));
  check("点击中心命中查看弹窗（未被遮挡）", hitTest.inView);

  await page.screenshot({ path: "_verify/modal-layer-final.png" });
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}

/* 清理 */
await api("deleteProject", { id: pid });
const notes = await api("getNotes", null);
for (const n of notes.filter((x) => x.title.startsWith("[层级]"))) {
  await api("deleteNote", { id: n.id });
}
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
