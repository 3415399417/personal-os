// 造一条模板数据 → 搜索验证 type → 删除
const created = await (await fetch("http://localhost:3000/api/data", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "createResourceEntry", payload: { name: "搜索验证模板", type: "template", description: "验证用" } }),
})).json();
console.log("created:", JSON.stringify(created));

const s = await (await fetch("http://localhost:3000/api/search?q=" + encodeURIComponent("搜索验证模板"))).json();
console.log("search resources:", JSON.stringify(s.results.resources));

if (created && created.id) {
  const del = await (await fetch("http://localhost:3000/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "deleteResource", payload: { id: created.id } }),
  })).json();
  console.log("deleted:", JSON.stringify(del));
}
