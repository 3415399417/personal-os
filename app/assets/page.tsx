"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/common/PageHead";
import { Modal } from "@/components/common/Modal";
import { EmptyState } from "@/components/common/EmptyState";
import { createAsset, deleteAsset, getAssets, getProjects, updateAsset } from "@/lib/api";
import type { Asset, AssetKind, Project } from "@/types";

const KINDS: AssetKind[] = ["SOP", "Prompt", "Skill", "项目记忆", "复盘记录"];

/** 分类视觉元数据：专属颜色 + 图标 + 用途说明（卡片标签/统计条/新建弹窗统一使用） */
const KIND_META: Record<AssetKind, { icon: string; color: string; bg: string; border: string; desc: string }> = {
  SOP: { icon: "📋", color: "#1D4ED8", bg: "#DBEAFE", border: "#BFDBFE", desc: "做事的标准流程/步骤，如：周报 SOP、发布扩展步骤" },
  Prompt: { icon: "🤖", color: "#7C3AED", bg: "#EDE9FE", border: "#DDD6FE", desc: "给 AI 用的提示词模板，如：客户分析 Prompt、周报生成 Prompt" },
  Skill: { icon: "🛠️", color: "#15803D", bg: "#DCFCE7", border: "#BBF7D0", desc: "技能/技术要点，如：Electron 打包要点、Manifest V3 权限坑" },
  项目记忆: { icon: "🧠", color: "#C2410C", bg: "#FFEDD5", border: "#FED7AA", desc: "项目专属的踩坑/决策，如：ToneSub 项目踩坑记录" },
  复盘记录: { icon: "📝", color: "#B91C1C", bg: "#FEE2E2", border: "#FECACA", desc: "复盘沉淀的结论，如：外贸AI系统复盘、8 月复盘要点" },
};

/** 分类记忆口诀（新建弹窗提示） */
const KIND_MNEMONIC = "流程→SOP，问AI→Prompt，会做事→Skill，项目专属→项目记忆，复盘结论→复盘记录";

/** 按分类的输入模板引导（P3：不同资产类型不同结构） */
const KIND_PLACEHOLDER: Record<AssetKind, string> = {
  SOP: "步骤化流程：\n1. 触发场景\n2. 操作步骤\n3. 注意事项",
  Prompt: "用途：\nPrompt 正文：\n使用示例：",
  Skill: "技能名称：\n适用场景：\n关键能力 / 输出：",
  项目记忆: "这个项目踩过的坑、关键决策、可复用经验…",
  复盘记录: "复盘周期：\n总结：\n亮点 / 不足：\n下一步：",
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<"全部" | AssetKind>("全部");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [kind, setKind] = useState<AssetKind>("SOP");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [assetProjectId, setAssetProjectId] = useState("");
  // 查看 / 编辑
  const [viewing, setViewing] = useState<Asset | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editKind, setEditKind] = useState<AssetKind>("SOP");
  const [editContent, setEditContent] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [saving, setSaving] = useState(false);
  // 删除资产
  const [confirmDel, setConfirmDel] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    load();
    getProjects().then(setProjects).catch(() => {});
  }, []);

  const load = () => getAssets().then(setAssets);

  const shown = (filter === "全部" ? assets : assets.filter((a) => a.kind === filter)).filter(
    (a) => !query.trim() || a.title.includes(query.trim()) || a.summary.includes(query.trim()),
  );
  const counts = Object.fromEntries(
    KINDS.map((k) => [k, assets.filter((a) => a.kind === k).length]),
  ) as Record<AssetKind, number>;

  const projectName = (id?: string) => (id ? projects.find((p) => p.id === id)?.name ?? "" : "");

  const create = () => {
    const t = title.trim();
    if (!t || !summary.trim()) return;
    createAsset({ title: t, content: summary.trim(), kind, projectId: assetProjectId || undefined })
      .then(() => {
        setTitle(""); setSummary(""); setKind("SOP"); setAssetProjectId("");
        setModalOpen(false);
        window.dispatchEvent(new Event("betterlife:data-changed"));
        return load();
      })
      .catch(() => {});
  };

  const openView = (a: Asset) => {
    setViewing(a);
    setEditing(false);
  };

  const startEdit = () => {
    if (!viewing) return;
    setEditTitle(viewing.title);
    setEditKind(viewing.kind);
    setEditContent(viewing.summary);
    setEditProjectId(viewing.projectId ?? "");
    setEditing(true);
  };

  const saveEdit = () => {
    if (!viewing || saving) return;
    const t = editTitle.trim();
    if (!t || !editContent.trim()) return;
    setSaving(true);
    updateAsset(viewing.id, {
      title: t,
      kind: editKind,
      content: editContent.trim(),
      projectId: editProjectId || null,
    })
      .then(() => {
        setViewing(null);
        setEditing(false);
        window.dispatchEvent(new Event("betterlife:data-changed"));
        return load();
      })
      .catch(() => {})
      .finally(() => setSaving(false));
  };

  const doDelete = () => {
    if (!confirmDel || deleting) return;
    setDeleting(true);
    deleteAsset(confirmDel.id)
      .then(() => {
        setConfirmDel(null);
        setViewing(null);
        window.dispatchEvent(new Event("betterlife:data-changed"));
        return load();
      })
      .catch(() => {})
      .finally(() => setDeleting(false));
  };

  return (
    <AppShell>
      <div className="page">
      <PageHead title="长期资产" sub="SOP / Prompt / Skill / 记忆 / 复盘，持续积累">
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="12" height="12">
            <path d="M6 1v10M1 6h10" />
          </svg>
          新建资产
        </button>
      </PageHead>

      <div className="page-scroll">
        <div className="stat-strip">
          {KINDS.map((k) => {
            const meta = KIND_META[k];
            return (
              <button
                key={k}
                type="button"
                className="stat-cell"
                style={{ textAlign: "left", cursor: "pointer", borderColor: filter === k ? meta.color : undefined }}
                onClick={() => setFilter(filter === k ? "全部" : k)}
              >
                <b className="num" style={{ color: meta.color }}>{counts[k]}</b>
                <span>{meta.icon} {k}</span>
              </button>
            );
          })}
        </div>

        {filter !== "全部" && (
          <div className="filter-tabs">
            <button type="button" className="filter-tab" onClick={() => setFilter("全部")}>
              清除筛选（当前：{filter}）
            </button>
          </div>
        )}

        {/* 搜索（P2）：按标题/内容过滤 */}
        <div className="field" style={{ marginBottom: 10 }}>
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索资产标题或内容…"
            maxLength={60}
          />
        </div>

        {shown.length === 0 && (
          <div className="panel">
            <EmptyState
              icon="folder"
              title={query ? "没有匹配的资产" : filter === "全部" ? "还没有资产" : `「${filter}」下暂无资产`}
              sub="把可复用的 SOP、Prompt、Skill 沉淀下来"
              actionLabel="新建资产"
              onAction={() => setModalOpen(true)}
            />
          </div>
        )}
        <div className="card-grid">
          {shown.map((a) => (
            <article
              className="mini-card"
              key={a.id}
              role="button"
              tabIndex={0}
              style={{ cursor: "pointer", textAlign: "left" }}
              onClick={() => openView(a)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openView(a);
                }
              }}
            >
              <div className="mini-card-top">
                <div
                  className="mini-ico"
                  style={{
                    background: KIND_META[a.kind].bg,
                    color: KIND_META[a.kind].color,
                    border: `1px solid ${KIND_META[a.kind].border}`,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{KIND_META[a.kind].icon}</span>
                </div>
                <span
                  className="badge"
                  style={{
                    background: KIND_META[a.kind].bg,
                    color: KIND_META[a.kind].color,
                    borderColor: KIND_META[a.kind].border,
                  }}
                >
                  {KIND_META[a.kind].icon} {a.kind}
                </span>
              </div>
              <h3 className="mini-card-title">{a.title}</h3>
              <p className="mini-card-desc asset-card-desc">{a.summary}</p>
              <div className="mini-card-foot">
                <span className="mini-card-meta">
                  {a.time}
                  {projectName(a.projectId) ? ` · 📎 ${projectName(a.projectId)}` : ""} · 点击查看
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* 资产详情：查看 / 编辑 */}
      <Modal
        title={editing ? "编辑资产" : "资产详情"}
        open={!!viewing}
        onClose={() => {
          setViewing(null);
          setEditing(false);
        }}
        closeButton={false}
        foot={
          editing ? (
            <>
              <button className="btn btn-soft" onClick={() => setEditing(false)}>取消</button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>
                {saving ? "保存中…" : "保存"}
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-danger"
                style={{ marginRight: "auto" }}
                onClick={() => {
                  setConfirmDel(viewing);
                  setViewing(null);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                  <path d="M4 7h16M10 4h4M8 7v13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7M9 11v5M15 11v5" />
                </svg>
                删除
              </button>
              <button className="btn btn-soft" onClick={startEdit}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                  <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z" />
                  <path d="M13.5 6.5l3 3" />
                </svg>
                编辑
              </button>
              <button className="btn btn-soft" onClick={() => setViewing(null)}>关闭</button>
            </>
          )
        }
      >
        {viewing &&
          (editing ? (
            <>
              <div className="field">
                <label className="field-label" htmlFor="ea-kind">分类</label>
                <select id="ea-kind" className="select" value={editKind} onChange={(e) => setEditKind(e.target.value as AssetKind)}>
                  {KINDS.map((k) => (
                    <option key={k} value={k}>{KIND_META[k].icon} {k}</option>
                  ))}
                </select>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    lineHeight: 1.5,
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: KIND_META[editKind].bg,
                    color: KIND_META[editKind].color,
                    border: `1px solid ${KIND_META[editKind].border}`,
                  }}
                >
                  <b>{KIND_META[editKind].icon} {editKind}</b>：{KIND_META[editKind].desc}
                </div>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="ea-title">标题</label>
                <input id="ea-title" className="input" autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={40} />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="ea-content">内容</label>
                <textarea
                  id="ea-content"
                  className="textarea"
                  style={{ minHeight: 150 }}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder={KIND_PLACEHOLDER[editKind]}
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="ea-project">关联项目（可选）</label>
                <select id="ea-project" className="select" value={editProjectId} onChange={(e) => setEditProjectId(e.target.value)}>
                  <option value="">不关联</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <b style={{ fontSize: 14 }}>{viewing.title}</b>
                <span
                  className="badge"
                  style={{
                    background: KIND_META[viewing.kind].bg,
                    color: KIND_META[viewing.kind].color,
                    borderColor: KIND_META[viewing.kind].border,
                  }}
                >
                  {KIND_META[viewing.kind].icon} {viewing.kind}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 10 }}>
                {viewing.time}
                {projectName(viewing.projectId) ? ` · 📎 关联项目：${projectName(viewing.projectId)}` : ""}
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {viewing.summary}
              </div>
            </div>
          ))}
      </Modal>

      {/* 新建资产 */}
      <Modal
        title="新建资产"
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
          <label className="field-label" htmlFor="na-kind">分类</label>
          <select id="na-kind" className="select" value={kind} onChange={(e) => setKind(e.target.value as AssetKind)}>
            {KINDS.map((k) => (
              <option key={k} value={k}>{KIND_META[k].icon} {k}</option>
            ))}
          </select>
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              lineHeight: 1.5,
              padding: "6px 10px",
              borderRadius: 8,
              background: KIND_META[kind].bg,
              color: KIND_META[kind].color,
              border: `1px solid ${KIND_META[kind].border}`,
            }}
          >
            <b>{KIND_META[kind].icon} {kind}</b>：{KIND_META[kind].desc}
          </div>
          <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--muted)" }}>{KIND_MNEMONIC}</div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="na-title">标题</label>
          <input id="na-title" className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="资产标题" maxLength={40} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="na-summary">内容</label>
          <textarea
            id="na-summary"
            className="textarea"
            style={{ minHeight: 130 }}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={KIND_PLACEHOLDER[kind]}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="na-project">关联项目（可选）</label>
          <select id="na-project" className="select" value={assetProjectId} onChange={(e) => setAssetProjectId(e.target.value)}>
            <option value="">不关联</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </Modal>

      {/* 删除资产确认 */}
      <Modal
        title="删除资产"
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        foot={
          <>
            <button className="btn btn-soft" onClick={() => setConfirmDel(null)}>取消</button>
            <button className="btn btn-danger" onClick={doDelete} disabled={deleting}>
              {deleting ? "删除中…" : "删除"}
            </button>
          </>
        }
      >
        <p style={{ fontSize: 12, color: "var(--fg)", lineHeight: 1.6 }}>
          确认删除资产「<b>{confirmDel?.title}</b>」？此操作不可恢复。
        </p>
      </Modal>
      </div>
    </AppShell>
  );
}
