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
  // 1) 新 prompt 的总结效果（AI-PPT生成器：已完成 + 有档案）
  const projs = await call("getProjects");
  const ppt = projs.find((p) => p.name.includes("AI-PPT"));
  const s = await (await fetch(`http://localhost:3000/api/project-summary?id=${ppt.id}`)).json();
  console.log("新总结:\n" + s.summary);

  // 2) createReview 带 title → 存储验证 → 删除
  const rv = await call("createReview", {
    title: "测试项目 · 2026年8月",
    period: "2026年8月",
    summary: "验证标题存储",
  });
  console.log("createReview 返回 title:", rv.title);
  const reviews = await call("getReviews");
  const found = reviews.find((r) => r.id === rv.id);
  console.log("getReviews 显示 title:", found?.title, "| period:", found?.period);
  await call("deleteReview", { id: rv.id });
  const after = await call("getReviews");
  console.log("删除后存在:", after.some((r) => r.id === rv.id));
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
