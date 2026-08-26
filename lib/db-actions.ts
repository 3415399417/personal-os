// 服务端 DB 操作层（Prisma + SQLite）：被 /api/data 与 /api/chat 工具调用共享。
// 组件层不要直接 import 本文件（它只在服务端运行）。
//
// 实现已按业务域拆分到 lib/db-actions/ 目录（commons/dashboard/todos/tasks/projects/notes/inbox/progress），
// 本文件仅为 re-export 汇总，保持对外接口不变（import * as db from "@/lib/db-actions" 照常工作）。

export * from "./db-actions/commons";
export * from "./db-actions/dashboard";
export * from "./db-actions/todos";
export * from "./db-actions/tasks";
export * from "./db-actions/projects";
export * from "./db-actions/notes";
export * from "./db-actions/inbox";
export * from "./db-actions/progress";
