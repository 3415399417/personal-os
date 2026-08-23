// 浜や簰楠岃瘉锛圧eact state 鐗堬級锛氶棶鍊欏姩鎬?寰呭姙鍕鹃€?鏂板缓/閫氱煡/鈱楰/瀵艰埅楂樹寒/绉诲姩鎶藉眽/杩涘害鏉″姩鐢?import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";

const EDGE_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const EDGE = EDGE_CANDIDATES.find(existsSync);
const BASE = process.env.APP_URL ?? "http://localhost:3000/";

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ["--no-sandbox", "--disable-gpu"] });
let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " 鈫?" + detail : ""}`);
};

try {
  // 鈹€鈹€ 妗岄潰绔?鈹€鈹€
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(BASE, { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200));

  // 1. 闂€欏姩鎬佸寲
  const greeting = await page.evaluate(() => ({
    date: document.querySelector(".greet-date")?.textContent ?? "",
    week: document.querySelector(".greet-week")?.textContent ?? "",
    title: document.querySelector(".greet-title")?.textContent ?? "",
  }));
  const now = new Date();
  const weekdays = ["鏄熸湡鏃?, "鏄熸湡涓€", "鏄熸湡浜?, "鏄熸湡涓?, "鏄熸湡鍥?, "鏄熸湡浜?, "鏄熸湡鍏?];
  check("闂€欐棩鏈?, greeting.date === `${now.getMonth() + 1}鏈?{now.getDate()}鏃, greeting.date);
  check("闂€欐槦鏈?, greeting.week === weekdays[now.getDay()], greeting.week);
  check("闂€欒", ["鏃╀笂濂?, "涓崍濂?, "涓嬪崍濂?, "鏅氫笂濂?, "澶滄繁浜?].includes(greeting.title), greeting.title);

  // 2. 寰呭姙鍕鹃€夊垏鎹?  const firstTodo = await page.$(".todo-item");
  const before = await page.evaluate(() => document.querySelector(".todo-item")?.getAttribute("aria-checked"));
  await firstTodo.click();
  await new Promise((r) => setTimeout(r, 200));
  const after = await page.evaluate(() => document.querySelector(".todo-item")?.getAttribute("aria-checked"));
  check("寰呭姙鍕鹃€夊垏鎹?, before !== after, `${before} 鈫?${after}`);
  await firstTodo.click(); // 杩樺師

  // 3. 鏂板缓寰呭姙锛堝洖杞︽坊鍔狅級
  await page.click('[aria-label="鏂板缓寰呭姙"]');
  await new Promise((r) => setTimeout(r, 200));
  await page.type('input[placeholder="杈撳叆寰呭姙锛屽洖杞︽坊鍔?]', "楠屾敹娴嬭瘯寰呭姙");
  await page.keyboard.press("Enter");
  await new Promise((r) => setTimeout(r, 200));
  const added = await page.evaluate(() =>
    [...document.querySelectorAll(".todo-item")].some((b) => b.getAttribute("aria-label")?.includes("楠屾敹娴嬭瘯寰呭姙")),
  );
  check("鏂板缓寰呭姙鍥炶溅娣诲姞", added);

  // 4. 閫氱煡闈㈡澘寮€鍚?+ 鍏ㄩ儴宸茶
  await page.click("#bellBtn");
  await new Promise((r) => setTimeout(r, 200));
  const popOpen = await page.evaluate(() => document.querySelector("#bellPop")?.classList.contains("open"));
  check("閫氱煡闈㈡澘鎵撳紑", popOpen);
  const dotVisible = await page.evaluate(() => {
    const dot = document.querySelector(".bell-dot");
    return dot ? getComputedStyle(dot).display !== "none" : false;
  });
  await page.click(".bell-pop-head button");
  await new Promise((r) => setTimeout(r, 200));
  const dotHidden = await page.evaluate(() => {
    const dot = document.querySelector(".bell-dot");
    return dot ? getComputedStyle(dot).display === "none" : false;
  });
  check("鍏ㄩ儴宸茶闅愯棌绾㈢偣", dotVisible && dotHidden);
  await page.click("body");
  await new Promise((r) => setTimeout(r, 200));

  // 5. 鈱楰 鑱氱劍鎼滅储
  await page.keyboard.down("Control");
  await page.keyboard.press("KeyK");
  await page.keyboard.up("Control");
  await new Promise((r) => setTimeout(r, 200));
  const searchFocused = await page.evaluate(() => document.activeElement?.id === "globalSearch");
  check("鈱楰 鑱氱劍鎼滅储", searchFocused);

  // 6. 杩涘害鏉″姩鐢诲畬鎴愶紙鍒濆 0 鈫?data-w锛?  const progressW = await page.evaluate(() => {
    const i = document.querySelector(".proj-list .progress i");
    return i ? i.style.width : "";
  });
  check("杩涘害鏉″姩鐢?, progressW === "60%", progressW);

  // 7. 瀵艰埅楂樹寒锛堢偣鍑?椤圭洰"锛?  await page.click('[data-od-id="nav-projects"]');
  await new Promise((r) => setTimeout(r, 300));
  const navActive = await page.evaluate(() => document.querySelector(".nav-link.active")?.getAttribute("data-od-id"));
  check("瀵艰埅楂樹寒", navActive === "nav-projects", navActive);

  // 8. 涓€灞忔棤婊氬姩锛堟闈㈡。锛?  const noScroll = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);
  check("妗岄潰涓€灞忔棤婊氬姩", noScroll);

  await page.close();

  // 鈹€鈹€ 绉诲姩绔娊灞?鈹€鈹€
  const mpage = await browser.newPage();
  await mpage.setViewport({ width: 390, height: 844 });
  await mpage.goto(BASE, { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200));
  const drawerClosed = await mpage.evaluate(() => !document.querySelector(".sidebar")?.classList.contains("open"));
  await mpage.click("#menuBtn");
  await new Promise((r) => setTimeout(r, 400));
  const drawerOpened = await mpage.evaluate(() => document.querySelector(".sidebar")?.classList.contains("open"));
  check("绉诲姩绔娊灞夊紑鍚?, drawerClosed && drawerOpened);
  await mpage.close();
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nALL INTERACTIONS PASS" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
