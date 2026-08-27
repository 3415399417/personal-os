# scripts/ 归档说明（2026-08-27）

原 `scripts/` 目录的 15 个验证脚本已归档至此。它们都是 8-20 ~ 8-22 开发期的**一次性验证脚本**（puppeteer 实测 UI/数据流），多数验证的功能已迭代或改动，直接跑可能失败或误报。

**当前可复用的验证工具**在 `_verify/` 根目录（如 `shot-all-pages.mjs` 全页面截图）。

| 脚本 | 用途 | 状态 |
|---|---|---|
| verify-interactions.mjs | Phase1 交互验收（问候/待办/通知/导航/移动端抽屉） | 部分过时（问候卡片已改） |
| verify-interactions-v2.mjs | 交互验收 v2 | 过时 |
| verify-card-crud.mjs | 卡片 CRUD（首页各卡片增删改） | 过时（卡片结构已变） |
| verify-db.mjs | 数据库读写冒烟 | 可参考 |
| verify-delete.mjs | 删除流程（项目/任务/笔记） | 可参考 |
| verify-empty-db.mjs | 空库场景验证 | 可参考 |
| verify-fc.mjs / verify-fc-browser.mjs | 焦点任务（isTodayFocus）验证 | 过时 |
| verify-features.mjs | 功能集验证 | 过时 |
| verify-progress.mjs | 进度感知（产物扫描/确认完成） | 可参考 |
| verify-routes.mjs | 路由可达性 | 可参考 |
| verify-viewports.mjs | 多视口布局 | 可参考 |
| pixel-compare.mjs | 原型 vs App 像素级对比 | 需要原型截图文件 |
| visual-compare.mjs | 原型 vs App 并排截图 | 需要原型 HTML |
| reshot.mjs | 重拍截图 | 可参考 |

如需恢复某个脚本：`git checkout -- scripts/<name>.mjs`（git 历史里有原路径）。
