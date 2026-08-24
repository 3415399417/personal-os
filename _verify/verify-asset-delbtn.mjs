// 快速验证：关联资产区块的解除按钮存在
const API = "http://localhost:3000/api/data";
async function call(action, payload) {
  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  return r.json();
}
import puppeteer from "puppeteer-core";

(async () => {
  const res = await call("createResourceEntry", { name: "按钮验证资源", type: "command", description: "x" });
  const proj = await call("createProjectWithTasks", {
    name: "按钮验证项目",
    desc: "x",
    tasks: [{ title: "t", group: "must" }],
    resources: [res.id],
  });
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,900"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:3000/projects/${proj.project.id}`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1800));
  const info = await page.evaluate(() => {
    const sec = Array.from(document.querySelectorAll(".panel")).find((s) => s.textContent.includes("关联资产"));
    if (!sec) return { found: false };
    return {
      found: true,
      delBtns: sec.querySelectorAll(".task-del").length,
      delTitles: Array.from(sec.querySelectorAll(".task-del")).map((b) => b.getAttribute("title")),
    };
  });
  console.log("关联资产区块:", JSON.stringify(info));
  const el = await page.$(".panel");
  if (el) {
    const sec = await page.evaluateHandle(() => Array.from(document.querySelectorAll(".panel")).find((s) => s.textContent.includes("关联资产")));
    const asEl = await sec.asElement();
    if (asEl) await asEl.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-proj-assets2.png" });
  }
  await browser.close();
  await call("deleteResource", { id: res.id });
  await call("deleteProject", { id: proj.project.id }).catch(() => {});
  console.log("cleaned");
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
