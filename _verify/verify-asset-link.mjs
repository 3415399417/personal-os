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
  // 1) 造指令/模板资源（带"AI客服/React"关键词，测推荐）
  const cmd1 = await call("createResourceEntry", { name: "AI客服系统架构分析", type: "command", description: "分析 AI 客服系统的架构：对话流程、知识库检索、人工接管" });
  const cmd2 = await call("createResourceEntry", { name: "写日报指令", type: "command", description: "按项目分组生成日报" });
  const tpl1 = await call("createResourceEntry", { name: "React项目规划模板", type: "template", description: "React 项目：需求/技术选型/目录结构/里程碑" });
  const tpl2 = await call("createResourceEntry", { name: "周报模板", type: "template", description: "本周完成/问题/下周计划" });
  console.log("created assets:", [cmd1.id, cmd2.id, tpl1.id, tpl2.id]);

  // 2) 文档孵化 → 推荐资产
  const doc = "开发一个AI客服系统：前端用React，后端对接大模型，支持知识库检索和人工接管。";
  const inc = await fetch("http://localhost:3000/api/incubate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ docText: doc }),
  }).then((r) => r.json());
  console.log("incubate ok:", inc.ok, "| plan:", inc.plan?.name, "| tasks:", inc.plan?.tasks?.length);
  console.log("recommended assets:", JSON.stringify(inc.assets, null, 2));
  const recIds = [...(inc.assets?.commands ?? []).map((a) => a.id), ...(inc.assets?.templates ?? []).map((a) => a.id)];
  console.log("推荐命中测试资源:", recIds.includes(cmd1.id) || recIds.includes(tpl1.id) ? "✅" : "❌(没匹配到造的数据，看上面实际推荐)");

  // 3) 创建项目并关联勾选的资产
  const picked = recIds.length ? recIds.slice(0, 2) : [cmd1.id];
  const created = await call("createProjectWithTasks", {
    name: "验证关联项目",
    desc: "阶段A验证用",
    tasks: [{ title: "搭建前端", group: "must", artifacts: [] }],
    resources: picked,
  });
  const projId = created.project?.id;
  console.log("created project:", projId, "| picked:", picked.length);

  // 4) 项目详情页关联资产区块
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,1400"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1400, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:3000/projects/${projId}`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));
  const detail = await page.evaluate(() => {
    const sections = Array.from(document.querySelectorAll(".panel"));
    const sec = sections.find((s) => s.textContent.includes("关联资产"));
    if (!sec) return { found: false };
    return {
      found: true,
      items: Array.from(sec.querySelectorAll(".note-item b")).map((x) => x.textContent.trim()),
      badges: Array.from(sec.querySelectorAll(".badge")).map((x) => x.textContent.trim()),
    };
  });
  console.log("项目详情页关联资产:", JSON.stringify(detail));
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-proj-assets.png" });

  // 5) 资源页显示关联项目标签
  await page.goto("http://localhost:3000/resources/command", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  const resTag = await page.evaluate(() => {
    const tags = Array.from(document.querySelectorAll(".res-proj-tag")).map((x) => x.textContent.trim());
    return tags;
  });
  console.log("指令库关联标签:", JSON.stringify(resTag));
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-res-projtag.png" });

  // 6) 新建弹窗有项目下拉
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const b = btns.find((x) => x.textContent.includes("新建条目"));
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 600));
  const hasSelect = await page.evaluate(() => !!document.querySelector("#rr-proj"));
  console.log("新建弹窗项目下拉:", hasSelect);
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-res-modal-proj.png" });

  await browser.close();

  // 7) 清理
  for (const id of [cmd1.id, cmd2.id, tpl1.id, tpl2.id]) await call("deleteResource", { id });
  if (projId) await call("deleteProject", { id: projId }).catch(() => {});
  console.log("cleaned");
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
