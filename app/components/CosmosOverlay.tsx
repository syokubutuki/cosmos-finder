"use client";

import { useRef, useEffect, useCallback } from "react";
import { VisibleObject } from "../lib/types";
import { LAYER_COLORS } from "../lib/celestial-objects";
import { formatDistance } from "../lib/distance-format";

interface CosmosOverlayProps {
  visibleObjects: VisibleObject[];
  onObjectTap: (obj: VisibleObject) => void;
  milkyWayPoints?: { x: number; y: number }[];
}

const TYPE_SYMBOLS: Record<string, string> = {
  satellite: "◆",
  star: "★",
  planet: "●",
  nebula: "◎",
  "star-cluster": "✦",
  galaxy: "◈",
  "galaxy-cluster": "▣",
  quasar: "✸",
  cmb: "∞",
};

export default function CosmosOverlay({
  visibleObjects,
  onObjectTap,
  milkyWayPoints,
}: CosmosOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const objectsRef = useRef<VisibleObject[]>(visibleObjects);
  const milkyWayRef = useRef(milkyWayPoints);
  const tapHandlerRef = useRef(onObjectTap);

  objectsRef.current = visibleObjects;
  milkyWayRef.current = milkyWayPoints;
  tapHandlerRef.current = onObjectTap;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // 天の川帯
    const mwPts = milkyWayRef.current;
    if (mwPts && mwPts.length >= 2) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(mwPts[0].x, mwPts[0].y);
      for (let i = 1; i < mwPts.length; i++) {
        ctx.lineTo(mwPts[i].x, mwPts[i].y);
      }
      ctx.strokeStyle = "rgba(174, 129, 255, 0.15)";
      ctx.lineWidth = 80;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      ctx.strokeStyle = "rgba(174, 129, 255, 0.08)";
      ctx.lineWidth = 160;
      ctx.stroke();
      ctx.restore();
    }

    // 天体マーカー
    const objects = objectsRef.current;
    for (const vo of objects) {
      const { object, screenX, screenY } = vo;
      const color = LAYER_COLORS[object.layer] || "#fff";
      const symbol = TYPE_SYMBOLS[object.type] || "●";

      // マーカー円
      ctx.beginPath();
      ctx.arc(screenX, screenY, 16, 0, Math.PI * 2);
      ctx.fillStyle = color + "33";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // シンボル
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = color;
      ctx.fillText(symbol, screenX, screenY);

      // ラベル
      const dist = formatDistance(object.distanceM);
      const label = object.name;
      const distLabel = dist.full;

      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      // 背景
      const labelX = screenX + 20;
      const labelY = screenY - 10;
      const nameWidth = ctx.measureText(label).width;
      const distWidth = ctx.measureText(distLabel).width;
      const boxW = Math.max(nameWidth, distWidth) + 8;

      ctx.fillStyle = "rgba(10, 10, 18, 0.75)";
      ctx.roundRect(labelX - 4, labelY - 2, boxW, 30, 4);
      ctx.fill();

      // 名前
      ctx.fillStyle = "#e8e6e3";
      ctx.fillText(label, labelX, labelY);

      // 距離
      ctx.font = "10px sans-serif";
      ctx.fillStyle = color;
      ctx.fillText(distLabel, labelX, labelY + 15);
    }

    requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const rafId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
    };
  }, [draw]);

  // タップ検出
  const handleClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      let clientX: number, clientY: number;
      if ("touches" in e) {
        const touch = e.changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // 最も近い天体を検索
      let closest: VisibleObject | null = null;
      let minDist = 40; // タップ判定半径
      for (const vo of objectsRef.current) {
        const dx = vo.screenX - x;
        const dy = vo.screenY - y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < minDist) {
          minDist = d;
          closest = vo;
        }
      }

      if (closest) {
        tapHandlerRef.current(closest);
      }
    },
    []
  );

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      onTouchEnd={handleClick}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 2,
        touchAction: "none",
      }}
    />
  );
}
