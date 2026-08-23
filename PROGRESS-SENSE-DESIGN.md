# 开发进度感知 — 功能设计文档（v1.0）

> 项目：BetterLife AI Personal OS（`E:\我的项目\personal-os\`）
> 日期：2026-08-23
> 状态：✅ 设计定稿，待实施
> 关联：PROJECT-ROADMAP.md 阶段 8 延伸；昨晚（08-22）用户提出的"文档孵化 + 任务关联文件夹 + 自动打勾"想法

---

## 0. 一句话定位

> **写完开发文档，剩下的交给系统：它帮你拆任务、盯进度、写总结。**

用户不需要为了管理项目而管理项目——**开发就是进度记录本身**。

## 1. 产品闭环（现状 + 新增）

```
【已有】开发文档 → AI 拆项目/拆任务 → 本地开发 → 日报/周报
【新增】任务绑定产物(artifacts) → 系统观察文件系统 → 自动更新任务状态 → 完成依据可追溯
```

完整用户流程：

```text
1. 用户写完开发文档（外部：Typora / VS Code）
2. 系统内粘贴文档 → AI 读文档 → 生成项目 + 按阶段分组的任务清单
   （第一期：文档孵化）
3. AI 为每个任务推断"应该产出什么"（文件/文件夹/glob），用户可手动修正
   （第一期即带出，第二期生效）
4. 项目绑定本地文件夹（folderPath 已有，点一下关联）
5. 用户去 VS Code / 外部 AI 正常开发，不用回来更新任务
6. 系统打开时扫描文件夹：文件变化命中任务产物 → 更新任务状态
7. 产物就位 → 任务标"待确认" → 用户点确认 → 完成（完成依据可展开查看）
8. 日报/周报/项目首页共享这套进度数据
```

## 2. 设计原则（铁律，违反=返工）

1. **文件变化是信号，不是完成条件** —— 检测只负责"提示"，最终完成由用户确认（或显式配置的规则）
2. **完成必须有依据** —— 任务完成时能展开看到"✓ 改了哪些文件"，杜绝"AI 随便打勾"
3. **增量开发，不重构** —— 只加字段/表/模块，不动现有 CRUD、不动 prototype.css
4. **状态复用现有枚举** —— 不新增 status 值，用附加字段表达"待确认"，避免破坏现有分组/统计逻辑

## 3. 数据模型

### 3.1 Task 表扩展（2 个字段）

```prisma
model Task {
  // ...现有字段不动
  artifacts        String  @default("[]")  // JSON 数组，见下
  readyForConfirm  Boolean @default(false) // 产物就位，等用户确认
}
```

`artifacts` JSON 结构（SQLite 下用 JSON 字段而非关联表——无独立查询需求，随任务生命周期走）：

```json
[
  { "id": "a1", "type": "file",   "path": "src/api/auth.ts" },
  { "id": "a2", "type": "folder", "path": "src/services/auth/" },
  { "id": "a3", "type": "glob",   "pattern": "tests/auth/**" }
]
```

| 字段 | 类型 | 说明 |
|---|---|---|
| type | file / folder / glob | test 不单列（= glob 写法，如 `tests/**`） |
| path / pattern | string | 相对项目根目录；`/` 归一 |
| matchedCount | number | 命中次数（调试用，可选） |

### 3.2 ProgressEvent 新表（完成依据 + 事件流水）

```prisma
model ProgressEvent {
  id        String   @id @default(cuid())
  taskId    String
  projectId String?
  type      String   // artifact_matched | status_changed | confirmed | manual
  detail    String   // 人类可读："修改 src/api/auth.ts"
  path      String   @default("")
  createdAt DateTime @default(now())
}
```

用途：
- 任务详情"完成依据"时间线（✓ 10:42 修改 auth.ts）
- 日报/周报数据源（复用 /api/report 聚合）
- 后续 AI 判断（第二期之后）的素材

### 3.3 Project 表

**零改动**。`folderPath` 已有；规则：`folderPath` 非空即开启感知，不做开关。

## 4. 任务状态模型（最小侵入）

现有 `status`: todo / doing / waiting / completed。新增语义：

```
todo ──(文件变化命中 artifacts)──→ doing
doing ──(所有产物"存在且 mtime 晚于任务创建时间")──→ readyForConfirm = true（UI 黄点）
readyForConfirm ──(用户点"确认完成")──→ completed + completedAt
任意状态 ──(用户手动勾选，现有功能)──→ completed
```

- 不新增 status 枚举值；`readyForConfirm` 是附加布尔字段
- `group` 字段（must/doing/waiting/done）**保持不变**，完成不移组（现有逻辑）
- 项目 progress 联动复用 `syncProjectProgress`（现有）

## 5. 检测规则（ProgressDetector）

### 5.1 触发方式（第一版：轮询 + 打开即扫）

| 触发 | 时机 | 说明 |
|---|---|---|
| 打开项目详情页 / 首页 | 页面加载时调一次 scan | 用户"开发完打开系统看进度"是主场景 |
| 系统打开期间 | 前端每 60s 调一次（仅项目页/首页活跃时） | 覆盖边开发边看的情况 |
| 后台常驻 watcher（chokidar） | 第二期 | 系统关闭时 watcher 无意义，第一版不做常驻 |

### 5.2 匹配规则

| type | 规则 | 示例 |
|---|---|---|
| file | 相对路径精确匹配（不区分大小写，Windows） | `src/api/auth.ts` |
| folder | 路径前缀匹配（`dir/` 下所有文件） | `src/services/auth/` |
| glob | minimatch 匹配（新增依赖 `minimatch`） | `tests/auth/**` |

细节：
- 路径统一转 `/`、lowercase 后比较
- 扫描范围：项目 `folderPath` 下，排除 `node_modules` / `.next` / `.git` / `dist` / `build` / `backup`

### 5.3 状态更新规则

```
scanProject(projectId):
  1. 读项目 folderPath；为空 → 返回 { skipped: "no_folder" }
  2. 收集任务清单（status != completed）
  3. 对每个任务：
     a. 遍历 artifacts，统计命中（文件存在 且 mtime 晚于任务 createdAt）
     b. 有命中 & 任务 todo → status=doing + 写 ProgressEvent(artifact_matched)
     c. 全部产物命中 → readyForConfirm=true + 写 ProgressEvent(status_changed)
     d. 无命中 & 状态没变 → 跳过（不写事件）
  4. 有变化 → 重算项目 progress（syncProjectProgress）+ 广播 betterlife:data-changed
  5. 返回变更列表（前端 toast："检测到 3 个任务有进展"）
```

去重与增长控制：
- 同一 path 60s 内多次命中只写一条事件（更新时间）
- 每任务保留最近 50 条事件

### 5.4 完成确认

```
confirmTask(taskId):
  - 校验 readyForConfirm=true（或用户强制）
  - status=completed, completedAt=now, readyForConfirm=false
  - 写 ProgressEvent(confirmed)
  - 复用 syncProjectProgress + 广播
```

## 6. API 设计（走现有 /api/data 分发模式）

| action | 入参 | 出参 | 说明 |
|---|---|---|---|
| `scanProject` | projectId | { changed, events[] } | 扫描 + 更新状态（幂等） |
| `updateTaskArtifacts` | taskId, artifacts[] | task | 手动修正产物路径 |
| `confirmTask` | taskId | task | 确认完成 |
| `getProgressEvents` | taskId | events[] | 完成依据时间线 |
| `incubateFromDoc` | docText | { project, tasks } | 第一期：文档孵化 |

前端封装加在 `lib/api.ts`，命名与现有 `api.xxx` 一致。

## 7. UI 交互

### 7.1 项目详情页（主要战场）
- 项目头部：folderPath 已有展示 + "感知中"徽标（folderPath 非空时显示）
- 任务列表行：状态点（灰=待开始 / 蓝=开发中 / 黄=待确认 / 绿=已完成），复用现有样式体系（写 pages.css）
- 任务展开区（新）：
  - artifacts 列表（file/folder/glob 图标 + 路径，每项可编辑/删除/新增）
  - "完成依据"时间线（ProgressEvent 列表，时间 + 事件描述）
- readyForConfirm 任务：行内黄条提示"检测到产物已就位" + 「确认完成」按钮

### 7.2 /today 页
- 任务行加状态点（不动现有分组/勾选逻辑）

### 7.3 首页
- 项目卡加"最近活动"一行（该 project 最后一条 ProgressEvent 摘要）

### 7.4 文档孵化（第一期）
- 项目列表页/首页：「📄 从文档创建项目」入口 → Modal 粘贴文档 → AI 解析 → 预览（项目名/描述/任务清单含 artifacts）→ 一键创建

## 8. 改动文件清单

### 第一期：文档孵化（生成侧）

| 文件 | 改动 |
|---|---|
| `lib/db-actions.ts` | 新增 `createProjectWithTasks(input)` 批量创建（事务） |
| `app/api/chat/route.ts` 或新 `app/api/incubate/route.ts` | AI 读文档 → 结构化输出（复用 DeepSeek，提示词要求输出项目+任务+artifacts） |
| `app/projects/page.tsx` / `app/page.tsx` | 「从文档创建项目」入口 |
| `components/common/Modal.tsx` 复用 | 粘贴文档 Modal + 预览 |
| `lib/api.ts` | `api.incubateFromDoc` |

### 第二期：进度感知（观察侧）

| 文件 | 改动 |
|---|---|
| `prisma/schema.prisma` | Task +2 字段（artifacts / readyForConfirm），新增 ProgressEvent 表 → migrate |
| `lib/db-actions.ts` | `scanProject` / `updateTaskArtifacts` / `confirmTask` / `getProgressEvents` / `matchArtifacts` |
| `lib/artifact-matcher.ts`（新） | 匹配逻辑（file/folder/glob，路径归一化，排除目录） |
| `app/api/data/route.ts` | 注册 4 个新 action |
| `components/project/`（新） | TaskArtifactsEditor、ProgressTimeline、StatusDot、ConfirmBar |
| `app/projects/[id]/page.tsx` | 任务展开区 + 状态点 + 确认条 |
| `app/today/page.tsx` | 状态点（最小改动） |
| `app/page.tsx` | 项目卡"最近活动" |
| `hooks/useProjectScan.ts`（新） | 打开即扫 + 60s 轮询 |
| `package.json` | + `minimatch` |

## 9. 实施顺序与验收

### 第一期（文档孵化）
- 验收：粘贴开发文档 → 生成项目+任务（带 artifacts 预览）→ 创建成功 → 任务可手动改产物路径
- 产出物：上述第一期文件 + 验证脚本 `_verify/verify-incubate.mjs`

### 第二期（进度感知）
- 验收：关联文件夹 → 外部改动文件 → 打开系统 → 任务自动变"开发中"→ 产物齐了变"待确认"→ 点确认完成 → 完成依据时间线可见 → 项目进度/日报数据联动
- 产出物：上述第二期文件 + 验证脚本 `_verify/verify-scan.mjs`

## 10. 明确不做（后置）

- Git 集成（检测提交）——依赖项目用 git，二期后再评估
- 测试运行与结果解析——成本高
- AI 自动验收——等 readyForConfirm 积累真实数据后再上
- 自动完成（autoConfirm）——先跑用户确认流程
- 项目"脉搏"大改版（AI 判断文案）——等数据沉淀
- 🔴/⚠️ 额外状态（阻塞/偏离）——无数据支撑，砍

## 11. 风险与注意

- **任务创建时产物已存在**（从已有代码库孵化）：mtime 晚于 createdAt 规则会导致"永远命中"。处理：文档孵化时任务 createdAt 即创建时刻，若用户从存量代码孵化，提示手动调整 artifacts 或勾选"忽略存量"（二期细节，先记录）
- **误报**：用户只是打开文件看 → mtime 更新 → 标 doing。可接受（doing 无副作用），确认完成仍需用户点
- **性能**：扫描只读 stat + glob，项目级 <100ms，60s 轮询无压力
- **.env.local**：AI key 不动；新增依赖需 `npm install minimatch`
