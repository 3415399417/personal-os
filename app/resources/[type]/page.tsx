"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHead } from "@/components/common/PageHead";
import { Modal } from "@/components/common/Modal";
import { EmptyState } from "@/components/common/EmptyState";
import { MarkdownPreview } from "@/components/common/MarkdownPreview";
import { createResourceEntry, deleteResource, getProjects, getResources } from "@/lib/api";

/** 资源子页面：领域库(去) / 知识库(读) / 指令库(抄) / 模板库(填)——四个不同视图，共用数据层 */

interface ResourceItem {
  id: string;
  name: string;
  description: string;
  url: string;
  time: string;
  projectId: string | null;
  projectName: string;
}

const TYPE_META: Record<string, { title: string; sub: string; empty: string }> = {
  domain: {
    title: "领域库",
    sub: "外部参考资料：关注领域的资料与链接",
    empty: "记录你关注的领域参考资料，如：海关数据平台、物流渠道对比",
  },
  knowledge: {
    title: "知识库",
    sub: "整理过的知识点与概念沉淀",
    empty: "沉淀你消化过的知识点，如：什么是 RAG、MCP 协议笔记",
  },
  command: {
    title: "指令库",
    sub: "可直接使用的 AI 指令与操作流程",
    empty: "存下常用的 AI 指令与操作步骤，用时直接抄",
  },
  template: {
    title: "模板库",
    sub: "拿来就填的文档与文案模板",
    empty: "存放格式骨架：周报、复盘、开发文档、跟进邮件",
  },
};

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** 复制到剪贴板 + 按钮反馈 */
function CopyButton({ text, label = "复制" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`btn btn-soft res-copy-btn${copied ? " copied" : ""}`}
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {});
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "✓ 已复制" : `📋 ${label}`}
    </button>
  );
}

/** 关联项目小标签（资源归属显示） */
function ProjTag({ name }: { name: string }) {
  if (!name) return null;
  return <span className="res-proj-tag" title={`关联项目：${name}`}>📁 {name}</span>;
}

/** 领域库：书签卡片 + 打开链接 */
function DomainView({ items, onDelete }: { items: ResourceItem[]; onDelete: (id: string) => void }) {
  return (
    <div className="res-grid-cards">
      {items.map((r) => (
        <article className="mini-card res-domain-card" key={r.id}>
          <div className="mini-card-top">
            <div className="mini-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
                <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
              </svg>
            </div>
            <span className="res-domain-host" title={r.url || "无链接"}>{r.url ? hostOf(r.url) : "无链接"}</span>
          </div>
          <h3 className="mini-card-title">{r.name}</h3>
          <p className="mini-card-desc">{r.description || "（未填写说明）"}</p>
          <div className="mini-card-foot">
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
              <span className="mini-card-meta">{r.time}</span>
              <ProjTag name={r.projectName} />
            </span>
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {r.url && (
                <a
                  className="btn btn-primary res-open-btn"
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  打开 ↗
                </a>
              )}
              <button type="button" className="task-del" aria-label={`删除：${r.name}`} title="删除" onClick={() => onDelete(r.id)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7h16M10 4h4M8 7v13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7M9 11v5M15 11v5" />
                </svg>
              </button>
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

/** 知识库：条目列表 + 点击弹窗读全文（Markdown） */
function KnowledgeView({
  items,
  viewing,
  onView,
  onClose,
  onDelete,
}: {
  items: ResourceItem[];
  viewing: ResourceItem | null;
  onView: (r: ResourceItem) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <div className="panel">
        <ul className="note-list">
          {items.map((r) => (
            <li
              className="note-item res-know-item"
              key={r.id}
              role="button"
              tabIndex={0}
              style={{ cursor: "pointer" }}
              onClick={() => onView(r)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onView(r);
              }}
            >
              <span className="note-ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 4.5h9l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V6A1.5 1.5 0 0 1 6 4.5z" />
                  <path d="M14 4.5V9h4" />
                </svg>
              </span>
              <div className="res-item-body">
                <b>{r.name}</b>
                {r.description && <em>{r.description.replace(/[#>*`\-\[\]]/g, "").slice(0, 80)}</em>}
                <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span className="res-item-time">{r.time}</span>
                  <ProjTag name={r.projectName} />
                </span>
              </div>
              <button
                type="button"
                className="task-del"
                aria-label={`删除：${r.name}`}
                title="删除"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(r.id);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7h16M10 4h4M8 7v13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7M9 11v5M15 11v5" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <Modal
        title={viewing?.name ?? "知识条目"}
        open={!!viewing}
        onClose={onClose}
        foot={
          <button className="btn btn-ghost" onClick={onClose}>关闭</button>
        }
      >
        <div className="res-know-view">
          <span className="res-know-time">{viewing?.time}</span>
          <MarkdownPreview content={viewing?.description ?? ""} />
        </div>
      </Modal>
    </>
  );
}

/** 指令库：代码块样式 + 一键复制 */
function CommandView({ items, onDelete }: { items: ResourceItem[]; onDelete: (id: string) => void }) {
  return (
    <div className="res-cmd-list">
      {items.map((r) => (
        <article className="res-cmd-card" key={r.id}>
          <div className="res-cmd-head">
            <b>{r.name}</b>
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <CopyButton text={r.description} label="复制指令" />
              <button type="button" className="task-del" aria-label={`删除：${r.name}`} title="删除" onClick={() => onDelete(r.id)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7h16M10 4h4M8 7v13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7M9 11v5M15 11v5" />
                </svg>
              </button>
            </span>
          </div>
          {r.description && <p className="res-cmd-use">{r.description.split("\n")[0].slice(0, 60) || "（无说明）"}</p>}
          <div className="res-cmd-meta">
            <span className="res-item-time">{r.time}</span>
            <ProjTag name={r.projectName} />
          </div>
          <pre className="res-cmd-body">{r.description || "（指令内容为空）"}</pre>
        </article>
      ))}
    </div>
  );
}

/** 模板库：模板卡片 + 预览 + 复制 */
function TemplateView({
  items,
  viewing,
  onView,
  onClose,
  onDelete,
}: {
  items: ResourceItem[];
  viewing: ResourceItem | null;
  onView: (r: ResourceItem) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <div className="res-grid-cards">
        {items.map((r) => (
          <article className="mini-card res-tpl-card" key={r.id}>
            <div className="mini-card-top">
              <div className="mini-ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 4.5h9l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V6A1.5 1.5 0 0 1 6 4.5z" />
                  <path d="M14 4.5V9h4" />
                  <path d="M8.5 13.5h7M8.5 16.5h4.5" />
                </svg>
              </div>
              <span className="badge">模板</span>
            </div>
            <h3 className="mini-card-title">{r.name}</h3>
            <p className="mini-card-desc">{r.description ? r.description.split("\n")[0].slice(0, 50) : "（未填写）"}</p>
            <div className="mini-card-foot">
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                <span className="mini-card-meta">{r.time}</span>
                <ProjTag name={r.projectName} />
              </span>
              <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button type="button" className="btn btn-soft res-tpl-preview" onClick={() => onView(r)}>预览</button>
                <CopyButton text={r.description} label="复制模板" />
                <button type="button" className="task-del" aria-label={`删除：${r.name}`} title="删除" onClick={() => onDelete(r.id)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7h16M10 4h4M8 7v13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7M9 11v5M15 11v5" />
                  </svg>
                </button>
              </span>
            </div>
          </article>
        ))}
      </div>
      <Modal
        title={viewing?.name ?? "模板预览"}
        open={!!viewing}
        onClose={onClose}
        foot={
          <>
            <button className="btn btn-soft" onClick={onClose}>关闭</button>
            <CopyButton text={viewing?.description ?? ""} label="复制模板" />
          </>
        }
      >
        <pre className="res-tpl-preview-body">{viewing?.description ?? ""}</pre>
      </Modal>
    </>
  );
}

export default function ResourceTypePage() {
  const { type } = useParams<{ type: string }>();
  const meta = TYPE_META[type] ?? TYPE_META.domain;
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [url, setUrl] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [viewing, setViewing] = useState<ResourceItem | null>(null);

  useEffect(() => {
    load();
  }, [type]);

  useEffect(() => {
    getProjects()
      .then((ps) => setProjects(ps.map((p) => ({ id: p.id, name: p.name }))))
      .catch(() => {});
  }, []);

  const load = () => getResources(type).then(setItems);

  const create = () => {
    const v = name.trim();
    if (!v) return;
    createResourceEntry({ name: v, type, description: desc.trim(), url: url.trim(), projectId: projectId || null })
      .then(() => {
        setName("");
        setDesc("");
        setUrl("");
        setProjectId("");
        setModalOpen(false);
        window.dispatchEvent(new Event("betterlife:data-changed"));
        return load();
      })
      .catch(() => {});
  };

  const remove = (id: string) => {
    deleteResource(id)
      .then(() => {
        window.dispatchEvent(new Event("betterlife:data-changed"));
        return load();
      })
      .catch(() => {});
  };

  const openNew = () => {
    setName("");
    setDesc("");
    setUrl("");
    setProjectId("");
    setModalOpen(true);
  };

  const placeholders: Record<string, { name: string; desc: string }> = {
    domain: { name: "如：海关数据平台、外贸开发信参考网站", desc: "这个资料为什么有用？" },
    knowledge: { name: "如：什么是 RAG", desc: "知识点内容，支持 Markdown（# 标题、- 列表、> 引用）" },
    command: { name: "如：写日报的指令", desc: "指令全文：可直接粘贴给 AI 使用的完整话术" },
    template: { name: "如：周报模板", desc: "模板全文：可复制填空的完整骨架" },
  };
  const ph = placeholders[type] ?? placeholders.domain;

  return (
    <AppShell>
      <div className="page">
        <PageHead title={meta.title} sub={meta.sub}>
          <button className="btn btn-primary" onClick={openNew}>
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="12" height="12">
              <path d="M6 1v10M1 6h10" />
            </svg>
            新建条目
          </button>
        </PageHead>

        <div className="page-scroll">
          {items.length === 0 ? (
            <div className="panel">
              <EmptyState
                icon="folder"
                title={`${meta.title}还是空的`}
                sub={meta.empty}
                actionLabel="新建条目"
                onAction={openNew}
              />
            </div>
          ) : type === "domain" ? (
            <DomainView items={items} onDelete={remove} />
          ) : type === "knowledge" ? (
            <KnowledgeView items={items} viewing={viewing} onView={setViewing} onClose={() => setViewing(null)} onDelete={remove} />
          ) : type === "command" ? (
            <CommandView items={items} onDelete={remove} />
          ) : (
            <TemplateView items={items} viewing={viewing} onView={setViewing} onClose={() => setViewing(null)} onDelete={remove} />
          )}
        </div>

        <Modal
          title={`新建${meta.title}条目`}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          foot={
            <>
              <button className="btn btn-soft" onClick={() => setModalOpen(false)}>取消</button>
              <button className="btn btn-primary" onClick={create}>保存</button>
            </>
          }
        >
          <div className="field">
            <label className="field-label" htmlFor="rr-name">名称</label>
            <input id="rr-name" className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={ph.name} maxLength={60} />
          </div>
          {type === "domain" && (
            <div className="field">
              <label className="field-label" htmlFor="rr-url">链接</label>
              <input id="rr-url" className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" maxLength={300} />
            </div>
          )}
          <div className="field">
            <label className="field-label" htmlFor="rr-proj">关联项目（可选）</label>
            <select id="rr-proj" className="select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">不关联</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="rr-desc">
              {type === "knowledge" ? "内容" : type === "command" ? "指令内容" : type === "template" ? "模板内容" : "说明"}
            </label>
            <textarea
              id="rr-desc"
              className={`textarea${type === "knowledge" || type === "command" || type === "template" ? " res-desc-lg" : ""}`}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={ph.desc}
              maxLength={4000}
            />
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
