# BetterLife Personal OS · 架构约定

> 一页纸的游戏规则。新功能先看这里，避免系统长乱。
> 原则：**约定比重构便宜 100 倍** —— 立规矩花半小时，收拾乱摊子花几天。

## 技术栈

- Next.js 15（App Router）+ React + TypeScript
- Prisma + SQLite（`dev.db`，数据文件在项目根目录）
- 客户端封装 `lib/api.ts` → 服务端 `lib/db-actions.ts` → Prisma

## 目录结构（放哪）

| 内容 | 位置 | 说明 |
|---|---|---|
| 页面 | `app/<name>/page.tsx` | 路由页面，尽量薄，只做取数+渲染 |
| API 路由 | `app/api/<name>/route.ts` | 独立能力（备份/统计/搜索/chat…） |
| 客户端 API 封装 | `lib/api.ts` | 所有前端取数函数统一放这里 |
| 服务端业务逻辑 | `lib/db-actions.ts` | 数据库操作、业务聚合（见下方拆分规则） |
| 通用组件 | `components/common/` | Modal、PageHead、EmptyState 等跨页复用 |
| 页面组件 | `components/dashboard/` 等 | 按页面/业务分目录 |
| 自定义 Hook | `hooks/` | 有状态的复用逻辑（计时/备份/快捷键…） |
| 类型定义 | `types/index.ts` | 前后端共享的领域类型 |
| 数据库模型 | `prisma/schema.prisma` | 唯一数据源，改动跑 `npx prisma db push` |
| 验证脚本 | `_verify/` | 一次性调试脚本进 `_verify/_archive/`，可保留的验证脚本命名 `verify-*` |

## API 两条路（怎么选）

| 场景 | 走哪条 | 例子 |
|---|---|---|
| **数据的增删改查**（任务/笔记/项目/资产…） | `POST /api/data` + action | `createTask`、`updateNote` |
| **独立能力**（不单纯是 CRUD） | 独立路由 `app/api/<name>/route.ts` | `/api/backup`、`/api/stats`、`/api/space`、`/api/search`、`/api/chat` |

- 在 `/api/data` 加 action：先在 `lib/db-actions/` 写实现，再到 `app/api/data/route.ts` 的 `ACTIONS` 表加一行映射
- 独立路由只做"薄封装"：参数解析 → 调 `lib/db-actions/` → 返回 JSON，业务逻辑不要写在 route 里
- **例外**：极简单查询（一行 prisma 且无复用价值）允许直接写在 route，但要注释说明

## API 统一约定（2026-08-27 起强制执行）

- **响应格式统一**：所有接口（`/api/data` + 独立路由）成功返回 `{ ok: true, ... }`，失败返回 `{ ok: false, error: string }` + 适当 status code（400/404/500/502）。`/api/data` 的成功载荷统一放 `data` 字段
- **入参校验**：`/api/data` 的每个带参 action 必须在 `SCHEMAS` 表登记白名单（`lib/api-validation.ts` 提供 `vStr/vOptStr/vBool/vInt/vObj/vArr...` 校验器），校验失败返回 400；独立路由也要做基本参数类型检查
- **客户端只走封装**：前端一律 `lib/api.ts` 的 `call()`（自动解包 `{ok,data}` 并抛错）；服务端调度器用 `instrumentation.ts` 的 `callData()`（同格式）。不要裸写 `fetch`
- **新增带参 action 的步骤**：① `lib/db-actions/` 写实现 ② `SCHEMAS` 加校验 ③ `ACTIONS` 加映射 ④ `lib/api.ts` 加封装函数
- 流式/文件类接口（`/api/chat`、`/api/export*`）不受 `data` 包裹约束，但必须带 `ok` 字段

## db-actions.ts 拆分规则

- 超过 **2000 行**必须拆：按业务域拆成 `lib/db-actions/` 目录下的多文件
  （如 `projects.ts`、`notes.ts`、`tasks.ts`…），再在 `db-actions.ts` 统一 re-export 保持调用方不变
- 一个函数只做一件事；查询与 AI 生成、文件扫描等重逻辑分开

## 前端规范

- 页面组件尽量"无状态化"：数据通过 `lib/api.ts` 取，事件通过 props 回调
- 所有 fetch 走 `lib/api.ts` 的封装，**不要**在组件里裸写 `fetch("/api/...")`
  （例外：一次性/专用接口如备份提示，可局部封装）
- 设置类偏好存 localStorage 要带统一前缀 `personalos:*`
- 用户资料（姓名/头像/焦点）**必须存数据库**（Profile 表），不要存 localStorage —— 换浏览器不丢

## 数据安全

- 危险操作（删除/清空）必须有确认弹窗
- 删除类 action 注意级联：如删项目时先删任务（SetNull 会污染个人待办）
- 错误信息不要泄露内部细节到前端（日志打全量，响应给简短信息）

## Git 提交规范（已有，保持）

- 前缀：`feat:` 新功能 / `fix:` 修复 / `refactor:` 重构 / `chore:` 杂务
- 描述写清楚"改了什么 + 为什么"，中文即可

## 生命周期约定

- 新功能流程：先想清楚走哪条路 → 写 db-actions 实现 → 加 action 或独立路由 → 前端调 lib/api.ts → `_verify` 验证
- 删除功能时：**前端删完，后端死代码也要删**（字段、action、函数），不留空壳
