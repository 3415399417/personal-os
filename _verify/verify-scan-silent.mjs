// 验证：重复扫描静默（开发完成后刷新页面不再提示"有进展"）
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE = "http://127.0.0.1:3000";
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "dbg-scan2-"));

async function callData(action, payload) {
  const resp = await fetch(`${BASE}/api/data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  return resp.json();
}

let passed = 0, failed = 0;
const ok = (n, c, d = "") => { c ? passed++ : failed++; console.log(`  ${c ? "✅" : "❌"} ${n}${d ? " — " + d : ""}`); };

// 建项目 + 两个产物
const d1 = await callData("createProjectWithTasks", {
  name: "silent-test",
  folderPath: TMP,
  tasks: [{ title: "t1", group: "must", artifacts: [{ type: "file", path: "src/a.ts" }, { type: "folder", path: "src/utils/" }] }],
});
const pid = d1?.project?.id;
const tid = d1?.tasks?.[0]?.id;

// 开发：创建第一个文件
fs.mkdirSync(path.join(TMP, "src"), { recursive: true });
fs.writeFileSync(path.join(TMP, "src", "a.ts"), "a");

const s1 = await callData("scanProject", { projectId: pid });
ok("第一次扫描：有进展（doing，未全就位）", (s1.changed ?? []).length === 1, JSON.stringify(s1.changed ?? []));

// 再扫描一次（文件没变）
const s2 = await callData("scanProject", { projectId: pid });
ok("第二次扫描：静默（无新事件）", (s2.changed ?? []).length === 0, `changed=${(s2.changed ?? []).length}`);

// 开发第二个产物
fs.mkdirSync(path.join(TMP, "src", "utils"), { recursive: true });
fs.writeFileSync(path.join(TMP, "src", "utils", "b.ts"), "b");
const s3 = await callData("scanProject", { projectId: pid });
ok("第三个文件出现：再次有进展（ready）", (s3.changed ?? []).length === 1, JSON.stringify(s3.changed ?? []));

const s4 = await callData("scanProject", { projectId: pid });
ok("第四次扫描：静默", (s4.changed ?? []).length === 0, `changed=${(s4.changed ?? []).length}`);

// 时间线：产物事件只有 2 条（a.ts、utils/b.ts 各一次）+ 状态事件
const ev = await callData("getProgressEvents", { taskId: tid });
const artEvents = (ev ?? []).filter((e) => e.type === "artifact_matched");
ok("产物事件按路径去重（2 条）", artEvents.length === 2, JSON.stringify(artEvents.map((e) => e.path)));

await callData("deleteProject", { id: pid });
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n结果：${passed} 通过，${failed} 失败`);
process.exit(failed ? 1 : 0);
