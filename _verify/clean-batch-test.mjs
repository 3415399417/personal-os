// 删除测试残留项目 batch-test（Temp 路径，8-23 verify-batch-report 遗留）
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
  const bt = projs.find((p) => p.name === "batch-test");
  if (bt) {
    await call("deleteProject", { id: bt.id });
    console.log("deleted batch-test:", bt.id, "| tasks:", bt.tasks.length);
  } else {
    console.log("batch-test not found");
  }
  const after = await call("getProjects");
  console.log("剩余项目:", JSON.stringify(after.map((p) => p.name)));
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
