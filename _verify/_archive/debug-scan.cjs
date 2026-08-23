// debug: 检查 scanProject 数据流
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE = "http://127.0.0.1:3000";
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "dbg-scan-"));

async function callData(action, payload) {
  const resp = await fetch(`${BASE}/api/data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  return resp.json();
}

// 1. 建项目
const d1 = await callData("createProjectWithTasks", {
  name: "dbg-scan",
  desc: "",
  folderPath: TMP,
  tasks: [{ title: "t1", group: "must", artifacts: [{ type: "file", path: "src/app.ts" }] }],
});
console.log("project:", d1?.project?.id, "tasks:", JSON.stringify(d1?.tasks ?? []));

// 2. getProject 看 artifacts 字段
const gp = await callData("getProject", { id: d1?.project?.id });
console.log("getProject tasks:", JSON.stringify(gp?.tasks ?? [], null, 2));

// 3. 建文件 + 扫描
fs.mkdirSync(path.join(TMP, "src"), { recursive: true });
fs.writeFileSync(path.join(TMP, "src", "app.ts"), "x");
const s1 = await callData("scanProject", { projectId: d1?.project?.id });
console.log("scan:", JSON.stringify(s1, null, 2));

// 4. getProject 再看
const gp2 = await callData("getProject", { id: d1?.project?.id });
console.log("after scan tasks:", JSON.stringify(gp2?.tasks ?? [], null, 2));

await callData("deleteProject", { id: d1?.project?.id });
fs.rmSync(TMP, { recursive: true, force: true });
