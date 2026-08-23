// verify-scan.mjs — 进度感知第二期端到端验证
// 流程：建测试项目(带 artifacts) → 关联临时文件夹 → 初始扫描(无命中) → 创建文件(模拟开发)
//       → 扫描(任务转 doing + 事件) → 全部产物就位(readyForConfirm) → 确认完成 → 时间线可见 → 清理
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE = process.env.APP_URL ?? "http://127.0.0.1:3000";
const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "personal-os-scan-"));

let passed = 0;
let failed = 0;
let projectId = null;
let taskIds = [];

function ok(name, cond, detail = "") {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}${detail ? " — " + detail : ""}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}${detail ? " — " + detail : ""}`);
  }
}

async function callData(action, payload) {
  const resp = await fetch(`${BASE}/api/data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  return resp.json();
}

try {
  console.log("=== 1. 建测试项目（3 个任务：单产物 / 目录产物 / 永不创建的产物） ===");
  const d1 = await callData("createProjectWithTasks", {
    name: "scan-test-临时项目",
    desc: "进度感知验证",
    folderPath: TMP_ROOT,
    tasks: [
      { title: "编写入口文件", group: "must", artifacts: [{ type: "file", path: "src/app.ts" }] },
      { title: "实现工具函数", group: "waiting", artifacts: [{ type: "folder", path: "src/utils/" }] },
      { title: "未开发的产物", group: "waiting", artifacts: [{ type: "file", path: "never/created.ts" }] },
    ],
  });
  projectId = d1?.project?.id ?? null;
  ok("项目创建", !!projectId, projectId ?? "");
  taskIds = (d1?.tasks ?? []).map((t) => t.id);
  ok("3 个任务创建", taskIds.length === 3, `${taskIds.length}`);

  console.log("\n=== 2. 初始扫描：文件不存在 → 无命中 ===");
  const s1 = await callData("scanProject", { projectId });
  ok("skipped 为空", !s1.skipped, JSON.stringify(s1.skipped ?? ""));
  ok("changed 为空", (s1.changed ?? []).length === 0, `${(s1.changed ?? []).length}`);
  const p1 = await callData("getProject", { id: projectId });
  ok("任务仍是 todo 状态", (p1?.tasks ?? []).every((t) => !t.done && t.status !== "doing"), JSON.stringify((p1?.tasks ?? []).map((t) => ({ t: t.text, s: t.status, r: t.readyForConfirm }))));

  console.log("\n=== 3. 模拟开发：创建 src/app.ts（mtime 晚于任务创建） ===");
  fs.mkdirSync(path.join(TMP_ROOT, "src"), { recursive: true });
  fs.writeFileSync(path.join(TMP_ROOT, "src", "app.ts"), "// entry\n");
  const s2 = await callData("scanProject", { projectId });
  const changed1 = (s2.changed ?? []).filter((c) => c.taskId === taskIds[0]);
  ok("任务1 进入 changed", changed1.length === 1, JSON.stringify(changed1[0] ?? {}));
  ok("任务1 单产物全命中 → ready", changed1[0]?.status === "ready", changed1[0]?.status ?? "");
  ok("有 artifact_matched 事件", (s2.events ?? []).some((e) => e.taskId === taskIds[0] && e.type === "artifact_matched" && e.path === "src/app.ts"), "");
  const p2 = await callData("getProject", { id: projectId });
  const t1 = (p2?.tasks ?? []).find((t) => t.id === taskIds[0]);
  ok("任务1 status=doing 已入库（DB 语义）", t1?.status === "doing", `status=${t1?.status}`);
  ok("任务1 readyForConfirm=true（单产物命中即就位）", t1?.readyForConfirm === true, `ready=${t1?.readyForConfirm}`);

  console.log("\n=== 4. 全部产物就位：创建 src/utils/a.ts → readyForConfirm ===");
  fs.mkdirSync(path.join(TMP_ROOT, "src", "utils"), { recursive: true });
  fs.writeFileSync(path.join(TMP_ROOT, "src", "utils", "a.ts"), "// util\n");
  const s3 = await callData("scanProject", { projectId });
  const changed2 = (s3.changed ?? []).filter((c) => c.taskId === taskIds[1]);
  ok("任务2 进入 changed", changed2.length === 1, JSON.stringify(changed2[0] ?? {}));
  ok("任务2 目录产物命中 → ready", changed2[0]?.status === "ready", changed2[0]?.status ?? "");
  const p3 = await callData("getProject", { id: projectId });
  const t1b = (p3?.tasks ?? []).find((t) => t.id === taskIds[0]);
  const t2b = (p3?.tasks ?? []).find((t) => t.id === taskIds[1]);
  const t3b = (p3?.tasks ?? []).find((t) => t.id === taskIds[2]);
  ok("任务1 readyForConfirm=true", t1b?.readyForConfirm === true, `ready=${t1b?.readyForConfirm}`);
  ok("任务2 readyForConfirm=true", t2b?.readyForConfirm === true, `ready=${t2b?.readyForConfirm}`);
  ok("任务3 仍未命中（never/created.ts 不存在）", t3b?.status !== "doing" && t3b?.readyForConfirm === false, `status=${t3b?.status}`);

  console.log("\n=== 5. 完成依据时间线 ===");
  const ev1 = await callData("getProgressEvents", { taskId: taskIds[0] });
  ok("任务1 有事件", Array.isArray(ev1) && ev1.length >= 2, `${ev1?.length ?? 0} 条`);
  ok("事件含 artifact_matched", (ev1 ?? []).some((e) => e.type === "artifact_matched"), JSON.stringify((ev1 ?? []).map((e) => e.type)));

  console.log("\n=== 6. 确认完成（未就绪的任务3 应被拒绝；任务1/2 成功） ===");
  const c1 = await callData("confirmTask", { taskId: taskIds[0] });
  ok("任务1 确认成功", c1?.task?.done === true, `done=${c1?.task?.done}`);
  const c2 = await callData("confirmTask", { taskId: taskIds[1] });
  ok("任务2 确认成功", c2?.task?.done === true, `done=${c2?.task?.done}`);
  const c3 = await callData("confirmTask", { taskId: taskIds[2] });
  ok("任务3 无 force 被拒绝（产物未就位）", (c3?.error ?? "").includes("尚未全部就位"), c3?.error ?? "");
  const c4 = await callData("confirmTask", { taskId: taskIds[2], force: true });
  ok("任务3 force 确认成功", c4?.task?.done === true, "");
  const p4 = await callData("getProject", { id: projectId });
  ok("项目进度 100%", p4?.progress === 100, `${p4?.progress}%`);
  ok("项目最近活动可查", !!(p4?.recentActivity), JSON.stringify(p4?.recentActivity ?? null));

  console.log("\n=== 7. 无文件夹项目 → skipped ===");
  const d2 = await callData("createProject", { name: "scan-test-无路径" });
  const s4 = await callData("scanProject", { projectId: d2?.id });
  ok("skipped=no_folder", s4?.skipped === "no_folder", s4?.skipped ?? "");
  await callData("deleteProject", { id: d2?.id });
} catch (err) {
  console.error("FATAL:", err.message);
  failed++;
} finally {
  // 清理
  if (projectId) {
    await callData("deleteProject", { id: projectId });
    console.log("\n=== 清理：测试项目已删除 ===");
  }
  try {
    fs.rmSync(TMP_ROOT, { recursive: true, force: true });
  } catch {}
  console.log(`\n结果：${passed} 通过，${failed} 失败`);
  process.exit(failed === 0 ? 0 : 1);
}
