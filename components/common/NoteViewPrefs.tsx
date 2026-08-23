"use client";

import { useEffect, useState } from "react";
import { MarkdownPreview } from "@/components/common/MarkdownPreview";

/** 笔记查看偏好：字体（楷体/黑体/宋体）+ 字号（12/14/16/18），localStorage 记忆 */
const FONT_OPTIONS = [
  { label: "楷体", value: '"KaiTi", "楷体", "STKaiti", serif' },
  { label: "黑体", value: '-apple-system, "Microsoft YaHei", "PingFang SC", sans-serif' },
  { label: "宋体", value: '"SimSun", "Songti SC", serif' },
];
const SIZE_OPTIONS = [16, 18];

const LS_FONT = "noteViewFont";
const LS_SIZE = "noteViewSize";

export function NoteViewPrefs({ content }: { content: string }) {
  const [font, setFont] = useState(FONT_OPTIONS[0].value);
  const [size, setSize] = useState(16);

  // 读取上次偏好
  useEffect(() => {
    try {
      const f = localStorage.getItem(LS_FONT);
      const s = localStorage.getItem(LS_SIZE);
      if (f && FONT_OPTIONS.some((o) => o.value === f)) setFont(f);
      if (s && SIZE_OPTIONS.includes(Number(s))) setSize(Number(s));
    } catch {
      /* localStorage 不可用时忽略 */
    }
  }, []);

  const changeFont = (v: string) => {
    setFont(v);
    try {
      localStorage.setItem(LS_FONT, v);
    } catch {
      /* ignore */
    }
  };
  const changeSize = (n: number) => {
    setSize(n);
    try {
      localStorage.setItem(LS_SIZE, String(n));
    } catch {
      /* ignore */
    }
  };

  return (
    <div>
      {/* 显示设置工具栏 */}
      <div className="note-toolbar">
        <span className="note-toolbar-label">显示</span>
        <select className="select note-font-select" value={font} onChange={(e) => changeFont(e.target.value)} aria-label="字体">
          {FONT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="note-size-group" role="group" aria-label="字号">
          {SIZE_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              className={`note-size-btn${size === n ? " active" : ""}`}
              onClick={() => changeSize(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      {/* 笔记内容（应用字体/字号） */}
      <div style={{ fontFamily: font }}>
        <MarkdownPreview content={content} size={size} />
      </div>
    </div>
  );
}
