// audit-pages-css.mjs — pages.css 样式治理审计
// 阈值（PROJECT-STATE.md §1.5）：总行数 > 3500 / 单卡覆盖 > 15 / 总覆盖 > 90 → 需要收敛
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cssFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "app", "pages.css");
const content = fs.readFileSync(cssFile, "utf8");
const lines = content.split("\n");

const THRESHOLDS = {
  totalLines: 3500,
  cardOverrides: 15,
  totalOverrides: 90,
};

// 统计
const totalLines = lines.length;
const overrideLines = lines.filter((l) => l.includes("[data-od-id="));
const totalOverrides = overrideLines.length;

// 各卡片覆盖分布
const cardCounts = {};
for (const l of overrideLines) {
  const m = l.match(/data-od-id="(card-[a-z]+)"/);
  if (m) cardCounts[m[1]] = (cardCounts[m[1]] ?? 0) + 1;
}

// 三层以上特异性选择器（粗略：选择器内空格数 >= 2 且不是注释）
const deepSelectors = lines.filter((l) => {
  const t = l.trim();
  if (!t || t.startsWith("/*") || t.startsWith("//")) return false;
  if (!t.includes("{") && !t.endsWith("{")) return false;
  const sel = t.replace(/\{.*$/, "").trim();
  return sel.split(/\s+/).length >= 3;
}).length;

// 判断
const problems = [];
if (totalLines > THRESHOLDS.totalLines) problems.push(`总行数 ${totalLines} > ${THRESHOLDS.totalLines}`);
if (totalOverrides > THRESHOLDS.totalOverrides) problems.push(`总覆盖 ${totalOverrides} > ${THRESHOLDS.totalOverrides}`);
for (const [card, n] of Object.entries(cardCounts)) {
  if (n > THRESHOLDS.cardOverrides) problems.push(`${card} 覆盖 ${n} > ${THRESHOLDS.cardOverrides}`);
}

console.log("═══ pages.css 治理审计 ═══");
console.log(`总行数:        ${totalLines}  (阈值 ${THRESHOLDS.totalLines})`);
console.log(`data-od-id 覆盖: ${totalOverrides}  (阈值 ${THRESHOLDS.totalOverrides})`);
console.log(`三层+选择器:   ${deepSelectors}`);
console.log("各卡片覆盖分布:");
for (const [card, n] of Object.entries(cardCounts).sort((a, b) => b[1] - a[1])) {
  const flag = n > THRESHOLDS.cardOverrides ? " ⚠" : "";
  console.log(`  ${card}: ${n}${flag}`);
}
console.log("");
if (problems.length === 0) {
  console.log("✅ 状态良好，无需收敛");
  process.exit(0);
} else {
  console.log(`⚠️ 触发收敛信号：\n  - ${problems.join("\n  - ")}`);
  console.log("→ 按 PROJECT-STATE.md §1.5 安排收敛（优先 card-notes/card-life）");
  process.exit(1);
}
