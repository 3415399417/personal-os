"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";

interface Props {
  open: boolean;
  /** 待裁剪图片（dataURL） */
  image: string | null;
  onCancel: () => void;
  /** 确认裁剪，输出 96x96 JPEG dataURL */
  onConfirm: (dataUrl: string) => void;
}

const VIEW = 320; // 裁剪视口尺寸
const BOX = 200; // 取景框尺寸
const OUT = 96; // 输出头像尺寸

/** 头像裁剪器：拖动定位 + 缩放，取景框内区域裁成 96x96 方形头像 */
export function AvatarCropper({ open, image, onCancel, onConfirm }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const dragRef = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null);

  // 打开时重置
  useEffect(() => {
    if (open) {
      setReady(false);
      setZoom(1);
      setTx(0);
      setTy(0);
    }
  }, [open]);

  const natural = imgRef.current
    ? { w: imgRef.current.naturalWidth || 1, h: imgRef.current.naturalHeight || 1 }
    : { w: 1, h: 1 };
  // 基础缩放：让图片至少覆盖整个视口
  const baseScale = Math.max(VIEW / natural.w, VIEW / natural.h);
  // 当前显示尺寸（缩放合并进宽高，位移就是纯 translate，坐标计算简单）
  const dispW = natural.w * baseScale * zoom;
  const dispH = natural.h * baseScale * zoom;
  // 平移限制：图片必须始终覆盖取景框
  const maxTx = Math.max(0, (dispW - BOX) / 2);
  const maxTy = Math.max(0, (dispH - BOX) / 2);
  const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));

  // zoom 变化时收紧平移，防止图片露出取景框
  useEffect(() => {
    setTx((v) => clamp(v, maxTx));
    setTy((v) => clamp(v, maxTy));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, maxTx, maxTy]);

  const setZoomClamped = (next: number) => setZoom(Math.min(4, Math.max(1, next)));

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, tx, ty };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setTx(clamp(dragRef.current.tx + dx, maxTx));
    setTy(clamp(dragRef.current.ty + dy, maxTy));
  };
  const endDrag = () => (dragRef.current = null);

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    setZoomClamped(zoom - e.deltaY * 0.0015);
  };

  const confirm = () => {
    const img = imgRef.current;
    if (!img || !ready) return;
    // 取景框左上角相对图片显示左上角的偏移（视口坐标）
    const offX = dispW / 2 - BOX / 2 - tx;
    const offY = dispH / 2 - BOX / 2 - ty;
    // 映射回源图坐标
    const sx = (offX / dispW) * natural.w;
    const sy = (offY / dispH) * natural.h;
    const sw = (BOX / dispW) * natural.w;
    const sh = (BOX / dispH) * natural.h;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUT, OUT);
    onConfirm(canvas.toDataURL("image/jpeg", 0.85));
  };

  return (
    <Modal
      title="裁剪头像"
      open={open}
      onClose={onCancel}
      foot={
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-soft" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="btn btn-primary" onClick={confirm}>
            确定
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <div
          style={{
            width: VIEW,
            height: VIEW,
            position: "relative",
            overflow: "hidden",
            borderRadius: 12,
            background: "#111",
            touchAction: "none",
            userSelect: "none",
            cursor: "grab",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onWheel={onWheel}
        >
          {image && (
            <img
              ref={imgRef}
              src={image}
              alt="头像裁剪"
              draggable={false}
              onLoad={() => setReady(true)}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: dispW,
                height: dispH,
                maxWidth: "none",
                transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))`,
              }}
            />
          )}
          {/* 取景框（固定居中方形） */}
          <div
            style={{
              position: "absolute",
              left: (VIEW - BOX) / 2,
              top: (VIEW - BOX) / 2,
              width: BOX,
              height: BOX,
              border: "2px solid #fff",
              borderRadius: 8,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
              pointerEvents: "none",
            }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" className="btn btn-soft" style={{ height: 26, padding: "0 10px", fontSize: 12 }} onClick={() => setZoomClamped(zoom - 0.25)}>
            −
          </button>
          <input
            type="range"
            min={1}
            max={4}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoomClamped(Number(e.target.value))}
            style={{ width: 170 }}
            aria-label="缩放"
          />
          <button type="button" className="btn btn-soft" style={{ height: 26, padding: "0 10px", fontSize: 12 }} onClick={() => setZoomClamped(zoom + 0.25)}>
            +
          </button>
        </div>
        <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>拖动图片调整位置，滚轮或滑块缩放</p>
      </div>
    </Modal>
  );
}
