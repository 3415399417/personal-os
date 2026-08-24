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
  const reviews = await call("getReviews");
  // 用户测试生成的那条旧版（含"任务 0/0 完成——项目已完成，未拆分任务列表"或"建议为项目补充明确任务拆解记录"）
  const olds = reviews.filter(
    (r) => r.summary.includes("TripAI") && (r.summary.includes("未拆分任务列表") || r.summary.includes("补充明确任务拆解")),
  );
  console.log("找到旧版 TripAI 总结:", olds.length);
  for (const o of olds) {
    await call("deleteReview", { id: o.id });
    console.log("已删:", o.title, o.id, "|", o.summary.slice(0, 40));
  }
  // 确认现在 TripAI 只有一条新总结
  const after = await call("getReviews");
  const trips = after.filter((r) => r.summary.includes("TripAI"));
  console.log("现在 TripAI 相关复盘:", trips.length, JSON.stringify(trips.map((r) => ({ title: r.title, head: r.summary.slice(0, 30) }))));
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
