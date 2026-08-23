"use client";

import { useEffect, useState } from "react";
import { getNotes, createNote, updateNote } from "@/lib/api";
import type { Note } from "@/types";

/** 生活与自我（参考图样式）：标题粉色爱心 + 4 行像素贴纸图标+名称+描述 + 右下角躺椅插画 + 底部寄语 + 今日一句话 */
const ITEMS = [
  {
    id: "f1",
    label: "家庭",
    desc: "陪伴是最好的礼物",
    img: "/art/life-family.png",
  },
  {
    id: "f2",
    label: "健康",
    desc: "运动 + 睡眠 + 饮食",
    img: "/art/life-health.png",
  },
  {
    id: "f3",
    label: "精力",
    desc: "专注创造高质量输出",
    img: "/art/life-energy.png",
  },
  {
    id: "f4",
    label: "成长",
    desc: "每天进步一点点",
    img: "/art/life-growth.png",
  },
];

export function LifeCard() {
  // 今日一句话（存 Note type=life，title=日期）
  const [lifeNote, setLifeNote] = useState<Note | null>(null);
  const [lifeText, setLifeText] = useState("");
  const [lifeEditing, setLifeEditing] = useState(false);
  const [lifeLoaded, setLifeLoaded] = useState(false);

  useEffect(() => {
    getNotes()
      .then((notes) => {
        const today = new Date();
        const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const found = notes.find((n) => n.type === "生活" && n.title === key) ?? null;
        setLifeNote(found);
        setLifeText(found?.content ?? "");
      })
      .catch(() => {})
      .finally(() => setLifeLoaded(true));
  }, []);

  const saveLife = () => {
    const text = lifeText.trim();
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const p = text
      ? lifeNote
        ? updateNote(lifeNote.id, { content: text })
        : createNote({ title: key, content: text, type: "life" }).then((n) => setLifeNote(n))
      : Promise.resolve();
    p.then(() => setLifeEditing(false)).catch(() => {});
  };

  return (
    <article className="card" data-od-id="card-life">
      <div className="card-head">
        <div className="card-title-row">
          <img src="/art/title-life.png" alt="" className="card-title-ico" />
          <h2 className="card-title">生活与自我</h2>
        </div>
      </div>

      {/* 标题下横线（与今日执行一致） */}
      <div className="exec-divider" aria-hidden="true" />

      <ul className="life-list">
        {ITEMS.map((it) => (
          <li className="life-item" key={it.id}>
            <img src={it.img} alt="" className="life-item-ico" aria-hidden="true" />
            <b>{it.label}</b>
            <em>{it.desc}</em>
          </li>
        ))}
      </ul>

      {/* 底部：横线 + 今日一句话 + 寄语 */}
      <div className="card-foot life-foot">
        {lifeEditing ? (
          <div className="life-quote-edit">
            <input
              className="life-quote-input"
              value={lifeText}
              placeholder="今天过得怎么样？一句话…"
              maxLength={60}
              autoFocus
              onChange={(e) => setLifeText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveLife();
                if (e.key === "Escape") setLifeEditing(false);
              }}
            />
            <button className="life-quote-save" onClick={saveLife}>✓</button>
          </div>
        ) : lifeLoaded && lifeText ? (
          <button className="life-quote" title="点击修改" onClick={() => setLifeEditing(true)}>
            <span className="life-quote-mark">"</span>
            {lifeText}
          </button>
        ) : (
          <button className="life-quote life-quote-empty" onClick={() => setLifeEditing(true)}>
            ✎ 今天过得怎么样？写一句话
          </button>
        )}
        <span className="life-foot-text">记录生活，自我觉察</span>
      </div>

      {/* 右下角插画：躺椅休息像素角色 */}
      <img src="/art/life-relax.png" alt="" className="card-art life-art" aria-hidden="true" />
    </article>
  );
}
