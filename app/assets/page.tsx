"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/common/PageHead";
import { Modal } from "@/components/common/Modal";
import { EmptyState } from "@/components/common/EmptyState";
import { createAsset, getAssets } from "@/lib/api";
import type { Asset, AssetKind } from "@/types";

const KINDS: AssetKind[] = ["SOP", "Prompt", "Skill", "项目记忆", "复盘记录"];

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filter, setFilter] = useState<"全部" | AssetKind>("全部");
  const [modalOpen, setModalOpen] = useState(false);
  const [kind, setKind] = useState<AssetKind>("SOP");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = () => getAssets().then(setAssets);

  const shown = filter === "全部" ? assets : assets.filter((a) => a.kind === filter);
  const counts = Object.fromEntries(
    KINDS.map((k) => [k, assets.filter((a) => a.kind === k).length]),
  ) as Record<AssetKind, number>;

  const create = () => {
    const t = title.trim();
    if (!t || !summary.trim()) return;
    createAsset({ title: t, content: summary.trim(), kind })
      .then(() => {
        setTitle(""); setSummary(""); setKind("SOP");
        setModalOpen(false);
        return load();
      })
      .catch(() => {});
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
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              className={`stat-cell${filter === k ? "" : ""}`}
              style={{ textAlign: "left", cursor: "pointer", borderColor: filter === k ? "var(--accent-light)" : undefined }}
              onClick={() => setFilter(filter === k ? "全部" : k)}
            >
              <b className="num">{counts[k]}</b>
              <span>{k}</span>
            </button>
          ))}
        </div>

        {filter !== "全部" && (
          <div className="filter-tabs">
            <button type="button" className="filter-tab" onClick={() => setFilter("全部")}>
              清除筛选（当前：{filter}）
            </button>
          </div>
        )}

        {shown.length === 0 && (
          <div className="panel">
            <EmptyState
              icon="folder"
              title={filter === "全部" ? "还没有资产" : `「${filter}」下暂无资产`}
              sub="把可复用的 SOP、Prompt、Skill 沉淀下来"
              actionLabel="新建资产"
              onAction={() => setModalOpen(true)}
            />
          </div>
        )}
        <div className="card-grid">
          {shown.map((a) => (
            <article className="mini-card" key={a.id}>
              <div className="mini-card-top">
                <div className="mini-ico">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 4h9l4 4v12H6z" />
                    <path d="M14 4v4h4" />
                  </svg>
                </div>
                <span className="badge">{a.kind}</span>
              </div>
              <h3 className="mini-card-title">{a.title}</h3>
              <p className="mini-card-desc">{a.summary}</p>
              <div className="mini-card-foot">
                <span className="mini-card-meta">{a.time}</span>
              </div>
            </article>
          ))}
        </div>
      </div>

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
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="na-title">标题</label>
          <input id="na-title" className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="资产标题" maxLength={40} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="na-summary">摘要</label>
          <textarea id="na-summary" className="textarea" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="这条资产的价值是什么？" />
        </div>
      </Modal>
      </div>
    </AppShell>
  );
}
