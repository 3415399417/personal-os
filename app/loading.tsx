/** 全局路由切换骨架屏：切页时立即显示，避免白屏等待 */
export default function Loading() {
  return (
    <div className="page">
      <div className="page-scroll" style={{ gap: 10 }}>
        <div
          style={{
            height: 180,
            borderRadius: 16,
            background: "linear-gradient(100deg, var(--surface-deep) 40%, var(--accent-tint) 50%, var(--surface-deep) 60%)",
            backgroundSize: "200% 100%",
            animation: "betterlife-shimmer 1.2s infinite linear",
          }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 150,
                borderRadius: 16,
                background: "linear-gradient(100deg, var(--surface-deep) 40%, var(--accent-tint) 50%, var(--surface-deep) 60%)",
                backgroundSize: "200% 100%",
                animation: "betterlife-shimmer 1.2s infinite linear",
                animationDelay: `${i * 0.12}s`,
              }}
            />
          ))}
        </div>
        <div
          style={{
            height: 220,
            borderRadius: 16,
            background: "linear-gradient(100deg, var(--surface-deep) 40%, var(--accent-tint) 50%, var(--surface-deep) 60%)",
            backgroundSize: "200% 100%",
            animation: "betterlife-shimmer 1.2s infinite linear",
            animationDelay: "0.24s",
          }}
        />
      </div>
    </div>
  );
}
