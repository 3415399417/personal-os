import Link from "next/link";
import type { DashboardData } from "@/types";

/** 资源中心（参考图样式）：标题蓝文件夹图标 + 7 分类 3+4 两行网格（名称+数字）+ hover 浅灰 + 底部进入资源中心 + 纸箱插画 */
export function ResourcesCard({ resources }: { resources: DashboardData["resources"] }) {
  return (
    <article className="card" data-od-id="card-resources">
      <div className="card-head">
        <div className="card-title-row">
          <img src="/art/title-resources.png" alt="" className="card-title-ico" />
          <h2 className="card-title">资源中心</h2>
        </div>
      </div>

      <div className="res-grid2">
        {resources.map((r) => (
          <Link href={r.href ?? "/"} className="res-row-cell" key={r.id} data-od-id={`res-${r.id}`}>
            <span>{r.label}</span>
            <b className="num">{r.count}</b>
          </Link>
        ))}
      </div>

      {/* 底部：横线 + 进入资源中心 */}
      <div className="card-foot">
        <Link className="link-more" href="/inbox" data-od-id="resources-more">
          进入资源中心 &gt;
        </Link>
      </div>

      {/* 右下角插画：纸箱 + 小动物（参考图） */}
      {/* 右下角插画：放大镜看书像素角色（今日执行同款模式：半透明置底） */}
      <img src="/art/resources-search.png" alt="" className="card-art resources-art" aria-hidden="true" />
    </article>
  );
}
