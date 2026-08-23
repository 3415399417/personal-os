# BetterLife AI Personal OS — 项目状态速查（上下文压缩快照）

> 用途：新会话/失忆后，先读本文件即可恢复全部上下文。
> 生成时间：2026-08-20

## 0. 一分钟速览

- 位置：`E:\我的项目\personal-os\`（Next.js 15 + React 19 + TS + Prisma 7 + SQLite）
- 预览：`npm run dev` → http://localhost:3000/（端口 3000；3001 是旧进程占用时的备选）
- 视觉基准：`C:\Users\34153\Desktop\Web-Prototype\personal-os-home.html`（原型，CSS 原样提取）
- 规格书：`C:\Users\34153\Desktop\Personal_OS_Clone_v1_可开工开发规格.md`（§8 数据模型）
- 状态：Phase 2 完成（DB + CRUD + 空库起步 + AI function calling + 进度条 + 任务删除）
- 数据库：当前为**空库**（测试数据已清理）

## 1. 铁律（用户多次强调，违反=返工）

1. **视觉零改动**：`app/prototype.css` 一字不许改（从原型 <style> 原样提取，590 行，diff=0 验证过）
2. 不许换字体/重画插画/换图标；按钮 12px 圆角、卡片 16px、进度条 5px、正文 12px
3. 新页面样式只能写 `app/pages.css`（用 prototype.css 的 :root 变量，同色 #8B5CF6 紫系）
4. 类名一个不许改；布局：Sidebar 260px、Header 54px、三列网格、一屏无滚动
5. 禁止"开发中"占位页；Tailwind 只许用于布局工具类（当前未用）
6. 完成后停下汇报，不要擅自加数据库/AI 之外的功能

### 1.5 样式治理规范（2026-08-23 定稿，防特异性军备竞赛）

背景：pages.css 已 2689 行，`[data-od-id="card-x"]` 专属覆盖 69 处（历史像素级对齐债）。新模块（进度感知/文档孵化/引导条）已全部使用通用类，无新增专属覆盖——继续保持。

**新代码规范（必须遵守）：**
- 新模块/新组件的样式一律写**通用类**（如 `.prog-dot` `.task-expand` `.sense-guide` `.incubate-*`），**禁止新增 `[data-od-id="card-x"]` 专属覆盖**（除非必须盖 prototype 且无公共类可用，此时注释说明原因）
- 新样式写完后自查：`Select-String -Path app/pages.css -Pattern 'data-od-id'` 不应出现新增条目

**按需收敛（不做大重构）：**
- card-notes（13 覆盖）、card-life（11 覆盖）最多，这两张卡**下次改版时**顺手合并公共类，不单独为收敛而动

**审计阈值（触发收敛的信号）：**
- pages.css 总行数 > 3500 行，或单卡 data-od-id 覆盖 > 15 个，或总覆盖数 > 90 个 → 跑 `_verify/audit-pages-css.mjs` 复查并安排收敛
- 日常检查：`node _verify/audit-pages-css.mjs`

### 1.6 开发/构建纪律（2026-08-23 补）

- 🔴 **dev server 运行时禁止 `npm run build`**：build 会重建 .next 目录破坏 dev 缓存 → CSS chunk 404、样式全丢。必须：停 dev → build → 再起 dev

## 2. 关键文件

| 文件 | 职责 |
|---|---|
| `app/prototype.css` | 唯一视觉来源（勿动） |
| `app/pages.css` | 功能页扩展样式（.page/.panel/.task-item/.empty-state/.modal/.progress 等） |
| `app/layout.tsx` | 引入 globals.css + prototype.css + pages.css |
| `prisma/schema.prisma` | 10 表：Project/Task/Note/Resource/Reminder/LearningRecord/Asset/Review/AiConversation/AiMessage |
| `lib/db.ts` | Prisma 单例（libsql adapter，file:./dev.db） |
| `lib/db-actions.ts` | **服务端 DB 操作层**（/api/data 与 /api/chat 工具共用；组件勿 import） |
| `lib/api.ts` | 客户端数据层：POST /api/data 分发，**签名与 mock 时代完全一致** |
| `app/api/data/route.ts` | 薄分发（action → db-actions） |
| `app/api/chat/route.ts` | DeepSeek function calling 工具循环 + 页面上下文注入 + 删除确认 |
| `app/ai/page.tsx` | AI 对话页：Flash/Pro 选择、强度低中高、工具提示小字 |
| `components/layout/AppShell.tsx` | div.app 外壳 + 移动端抽屉 |
| `components/layout/Sidebar.tsx` | 待办（含删除+进度条）/今日状态/提醒，监听 `betterlife:data-changed` |
| `components/layout/Header.tsx` | 导航 6 项/搜索 ⌘K/通知（读 Reminder） |
| `components/common/EmptyState.tsx` | 空状态组件（图标+文案+入口） |
| `components/common/Modal.tsx` | 弹窗 |
| `scripts/` | 各验证脚本（见 §6） |
| `.env.local` | DSH_DEEPSEEK_KEY（AI API key）+ DEEPSEEK_API_URL |

## 3. 数据模型要点（规格书 §8）

- **Task**：status(todo/doing/waiting/completed) + **group(must/doing/waiting/done，创建时持久化，完成不移组)** + projectId + isTodayFocus + completedAt
- **Project**：name/description/status(active/paused/completed/archived)/progress（= 完成任务÷总任务，写操作自动重算）
- 其余表按规格书；Resource 承载收集箱（type=inbox，status=open/handled）
- 迁移：`npx prisma migrate dev --name xxx`；改 schema 后要 `npx prisma generate`

## 4. 关键行为

- **进度联动**：勾选/新建/删除任务 → 自动重算项目 progress（首页卡/项目列表/详情三处同步）
- **/today**：四组（必须完成/进行中/等待/已完成），组头 `x/y` + 小组进度条，顶部总进度条 `已完成 x/y · z%`；勾选留在原组划线；空库显示 0/0·0%
- **侧边栏**：待办=全部任务（含已完成划线），底部细进度条；`betterlife:data-changed` 全局事件同步（/today、项目详情操作后广播）
- **任务删除**：/today、项目详情、侧边栏均有 hover 浮现垃圾桶按钮（.task-del）
- **AI function calling**（17 工具）：查询/创建/修改/删除；**删除必须先确认**（模型询问→用户回复"确认"→历史检测后执行）；请求级幂等去重；系统提示词注入当前页面数据摘要（pathname 参数）
- **AI 会话持久化**：AiConversation/AiMessage，刷新不丢；工具提示以 toolNote 单独渲染（不重复进正文）

## 5. 常用命令

```bash
npm run dev          # 开发（3000 端口；被占则 3001，脚本默认 3000 可 APP_URL 覆盖）
npm run build        # 生产构建
npx tsc --noEmit     # 类型检查
npx prisma migrate dev --name <name>   # 迁移
npx prisma generate  # 重新生成 client（改 schema 后必须）
```

## 6. 验证脚本（node scripts/xxx.mjs）

| 脚本 | 覆盖 |
|---|---|
| `verify-viewports.mjs` | 9 档视口无溢出/一屏（首页） |
| `reshot.mjs` | 首页像素对比（空库 4.573% 差异=空状态 vs 原型 mock，属预期） |
| `verify-db.mjs` | DB CRUD 24 项（进度联动/持久化/AI 会话） |
| `verify-empty-db.mjs` | 空库 11 页渲染 + 新建→勾选→刷新流程 |
| `verify-features.mjs` | 空库各页交互 20 项（空状态+新建入库） |
| `verify-progress.mjs` | 进度条 18 项（总/组/侧边栏/刷新保留） |
| `verify-delete.mjs` | 任务删除 7 项（真实鼠标点击，注意作用域 main/sidebar） |
| `verify-fc.mjs` / `verify-fc-browser.mjs` | AI function calling（真实 API，8 项） |
| `pixel-compare.mjs` / `visual-compare.mjs` | 像素对比辅助 |

⚠️ 测试脚本注意：headless 下 `page.hover`/合成 click 不可靠，删除/勾选用**真实鼠标坐标**（mouse.move+click）；"删我甲"会子串匹配"项目删我甲"，断言要精确匹配。

## 7. 当前已知状态

- 数据库空库（projects=0 tasks=0），首页显示空状态设计
- AI 用真实 DeepSeek API（key 在 .env.local），flash 默认 / pro 可选
- 生产构建通过；tsc 0 错误
- 无 git 仓库（.gitignore 已有，含 .env.local）

## 8. 可能的下一步（等用户指令，勿擅自做）

- 数据库/功能之外的新需求（用户明确说"不要擅自加"）
- 收藏箱/提醒的 UI 管理页（目前只有 AI 工具能建 reminder）
- localStorage 之外的数据导入导出
