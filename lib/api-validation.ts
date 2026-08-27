// /api/data 入参校验：轻量白名单校验（无第三方依赖）
// 用法：每个 action 一个 schema 函数，返回规范化后的 payload；不合法抛 ApiValidationError → 400

export class ApiValidationError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "ApiValidationError";
  }
}

function fail(key: string, expect: string): never {
  throw new ApiValidationError(`参数 ${key} 应为${expect}`);
}

export function vStr(v: unknown, key: string): string {
  if (typeof v !== "string") fail(key, "字符串");
  return v;
}

export function vOptStr(v: unknown, key: string): string | undefined {
  if (v === undefined || v === null) return undefined;
  return vStr(v, key);
}

export function vBool(v: unknown, key: string): boolean {
  if (typeof v !== "boolean") fail(key, "布尔值");
  return v;
}

export function vOptBool(v: unknown, key: string): boolean | undefined {
  if (v === undefined || v === null) return undefined;
  return vBool(v, key);
}

export function vInt(v: unknown, key: string): number {
  if (typeof v !== "number" || !Number.isFinite(v)) fail(key, "数字");
  return v;
}

export function vOptInt(v: unknown, key: string): number | undefined {
  if (v === undefined || v === null) return undefined;
  return vInt(v, key);
}

export function vObj(v: unknown, key: string): Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) fail(key, "对象");
  return v as Record<string, unknown>;
}

export function vOptObj(v: unknown, key: string): Record<string, unknown> | undefined {
  if (v === undefined || v === null) return undefined;
  return vObj(v, key);
}

export function vArr(v: unknown, key: string): unknown[] {
  if (!Array.isArray(v)) fail(key, "数组");
  return v;
}

export function vOptArr(v: unknown, key: string): unknown[] | undefined {
  if (v === undefined || v === null) return undefined;
  return vArr(v, key);
}

export function vStrArr(v: unknown, key: string): string[] {
  return vArr(v, key).map((x) => vStr(x, key));
}

export function vOptStrArr(v: unknown, key: string): string[] | undefined {
  if (v === undefined || v === null) return undefined;
  return vStrArr(v, key);
}

/** 必填字符串 id（通用） */
export function vId(v: unknown, key = "id"): string {
  return vStr(v, key);
}
