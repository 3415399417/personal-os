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
  // 1) TripAI 项目
  const projs = await call("getProjects");
  const trip = projs.find((p) => p.name.includes("TripAI"));
  console.log("TripAI 项目:", trip ? JSON.stringify({ id: trip.id, status: trip.status, progress: trip.progress }) : "未找到");
  if (!trip) process.exit(1);

  // 2) 找旧总结（复盘里 summary 含 TripAI 且是旧格式的）
  const reviews = await call("getReviews");
  const oldOnes = reviews.filter((r) => r.summary.includes("TripAI") && (r.summary.includes("任务0/0") || r.summary.includes("任务清单为空") || r.summary.includes("概念阶段")));
  console.log("旧总结条数:", oldOnes.length);
  for (const o of oldOnes) {
    await call("deleteReview", { id: o.id });
    console.log("删除旧总结:", o.id, o.title);
  }

  // 3) 新 prompt 生成
  const s = await (await fetch(`http://localhost:3000/api/project-summary?id=${trip.id}`)).json();
  console.log("\n新总结:\n" + s.summary);

  // 4) 存为新复盘（标题=项目名+年月）
  const now = new Date();
  const period = `${now.getFullYear()}年${now.getMonth() + 1}月`;
  const rv = await call("createReview", {
    title: `${trip.name} · ${period}`,
    period,
    summary: s.summary,
  });
  console.log("\n已存复盘:", rv.title, "| id:", rv.id);
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
