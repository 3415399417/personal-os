"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/common/Modal";
import { createProjectWithTasks, incubatePlan } from "@/lib/api";
import type { IncubateArtifact, IncubatePlan, IncubateTask } from "@/lib/api";

interface IncubateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

/** 孵化推荐资产（AI 记忆器官：文档→指令/模板推荐，用户勾选确认才关联） */
interface RecommendedAsset {
  id: string;
  name: string;
  description: string;
}

type Stage = "input" | "parsing" | "preview" | "creating";

const GROUP_OPTIONS: { value: IncubateTask["group"]; label: string }[] = [
  { value: "must", label: "必须完成" },
  { value: "waiting", label: "等待" },
];

/** 结构化 artifacts ↔ 文本行（每行 "type: path"，编辑时容错解析） */
function artifactsToText(arts: IncubateArtifact[]): string {
  return (arts ?? []).map((a) => `${a.type}: ${a.path ?? a.pattern ?? ""}`).join("\n");
}

function textToArtifacts(text: string): IncubateArtifact[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(file|folder|glob)\s*[:：]\s*(.+)$/);
      if (!m) return null;
      const p = m[2].trim().replace(/\\/g, "/");
      const type = m[1] as IncubateArtifact["type"];
      return type === "glob" ? { type, pattern: p } : { type, path: p };
    })
    .filter(Boolean) as IncubateArtifact[];
}

export function IncubateModal({ open, onClose, onCreated }: IncubateModalProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("input");
  const [doc, setDoc] = useState("");
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<IncubatePlan | null>(null);
  const [assets, setAssets] = useState<{ commands: RecommendedAsset[]; templates: RecommendedAsset[] }>({ commands: [], templates: [] });
  const [pickedAssets, setPickedAssets] = useState<Set<string>>(new Set());

  const MAX_CHARS = 20000;

  /** 读取本地文档文件 → 填入输入框（超长截断提示） */
  const readFile = (file: File | undefined | null) => {
    if (!file) return;
    if (file.size > 500 * 1024) {
      setError("文件过大（>500KB），请截取核心部分后粘贴或选择更小的文件");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      if (text.length > MAX_CHARS) {
        setDoc(text.slice(0, MAX_CHARS));
        setError(`文档较长，已截取前 ${MAX_CHARS} 字符（原 ${text.length} 字符）`);
      } else {
        setDoc(text);
        setError("");
      }
    };
    reader.onerror = () => setError("读取文件失败，请重试");
    reader.readAsText(file);
  };

  const reset = () => {
    setStage("input");
    setDoc("");
    setError("");
    setPlan(null);
    setAssets({ commands: [], templates: [] });
    setPickedAssets(new Set());
  };

  const close = () => {
    reset();
    onClose();
  };

  const parse = () => {
    const v = doc.trim();
    if (!v) {
      setError("请先粘贴开发文档内容");
      return;
    }
    setError("");
    setStage("parsing");
    incubatePlan(v)
      .then((p) => {
        setPlan(p.plan);
        setAssets(p.assets ?? { commands: [], templates: [] });
        setPickedAssets(new Set());
        setStage("preview");
      })
      .catch((e: Error) => {
        setError(e.message || "解析失败，请重试");
        setStage("input");
      });
  };

  const create = () => {
    if (!plan) return;
    setError("");
    setStage("creating");
    createProjectWithTasks({
      name: plan.name,
      desc: plan.description,
      tasks: plan.tasks.map((t) => ({
        title: t.title,
        description: t.description,
        group: t.group,
        artifacts: t.artifacts,
      })),
      resources: Array.from(pickedAssets),
    })
      .then(({ project }) => {
        onCreated?.();
        reset();
        onClose();
        window.dispatchEvent(new Event("betterlife:data-changed"));
        router.push(`/projects/${project.id}`);
      })
      .catch((e: Error) => {
        setError(e.message || "创建失败，请重试");
        setStage("preview");
      });
  };

  const updatePlan = (patch: Partial<IncubatePlan>) => {
    setPlan((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const updateTask = (i: number, patch: Partial<IncubateTask>) => {
    setPlan((prev) =>
      prev ? { ...prev, tasks: prev.tasks.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) } : prev,
    );
  };

  const modalStyle: React.CSSProperties =
    stage === "preview" ? { width: 760, maxWidth: "94vw" } : { width: 640, maxWidth: "94vw" };

  return (
    <Modal title="从文档创建项目" open={open} onClose={close} style={modalStyle}>
      {stage === "input" && (
        <>
          <p className="incubate-hint">
            粘贴新项目的开发文档（需求说明 / 开发计划均可），AI 会读取文档，拆解成一份有计划有步骤的项目任务清单。
          </p>
          <div className="field">
            <div className="incubate-file-row">
              <label className="field-label" htmlFor="incubate-doc">开发文档内容</label>
              <button
                type="button"
                className="btn btn-ghost incubate-file-btn"
                onClick={() => fileRef.current?.click()}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                  <path d="M6 4.5h9l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V6A1.5 1.5 0 0 1 6 4.5z" />
                  <path d="M14 4.5V9h4" />
                </svg>
                选择文件导入
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".md,.markdown,.txt,.text"
                style={{ display: "none" }}
                onChange={(e) => {
                  readFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
            <textarea
              id="incubate-doc"
              className="textarea incubate-doc-input"
              value={doc}
              onChange={(e) => {
                setDoc(e.target.value);
                setError("");
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                readFile(e.dataTransfer.files?.[0]);
              }}
              placeholder={"粘贴文档正文，或点击「选择文件导入」读取 .md / .txt 文件\n\n# 项目：XXX\n\n## 目标\n做一个……\n\n## 功能需求\n1. 用户登录\n2. ……"}
            />
          </div>
          {error && <p className="incubate-error">{error}</p>}
        </>
      )}

      {stage === "parsing" && (
        <div className="incubate-loading">
          <span className="incubate-spinner" aria-hidden="true" />
          <p>AI 正在阅读文档、拆解任务清单…</p>
          <p className="incubate-loading-sub">通常需要 10~30 秒，请稍候</p>
        </div>
      )}

      {stage === "preview" && plan && (
        <div className="incubate-preview">
          <div className="field">
            <label className="field-label" htmlFor="incubate-name">项目名称</label>
            <input
              id="incubate-name"
              className="input"
              value={plan.name}
              maxLength={30}
              onChange={(e) => updatePlan({ name: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="incubate-desc">项目描述</label>
            <input
              id="incubate-desc"
              className="input"
              value={plan.description}
              maxLength={80}
              onChange={(e) => updatePlan({ description: e.target.value })}
            />
          </div>

          {(assets.commands.length > 0 || assets.templates.length > 0) && (
            <div className="incubate-assets">
              <div className="incubate-tasks-head">
                <span className="field-label">推荐关联资产（勾选后关联到新项目）</span>
                <span className="field-hint">根据文档内容匹配的指令与模板，可在资源库继续补充</span>
              </div>
              {assets.commands.length > 0 && (
                <div className="incubate-asset-group">
                  <span className="incubate-asset-type">🤖 指令</span>
                  {assets.commands.map((a) => (
                    <label className={`incubate-asset${pickedAssets.has(a.id) ? " picked" : ""}`} key={a.id}>
                      <input
                        type="checkbox"
                        checked={pickedAssets.has(a.id)}
                        onChange={() => {
                          setPickedAssets((prev) => {
                            const next = new Set(prev);
                            if (next.has(a.id)) next.delete(a.id);
                            else next.add(a.id);
                            return next;
                          });
                        }}
                      />
                      <b>{a.name}</b>
                      {a.description && <em>{a.description}</em>}
                    </label>
                  ))}
                </div>
              )}
              {assets.templates.length > 0 && (
                <div className="incubate-asset-group">
                  <span className="incubate-asset-type">📄 模板</span>
                  {assets.templates.map((a) => (
                    <label className={`incubate-asset${pickedAssets.has(a.id) ? " picked" : ""}`} key={a.id}>
                      <input
                        type="checkbox"
                        checked={pickedAssets.has(a.id)}
                        onChange={() => {
                          setPickedAssets((prev) => {
                            const next = new Set(prev);
                            if (next.has(a.id)) next.delete(a.id);
                            else next.add(a.id);
                            return next;
                          });
                        }}
                      />
                      <b>{a.name}</b>
                      {a.description && <em>{a.description}</em>}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="incubate-tasks-head">
            <span className="field-label">任务清单（{plan.tasks.length} 个任务，可修改）</span>
            <span className="field-hint">产物路径 = 该任务完成后应产出的文件/目录，每行一条「类型: 路径」</span>
          </div>
          <div className="incubate-tasks">
            {plan.tasks.map((t, i) => (
              <div className="incubate-task" key={i}>
                <div className="incubate-task-row">
                  <span className="incubate-task-no">{i + 1}</span>
                  <input
                    className="input"
                    value={t.title}
                    maxLength={40}
                    onChange={(e) => updateTask(i, { title: e.target.value })}
                  />
                  <select
                    className="select"
                    value={t.group}
                    onChange={(e) => updateTask(i, { group: e.target.value as IncubateTask["group"] })}
                  >
                    {GROUP_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  className="input incubate-task-desc"
                  value={t.description}
                  maxLength={120}
                  placeholder="任务说明（可选）"
                  onChange={(e) => updateTask(i, { description: e.target.value })}
                />
                <textarea
                  className="textarea incubate-task-arts"
                  value={artifactsToText(t.artifacts)}
                  placeholder={"产物路径（可选），例如：\nfile: src/api/auth.ts\nfolder: src/services/auth/\nglob: tests/auth/**"}
                  onChange={(e) => updateTask(i, { artifacts: textToArtifacts(e.target.value) })}
                />
              </div>
            ))}
          </div>
          {error && <p className="incubate-error">{error}</p>}
        </div>
      )}

      <div className="modal-foot" style={{ marginTop: 4 }}>
        <button className="btn btn-soft" onClick={close} disabled={stage === "parsing" || stage === "creating"}>
          取消
        </button>
        {stage === "input" && (
          <button className="btn btn-primary" onClick={parse}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
              <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
              <path d="M19 15l.9 2.4L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.6z" />
            </svg>
            开始解析
          </button>
        )}
        {stage === "preview" && (
          <button className="btn btn-primary" onClick={create}>
            确认创建（{plan?.tasks.length ?? 0} 个任务）
          </button>
        )}
      </div>
    </Modal>
  );
}
