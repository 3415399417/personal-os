// 验证三项新功能：批量确认 / 产物缺失提示 / 开发活动统计
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE = "http://127.0.0.1:3000";
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "dbg-batch-"));

async function callData(action, payload) {
  const resp = await fetch(`${BASE}/api/data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  return resp.json();
}

let passed = 0, failed = 0;
let pid = null;
const ok = (n, c, d = "") => { c ? passed++ : failed++; console.log(`  ${c ? "✅" : "❌"} ${n}${d ? " — " + d : ""}`); };

try {
  // 1. 建项目：2 个可就位任务 + 1 个缺产物任务
  const d1 = await callData("createProjectWithTasks", {
    name: "batch-test",
    folderPath: TMP,
    tasks: [
      { title: "t1", group: "must", artifacts: [{ type: "file", path: "src/a.ts" }] },
      { title: "t2", group: "must", artifacts: [{ type: "file", path: "src/b.ts" }] },
      { title: "t3", group: "waiting", artifacts: [{ type: "file", path: "missing/c.ts" }] },
    ],
  });
  pid = d1?.project?.id;
  const [t1, t2, t3] = (d1?.tasks ?? []).map((t) => t.id);
  ok("项目创建", !!pid);

  // 2. 创建 a.ts / b.ts 并扫描 → t1/t2 ready，t3 未命中
  fs.mkdirSync(path.join(TMP, "src"), { recursive: true });
  fs.writeFileSync(path.join(TMP, "src", "a.ts"), "a");
  fs.writeFileSync(path.join(TMP, "src", "b.ts"), "b");
  const s1 = await callData("scanProject", { projectId: pid });
  ok("扫描后 2 个任务 ready", (s1.changed ?? []).length === 2, JSON.stringify((s1.changed ?? []).map((c) => c.status)));

  // 3. getTaskArtifactStatus：t1 全命中；t3 缺
  const st1 = await callData("getTaskArtifactStatus", { taskId: t1 });
  ok("t1 产物状态全命中", st1?.artifacts?.length === 1 && st1.artifacts[0].matched === true, JSON.stringify(st1?.artifacts));
  const st3 = await callData("getTaskArtifactStatus", { taskId: t3 });
  ok("t3 产物状态未命中（缺失提示数据）", st3?.artifacts?.[0]?.matched === false, JSON.stringify(st3?.artifacts));

  // 4. 批量确认：只确认 ready 的（前端用 readyCount 过滤；这里模拟后端逐条 confirmTask）
  const c1 = await callData("confirmTask", { taskId: t1 });
  const c2 = await callData("confirmTask", { taskId: t2 });
  ok("t1/t2 确认成功", c1?.task?.done === true && c2?.task?.done === true, "");
  const c3 = await callData("confirmTask", { taskId: t3 });
  ok("t3 未就位被拒绝（批量按钮只列 ready，不会带上它）", (c3?.error ?? "").includes("尚未全部就位"), "");

  // 5. getDevActivity：有产物更新 + 确认记录
  const dev = await callData("getDevActivity", { since: new Date(Date.now() - 86400000).toISOString() });
  ok("开发活动统计：有产物更新", (dev?.updateCount ?? 0) >= 2, `updateCount=${dev?.updateCount}`);
  ok("开发活动统计：含确认完成", (dev?.confirmedTasks ?? []).length >= 2, JSON.stringify(dev?.confirmedTasks));
  ok("开发活动统计：含路径", (dev?.updatedPaths ?? []).includes("src/a.ts"), JSON.stringify(dev?.updatedPaths));

  // 6. 日报接口真实调用（低峰时段，验证 prompt 组装 + 200）
  const r = await fetch(`${BASE}/api/report?period=day`, { method: "GET" });
  const rd = await r.json();
  ok("日报接口 200 + ok", r.status === 200 && rd.ok === true, `status=${r.status}`);
  ok("日报含 AI 输出", typeof rd.text === "string" && rd.text.length > 50, `${rd.text?.length ?? 0} 字`);
  console.log("\n  日报片段:", rd.text?.slice(0, 120)?.replace(/\n/g, " "));
} catch (err) {
  console.error("FATAL:", err.message);
  failed++;
} finally {
  await callData("deleteProject", { id: pid });
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`\n结果：${passed} 通过，${failed} 失败`);
  process.exit(failed ? 1 : 0);
}
