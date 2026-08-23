/** 极简 Markdown 预览（标题/引用/列表/加粗/行内代码 渲染，无外部依赖）—— 笔记页与项目详情页共用 */
const MONO = "ui-monospace, SFMono-Regular, Consolas, 'Courier New', monospace";

/** 行内解析：`代码` 高亮 + **加粗** */
function renderInline(text: string, keyPrefix: string, codeSize = 11): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    const k = `${keyPrefix}${i}`;
    if (p.startsWith("`") && p.endsWith("`") && p.length > 2) {
      return (
        <code
          key={k}
          style={{
            fontFamily: MONO,
            fontSize: codeSize,
            background: "var(--accent-tint)",
            color: "var(--accent-deep)",
            padding: "1px 5px",
            borderRadius: 5,
            wordBreak: "break-all",
          }}
        >
          {p.slice(1, -1)}
        </code>
      );
    }
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4) {
      return (
        <strong key={k} style={{ fontWeight: 700, color: "var(--fg)" }}>
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <span key={k}>{p}</span>;
  });
}

/** 极简 Markdown 预览（标题/引用/列表/加粗/行内代码 渲染，无外部依赖）—— 笔记页与项目详情页共用 */
export function MarkdownPreview({ content, size }: { content: string; size?: number }) {
  // 字号基准：不传 size 时保持原样式；传入时正文=size，标题等比放大
  const bodySize = size ?? 12.5;
  const h1Size = size ? bodySize + 2.5 : 15;
  const h2Size = size ? bodySize + 0.5 : 13;
  const quoteSize = size ? bodySize - 0.5 : 12;
  const codeSize = size ? bodySize - 1.5 : 11;
  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  lines.forEach((line, i) => {
    const key = `l${i}`;
    if (line.startsWith("# ")) {
      nodes.push(
        <div key={key} style={{ display: "flex", alignItems: "center", gap: 7, margin: "6px 0 4px" }}>
          <span
            style={{
              flex: "none",
              width: 4,
              height: 14,
              borderRadius: 2,
              background: "var(--accent)",
            }}
          />
          <p style={{ fontSize: h1Size, fontWeight: 700, color: "var(--fg)", lineHeight: 1.4, margin: 0 }}>
            {renderInline(line.slice(2), `${key}h`, codeSize)}
          </p>
        </div>,
      );
    } else if (line.startsWith("## ")) {
      nodes.push(
        <p key={key} style={{ fontSize: h2Size, fontWeight: 700, color: "var(--accent-deep)", margin: "5px 0 3px", lineHeight: 1.4 }}>
          {renderInline(line.slice(3), `${key}h`, codeSize)}
        </p>,
      );
    } else if (line.startsWith("> ")) {
      nodes.push(
        <p
          key={key}
          style={{
            fontSize: quoteSize,
            color: "var(--accent-deep)",
            borderLeft: "3px solid var(--accent-light)",
            background: "var(--accent-tint)",
            padding: "6px 10px",
            borderRadius: "0 8px 8px 0",
            margin: "4px 0",
            lineHeight: 1.7,
          }}
        >
          {renderInline(line.slice(2), `${key}q`, codeSize)}
        </p>,
      );
    } else if (line.startsWith("- ")) {
      nodes.push(
        <p key={key} style={{ fontSize: bodySize, color: "var(--fg)", margin: "3px 0", paddingLeft: 14, lineHeight: 1.7, display: "flex", gap: 8, alignItems: "baseline" }}>
          <span
            style={{
              flex: "none",
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--accent)",
              alignSelf: "center",
            }}
          />
          <span>{renderInline(line.slice(2), `${key}l`, codeSize)}</span>
        </p>,
      );
    } else if (line.trim()) {
      nodes.push(
        <p key={key} style={{ fontSize: bodySize, color: "var(--fg)", margin: "4px 0", lineHeight: 1.75 }}>
          {renderInline(line, `${key}p`, codeSize)}
        </p>,
      );
    } else {
      nodes.push(<div key={key} style={{ height: 6 }} />);
    }
  });
  return <>{nodes}</>;
}
