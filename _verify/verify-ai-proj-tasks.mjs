// 验证 AI 能查到项目任务
(async () => {
  const resp = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "个人任务看板这个项目里有哪些任务？分别什么状态？" }],
      model: "flash",
      pathname: "/ai",
    }),
    cache: "no-store",
  });
  const d = await resp.json();
  console.log("STATUS:", resp.status);
  console.log("CONTENT:\n" + (d.content || d.error || JSON.stringify(d).slice(0, 400)));
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
