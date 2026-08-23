// 产物匹配器：文件/文件夹/glob 三种匹配 + 目录遍历（进度感知引擎核心）
// 纯 Node 服务端模块（fs 同步读取，项目级扫描 <100ms）
import fs from "node:fs";
import path from "node:path";
import { minimatch } from "minimatch";

export interface Artifact {
  type: "file" | "folder" | "glob";
  path?: string; // file / folder
  pattern?: string; // glob
}

/** 扫描时排除的目录（性能 + 噪音） */
const EXCLUDED_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build", "backup", ".vercel"]);

/** 归一化相对路径：反斜杠→正斜杠 + 小写（Windows 不区分大小写） */
export function normalizeRel(p: string): string {
  return p.replace(/\\/g, "/").toLowerCase();
}

/** 判断相对路径是否命中某个产物定义 */
export function artifactMatches(artifact: Artifact, relPath: string): boolean {
  if (!artifact) return false;
  if (artifact.type === "file") {
    const target = normalizeRel(artifact.path ?? "");
    return target !== "" && normalizeRel(relPath) === target;
  }
  if (artifact.type === "folder") {
    const dir = normalizeRel(artifact.path ?? "").replace(/\/+$/, "");
    if (dir === "") return false;
    const rel = normalizeRel(relPath);
    return rel === dir || rel.startsWith(dir + "/");
  }
  if (artifact.type === "glob") {
    const pat = normalizeRel(artifact.pattern ?? "");
    if (pat === "") return false;
    try {
      return minimatch(normalizeRel(relPath), pat, { dot: true, nocase: true });
    } catch {
      return false;
    }
  }
  return false;
}

/** 遍历项目目录，返回全部相对路径（排除 node_modules/.next/.git 等） */
export function walkProject(root: string): string[] {
  const out: string[] = [];
  const stack: string[] = [""];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir ? path.join(root, dir) : root, { withFileTypes: true });
    } catch {
      continue; // 目录不可读/不存在 → 跳过
    }
    for (const e of entries) {
      const rel = dir ? `${dir}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (EXCLUDED_DIRS.has(e.name)) continue;
        stack.push(rel);
      } else if (e.isFile()) {
        out.push(rel);
      }
    }
  }
  return out;
}

/** 文件 mtime（ms），失败返回 -1 */
export function fileMtimeMs(absPath: string): number {
  try {
    return fs.statSync(absPath).mtimeMs;
  } catch {
    return -1;
  }
}
