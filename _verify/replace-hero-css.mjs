import fs from "fs";

const path = "E:/我的项目/personal-os/app/pages.css";
let content = fs.readFileSync(path, "utf8");
const marker = "Hero 焦点卡（用户确认 2026-08-22 16:0x";
const idx = content.indexOf(marker);
if (idx < 0) {
  console.error("MARKER NOT FOUND");
  process.exit(1);
}
// 往前找注释块开头（最后一个 /* 后跟 ═ 的行）
const blockStart = content.lastIndexOf("/* ═", idx);
if (blockStart < 0) {
  console.error("BLOCK START NOT FOUND");
  process.exit(1);
}
const head = content.slice(0, blockStart).trimEnd();

const newBlock = `
/* ═══════════════════════════════════════════════════════════════
   Hero 焦点卡（用户确认 2026-08-22 17:35）：左右分栏结构
   左栏概览：星星+今日最重要 → 旗帜+标题+AI标签+描述 → 三个胶囊元数据
   右栏执行：主任务 / 状态 / 下一步 内容块 + 底部按钮组
   ═══════════════════════════════════════════════════════════════ */
[data-od-id="hero"] .focus-card {
  flex: none;
  align-self: flex-start;
  width: 100%;
  max-width: 640px;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: 18px 20px;
  display: flex;
  align-items: stretch;
}
/* 左栏：概览（60%） */
.focus-left {
  flex: 6;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  padding-right: 16px;
  border-right: 1px solid var(--border);
}
.focus-top {
  display: flex;
  align-items: center;
}
/* 右栏：执行详情（40%） */
.focus-right {
  flex: 4;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-left: 16px;
  justify-content: space-between;
}
/* 主体：旗帜图标 + 标题行 + 描述 */
.focus-main {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}
.focus-flag {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #FCE7F3;
  border: 1px solid #F9A8D4;
  color: #EF4444;
  display: grid;
  place-items: center;
}
.focus-flag svg { width: 20px; height: 20px; }
.focus-main-text { min-width: 0; flex: 1; }
.focus-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.focus-title {
  font-size: 16px;
  font-weight: 700;
  color: #111;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.focus-ai-tag {
  flex: none;
  font-size: 10px;
  font-weight: 600;
  color: var(--accent-deep);
  background: var(--accent-tint);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  padding: 2px 8px;
  white-space: nowrap;
}
.focus-desc {
  font-size: 12.5px;
  color: var(--muted);
  line-height: 1.55;
  margin-top: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
/* 元数据：三个浅灰胶囊 */
.focus-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.focus-meta-pill {
  font-size: 11px;
  color: var(--muted);
  background: #F3F4F6;
  border-radius: var(--radius-pill);
  padding: 3px 10px;
  white-space: nowrap;
}
/* 右栏内容块 */
.focus-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.focus-block-row {
  flex-direction: row;
  align-items: center;
  gap: 10px;
}
.focus-block-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--accent-deep);
  letter-spacing: 0.06em;
}
.focus-block-text {
  font-size: 12.5px;
  font-weight: 600;
  color: #111;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.focus-next-text {
  color: var(--accent-deep);
}
.focus-state-pill {
  flex: none;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--accent-deep);
  background: var(--accent-tint);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  padding: 3px 10px;
}
/* 按钮组（贴底） */
.focus-btns {
  display: flex;
  gap: 10px;
  margin-top: auto;
  padding-top: 4px;
}
.focus-btns .btn {
  flex: 1;
  height: 34px;
  font-size: 12.5px;
  padding: 0 10px;
}
`;

fs.writeFileSync(path, head + "\r\n" + newBlock, "utf8");
console.log("CSS replaced OK, new length:", head.length + newBlock.length);
