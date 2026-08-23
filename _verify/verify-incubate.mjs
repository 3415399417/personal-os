// verify-incubate.mjs — 文档孵化第一期端到端验证（真实 DeepSeek API）
// 流程：贴样例开发文档 → /api/incubate 生成计划 → 断言结构 → /api/data createProjectWithTasks 入库
//       → 断言任务带【预期产物】→ 清理测试数据
const BASE = process.env.APP_URL ?? "http://127.0.0.1:3000";

const SAMPLE_DOC = `# 项目：网址收藏管家

## 目标
做一个本地运行的网页收藏管理工具，帮用户保存、分类、搜索常用网站。

## 功能需求
1. 收藏管理：新增/编辑/删除收藏，字段含标题、URL、分类、标签
2. 分类管理：自定义分类，树形结构，支持拖拽排序
3. 全文搜索：按标题/URL/标签模糊搜索，结果高亮
4. 导入导出：支持从浏览器书签 HTML 文件导入，导出为 JSON
5. 统计面板：收藏总数、本周新增、最常访问 Top10

## 技术方案
- Next.js + TypeScript + Prisma + SQLite
- 本地运行，无云服务
- 数据表：bookmark、category、tag

## 交付要求
- 可运行的生产构建
- 基础测试覆盖核心 CRUD`;

let passed = 0;
let failed = 0;
let createdProjectId = null;

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

console.log("=== 1. 文档孵化解析（真实 DeepSeek） ===");
const t0 = Date.now();
const resp1 = await fetch(`${BASE}/api/incubate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ docText: SAMPLE_DOC }),
});
const d1 = await resp1.json();
console.log(`   HTTP ${resp1.status}，耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
ok("返回 ok:true", d1.ok === true, JSON.stringify(d1.error ?? ""));
if (d1.ok) {
  const plan = d1.plan;
  ok("提取出项目名", typeof plan.name === "string" && plan.name.length > 0, `「${plan.name}」`);
  ok("有项目描述", typeof plan.description === "string" && plan.description.length > 0, plan.description);
  ok("任务数 5~15", Array.isArray(plan.tasks) && plan.tasks.length >= 5 && plan.tasks.length <= 15, `${plan.tasks.length} 个`);
  ok("任务均有标题", plan.tasks.every((t) => t.title?.trim()), "");
  ok("group 只有 must/waiting", plan.tasks.every((t) => ["must", "waiting"].includes(t.group)), "");
  const withArts = plan.tasks.filter((t) => Array.isArray(t.artifacts) && t.artifacts.length > 0).length;
  ok("部分任务带 artifacts", withArts > 0, `${withArts}/${plan.tasks.length} 个任务带产物路径`);
  const badArt = plan.tasks.flatMap((t) => t.artifacts ?? []).filter((a) => !["file", "folder", "glob"].includes(a.type) || !(a.path || a.pattern));
  ok("artifacts 结构合法", badArt.length === 0, badArt.length ? JSON.stringify(badArt[0]) : "");

  if (failed === 0) {
    console.log("\n=== 2. 计划入库（createProjectWithTasks） ===");
    const d2 = await callData("createProjectWithTasks", {
      name: plan.name,
      desc: plan.description,
      tasks: plan.tasks.map((t) => ({
        title: t.title,
        description: t.description,
        group: t.group,
        artifacts: t.artifacts,
      })),
    });
    ok("返回项目对象", !!d2?.project?.id, d2?.project?.id ?? "");
    createdProjectId = d2?.project?.id ?? null;
    ok("任务全部创建", Array.isArray(d2?.tasks) && d2.tasks.length === plan.tasks.length, `${d2?.tasks?.length ?? 0} 个`);
    if (createdProjectId) {
      const d3 = await callData("getProject", { id: createdProjectId });
      ok("getProject 可查到", !!d3?.id, "");
      const withArtText = (d3?.tasks ?? []).filter((t) => (t.note ?? "").includes("【预期产物】")).length;
      ok("任务描述含【预期产物】文本段", withArtText === (d3?.tasks ?? []).length, `${withArtText}/${d3?.tasks?.length ?? 0}`);
      const d4 = await callData("getProjects", {});
      const found = (d4 ?? []).find((p) => p.id === createdProjectId);
      ok("项目列表可见", !!found, found ? `「${found.name}」 进度 ${found.progress}%` : "");
    }
  }
}

// 清理测试数据
if (createdProjectId) {
  console.log("\n=== 3. 清理测试数据 ===");
  await callData("deleteProject", { id: createdProjectId });
  const d5 = await callData("getProjects", {});
  ok("测试项目已删除", !(d5 ?? []).some((p) => p.id === createdProjectId), "");
}

console.log(`\n结果：${passed} 通过，${failed} 失败`);
process.exit(failed === 0 ? 0 : 1);
