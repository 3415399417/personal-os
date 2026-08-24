"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHead } from "@/components/common/PageHead";
import { Modal } from "@/components/common/Modal";
import { EmptyState } from "@/components/common/EmptyState";
import { createResourceEntry, deleteResource, getResources } from "@/lib/api";

/** 资源子页面：领域库 / 知识库 / 指令库 / 模板库（共用组件，按 type 区分语义） */
const TYPE_META: Record<string, { title: string; sub: string; empty: string; placeholder: string }> = {
  domain: {
    title: "领域库",
    sub: "外部参考资料：关注领域的资料与链接",
    empty: "记录你关注的领域参考资料，如：海关数据平台、物流渠道对比",
    placeholder: "如：海关数据平台、外贸开发信参考网站",
  },
  knowledge: {
    title: "知识库",
    sub: "整理过的知识点与概念沉淀",
    empty: "沉淀你消化过的知识点，如：什么是 RAG、MCP 协议笔记",
    placeholder: "如：Next.js 服务端组件原理",
  },
  command: {
    title: "指令库",
    sub: "可直接使用的 AI 指令与操作流程",
    empty: "存下常用的 AI 指令与操作步骤，用时直接抄",
    placeholder: "如：写日报的指令、给 Harness 的开发指令",
  },
  template: {
    title: "模板库",
    sub: "拿来就填的文档与文案模板",
    empty: "存放格式骨架：周报、复盘、开发文档、跟进邮件",
    placeholder: "如：周报模板、项目复盘模板",
  },
};

interface ResourceItem {
  id: string;
  name: string;
  description: string;
  time: string;
}

export default function ResourceTypePage() {
  const { type } = useParams<{ type: string }>();
  const meta = TYPE_META[type] ?? TYPE_META.domain;
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => {
    load();
  }, [type]);

  const load = () => getResources(type).then(setItems);

  const create = () => {
    const v = name.trim();
    if (!v) return;
    createResourceEntry({ name: v, type, description: desc.trim() })
      .then(() => {
        setName("");
        setDesc("");
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

  return (
    <AppShell>
      <div className="page">
        <PageHead title={meta.title} sub={meta.sub}>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
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
                onAction={() => setModalOpen(true)}
              />
            </div>
          ) : (
            <div className="panel">
              <ul className="note-list">
                {items.map((r) => (
                  <li className="note-item" key={r.id}>
                    <span className="note-ico">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4l2 2.5h8A1.5 1.5 0 0 1 20.5 9.5V18A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z" />
                      </svg>
                    </span>
                    <div className="res-item-body">
                      <b>{r.name}</b>
                      {r.description && <em>{r.description}</em>}
                      <span className="res-item-time">{r.time}</span>
                    </div>
                    <button
                      type="button"
                      className="task-del"
                      aria-label={`删除：${r.name}`}
                      title="删除条目"
                      onClick={() => remove(r.id)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 7h16M10 4h4M8 7v13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7M9 11v5M15 11v5" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
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
            <input id="rr-name" className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={meta.placeholder} maxLength={60} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="rr-desc">说明</label>
            <textarea id="rr-desc" className="textarea" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="补充说明：为什么有用、怎么用、链接等" maxLength={300} />
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
