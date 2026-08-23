// Phase 1 交互验收：问候/待办勾选/新建/通知/导航高亮/⌘K/移动端抽屉
import puppeteer from "puppeteer-core";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ["--no-sandbox"] });

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " → " + detail : ""}`);
};

try {
  // ── 桌面端交互 ──
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle0", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 800));

  // 1. 问候动态化
  const greeting = await page.evaluate(() => ({
    date: document.querySelector(".greet-date")?.textContent ?? "",
    title: document.querySelector(".greet-title")?.textContent ?? "",
  }));
  const now = new Date();
  check("问候日期", greeting.date === `${now.getMonth() + 1}月${now.getDate()}日`, greeting.date);
  check("问候语", ["早上好", "中午好", "下午好", "晚上好", "夜深了"].includes(greeting.title), greeting.title);

  // 2. 待办勾选切换
  const firstTodo = await page.$(".todo-item");
  const checkedBefore = await page.evaluate(() => document.querySelector(".todo-item")?.getAttribute("aria-checked"));
  await firstTodo.click();
  await new Promise((r) => setTimeout(r, 200));
  const checkedAfter = await page.evaluate(() => document.querySelector(".todo-item")?.getAttribute("aria-checked"));
  check("待办勾选切换", checkedBefore !== checkedAfter, `${checkedBefore} → ${checkedAfter}`);
  // 还原
  await firstTodo.click();

  // 3. 待办新建
  await page.evaluate(() => document.querySelector('[aria-label="新建待办"]')?.click());
  await new Promise((r) => setTimeout(r, 300));
  const inputVisible = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll("input")];
    return inputs.some((i) => i.placeholder === "输入待办，回车添加" && i.offsetParent !== null);
  });
  check("新建待办输入框出现", inputVisible);
  await page.type('input[placeholder="输入待办，回车添加"]', "验收测试待办");
  await page.keyboard.press("Enter");
  await new Promise((r) => setTimeout(r, 300));
  const added = await page.evaluate(() =>
    [...document.querySelectorAll(".todo-item")].some((b) => b.getAttribute("aria-label")?.includes("验收测试待办")),
  );
  check("新建待办回车添加", added);
  // 清理验收待办
  await page.evaluate(() => {
    const todos = JSON.parse(localStorage.getItem("betterlife-home-todos") ?? "[]");
    localStorage.setItem(
      "betterlife-home-todos",
      JSON.stringify(todos.filter((t) => !["验收测试待办", "调试待办XYZ"].includes(t.text))),
    );
  });

  // 4. 通知面板
  await page.evaluate(() => document.querySelector("[aria-label=通知]")?.click());
  await new Promise((r) => setTimeout(r, 200));
  const bellOpen = await page.evaluate(() => document.querySelector("[role=region][aria-label='通知列表']")?.offsetParent !== null);
  check("通知面板打开", bellOpen);
  await page.evaluate(() => document.querySelector("[aria-label=通知]")?.click());

  // 5. 导航跳转 + 高亮
  await page.evaluate(() => [...document.querySelectorAll("nav a")].find((a) => a.textContent?.includes("项目"))?.click());
  await new Promise((r) => setTimeout(r, 600));
  const onProjects = await page.evaluate(() => location.pathname === "/projects");
  const activeText = await page.evaluate(() => document.querySelector("nav a[aria-current=page]")?.textContent?.trim() ?? "");
  check("导航跳转 /projects", onProjects, onProjects ? "/projects" : `path=${await page.evaluate(() => location.pathname)}`);
  check("导航高亮跟随", activeText.includes("项目"), activeText);
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle0" });

  // 6. 占位页返回链接
  await page.goto("http://localhost:3000/review", { waitUntil: "networkidle0" });
  const placeholderText = await page.evaluate(() => document.body.textContent?.includes("开发中") ?? false);
  check("占位页文案", placeholderText);
  await page.evaluate(() => [...document.querySelectorAll("a")].find((a) => a.textContent?.includes("返回首页"))?.click());
  await new Promise((r) => setTimeout(r, 600));
  check("占位页返回首页", await page.evaluate(() => location.pathname === "/"));
  await page.close();

  // ── 移动端抽屉 ──
  const mob = await browser.newPage();
  await mob.setViewport({ width: 390, height: 844 });
  await mob.goto("http://localhost:3000/", { waitUntil: "networkidle0", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 800));
  const drawerClosed = await mob.evaluate(() => {
    const aside = document.querySelector("aside");
    return aside ? aside.getBoundingClientRect().right <= 0 : true;
  });
  check("移动端抽屉默认关闭", drawerClosed);
  await mob.evaluate(() => document.querySelector("#menuBtn")?.click());
  await new Promise((r) => setTimeout(r, 400));
  const drawerOpen = await mob.evaluate(() => {
    const aside = document.querySelector("aside");
    const rect = aside ? aside.getBoundingClientRect() : null;
    return rect ? rect.left >= 0 && rect.width > 100 : false;
  });
  check("移动端抽屉打开", drawerOpen);
  await mob.close();
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nALL INTERACTION CHECKS PASS" : `\n${failures} INTERACTION CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
