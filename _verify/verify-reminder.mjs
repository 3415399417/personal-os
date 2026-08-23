// 验证系统提醒：新建（今天/明天+时间）→ 列表左任务右时间 → 删除 → 到点弹窗提醒
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

// 清理遗留测试提醒
const old = await api("getReminders", null);
for (const r of old) {
  if (r.title.startsWith("[测试]")) await api("deleteReminder", { id: r.id });
}

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1000);

  /* ── 1. 侧边栏有「新建」按钮，展开表单 ── */
  const hasNewBtn = await page.evaluate(() => {
    const sec = document.querySelector('[data-od-id="sidebar-reminders"]');
    return sec ? [...sec.querySelectorAll("button")].some((b) => b.textContent.includes("新建")) : false;
  });
  check("系统提醒卡片有「新建」按钮", hasNewBtn);

  await page.evaluate(() => {
    const sec = document.querySelector('[data-od-id="sidebar-reminders"]');
    [...sec.querySelectorAll("button")].find((b) => b.textContent.includes("新建")).click();
  });
  await sleep(400);
  const formOk = await page.evaluate(() => {
    const sec = document.querySelector('[data-od-id="sidebar-reminders"]');
    const txt = sec.textContent;
    return txt.includes("今天") && txt.includes("明天") && !!sec.querySelector("input[type=time]");
  });
  check("表单含今天/明天切换和时间选择", formOk);

  /* ── 2. 填写并保存（明天 09:00） ── */
  await page.type('[data-od-id="sidebar-reminders"] input.input', "[测试]明天早会准备");
  await page.evaluate(() => {
    const sec = document.querySelector('[data-od-id="sidebar-reminders"]');
    [...sec.querySelectorAll(".remind-day-tab")].find((b) => b.textContent === "明天").click();
  });
  await sleep(200);
  await page.evaluate(() => {
    const sec = document.querySelector('[data-od-id="sidebar-reminders"]');
    const ti = sec.querySelector("input[type=time]");
    ti.value = "09:00";
    ti.dispatchEvent(new Event("input", { bubbles: true }));
    ti.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sleep(200);
  await page.evaluate(() => {
    const sec = document.querySelector('[data-od-id="sidebar-reminders"]');
    [...sec.querySelectorAll("button")].find((b) => b.textContent.trim() === "保存提醒").click();
  });
  await sleep(900);

  // 列表显示：左任务右时间
  const listOk = await page.evaluate(() => {
    const sec = document.querySelector('[data-od-id="sidebar-reminders"]');
    const li = [...sec.querySelectorAll(".remind-item")].find((x) => x.textContent.includes("[测试]明天早会准备"));
    if (!li) return "li not found";
    const main = li.querySelector(".remind-main");
    const time = li.querySelector(".remind-time");
    const mainRight = main.getBoundingClientRect().right;
    const timeLeft = time.getBoundingClientRect().left;
    return mainRight <= timeLeft && time.textContent.includes("明天") && time.textContent.includes("09:00")
      ? "ok"
      : `layout=${mainRight}<=${timeLeft} time=${time.textContent}`;
  });
  check("列表项：左边任务、右边「明天 09:00」", listOk === "ok", listOk);

  // API 确认 remindAt 是明天
  const after = await api("getReminders", null);
  const tomorrowRm = after.find((r) => r.title === "[测试]明天早会准备");
  const isTomorrow = (() => {
    if (!tomorrowRm?.remindAt) return false;
    const d = new Date(tomorrowRm.remindAt);
    const now = new Date();
    const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
    return diff === 1 && d.getHours() === 9 && d.getMinutes() === 0;
  })();
  check("数据库 remindAt = 明天 09:00", isTomorrow, tomorrowRm?.remindAt);

  /* ── 3. 删除提醒 ── */
  await page.evaluate(() => {
    const sec = document.querySelector('[data-od-id="sidebar-reminders"]');
    const li = [...sec.querySelectorAll(".remind-item")].find((x) => x.textContent.includes("[测试]明天早会准备"));
    const btn = li.querySelector(".task-del");
    const r = btn.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }).then(async (pos) => {
    if (pos) {
      await page.mouse.move(pos.x, pos.y);
      await page.mouse.click(pos.x, pos.y);
    }
  });
  await sleep(900);
  const deleted = await page.evaluate(() => {
    const sec = document.querySelector('[data-od-id="sidebar-reminders"]');
    return !sec.textContent.includes("[测试]明天早会准备");
  });
  check("hover 删除按钮可移除提醒", deleted);

  /* ── 4. 到点提醒：设置 30 秒后触发 ── */
  const soon = new Date(Date.now() + 30 * 1000);
  await api("createReminder", {
    title: "[测试]到点提醒验证",
    content: "系统提醒",
    remindAt: soon.toISOString(),
  });
  await page.evaluate(() => {
    window.dispatchEvent(new Event("betterlife:data-changed"));
  });
  await sleep(600);

  // 等待轮询触发（15 秒间隔 + 余量），最多等 60 秒
  let triggered = false;
  for (let i = 0; i < 8; i++) {
    await sleep(8000);
    const res = await page.evaluate(() => {
      const modal = [...document.querySelectorAll(".modal")].find((m) => m.textContent.includes("到点提醒验证"));
      const sec = document.querySelector('[data-od-id="sidebar-reminders"]');
      const li = [...(sec?.querySelectorAll(".remind-item") ?? [])].find((x) => x.textContent.includes("到点提醒验证"));
      return {
        modal: !!modal,
        done: li?.classList.contains("done") ?? false,
        label: li?.querySelector(".remind-main em")?.textContent ?? "",
      };
    });
    if (res.modal || res.done) {
      triggered = true;
      check("到点后弹出提醒弹窗", res.modal, JSON.stringify(res));
      // 等待异步刷新：状态标记 done → 列表重新渲染
      let doneState = res.done;
      for (let j = 0; j < 6 && !doneState; j++) {
        await sleep(2000);
        doneState = await page.evaluate(() => {
          const sec = document.querySelector('[data-od-id="sidebar-reminders"]');
          const li = [...(sec?.querySelectorAll(".remind-item") ?? [])].find((x) => x.textContent.includes("到点提醒验证"));
          return li?.classList.contains("done") ?? false;
        });
      }
      check("提醒状态变为已提醒（置灰）", doneState);
      break;
    }
  }
  if (!triggered) check("到点后弹出提醒弹窗", false, "60 秒内未触发");

  // 关闭弹窗
  await page.evaluate(() => {
    [...document.querySelectorAll(".modal button")].find((b) => b.textContent.includes("知道了"))?.click();
  });

  await page.screenshot({ path: "_verify/reminder-final.png" });
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}

/* 清理 */
const all = await api("getReminders", null);
for (const r of all) {
  if (r.title.startsWith("[测试]")) await api("deleteReminder", { id: r.id });
}
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
