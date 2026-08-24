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
  const projs = await call("getProjects");
  console.log("排序结果:", JSON.stringify(projs.map((p) => ({ name: p.name, status: p.status }))));
  const completedIdx = projs.map((p) => p.status).lastIndexOf("已完成");
  const hasNonCompletedAfter = projs.slice(completedIdx + 1).some((p) => p.status !== "已完成");
  console.log("已完成沉底:", completedIdx >= 0 ? !hasNonCompletedAfter : "无已完成项目");

  const dash = await call("getDashboard");
  console.log("首页项目卡顺序:", JSON.stringify(dash.projects.map((p) => ({ name: p.name, status: p.status }))));
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
