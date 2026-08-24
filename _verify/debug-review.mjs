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
  console.log("复盘总数:", reviews.length);
  console.log(JSON.stringify(reviews.map((r) => ({ title: r.title, date: r.date, summary: r.summary.slice(0, 300) })), null, 2));
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
