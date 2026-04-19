"use client";

import { VisibleObject } from "../lib/types";
import { getDistanceDisplay } from "../lib/distance-engine";
import { LAYER_COLORS, LAYER_NAMES } from "../lib/celestial-objects";

interface ObjectDetailProps {
  object: VisibleObject | null;
  onClose: () => void;
}

export default function ObjectDetail({ object, onClose }: ObjectDetailProps) {
  if (!object) return null;

  const obj = object.object;
  const color = LAYER_COLORS[obj.layer];
  const dist = getDistanceDisplay(obj.distanceM);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 60,
        left: 12,
        right: 56,
        zIndex: 20,
        background: "rgba(20, 20, 42, 0.92)",
        backdropFilter: "blur(10px)",
        borderRadius: 16,
        padding: "1rem",
        border: `1px solid ${color}44`,
      }}
      className="animate-fade-in"
    >
      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.1rem", color }}>
            {obj.name}
          </h3>
          <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#8888aa" }}>
            {obj.nameEn}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#8888aa",
            fontSize: "1.2rem",
            cursor: "pointer",
            padding: "0 4px",
          }}
        >
          ✕
        </button>
      </div>

      {/* 距離 */}
      <div
        style={{
          margin: "0.8rem 0",
          padding: "0.6rem",
          background: "rgba(0,0,0,0.3)",
          borderRadius: 8,
        }}
      >
        <div style={{ fontSize: "1.5rem", fontWeight: 700, color }}>
          {dist.full}
        </div>
        {dist.lightTravel && (
          <div style={{ fontSize: "0.8rem", color: "#ccc", marginTop: 4 }}>
            {dist.lightTravel}
          </div>
        )}
        {dist.metaphor && (
          <div style={{ fontSize: "0.8rem", color: "#aaa", marginTop: 2 }}>
            {dist.metaphor}
          </div>
        )}
      </div>

      {/* 説明 */}
      <p style={{ margin: 0, fontSize: "0.8rem", color: "#ccc", lineHeight: 1.5 }}>
        {obj.description}
      </p>

      {/* タグ */}
      <div style={{ display: "flex", gap: 6, marginTop: "0.6rem", flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: "0.7rem",
            padding: "2px 8px",
            borderRadius: "1rem",
            backgroundColor: color + "22",
            color,
          }}
        >
          {LAYER_NAMES[obj.layer]}
        </span>
        {obj.magnitude !== undefined && (
          <span
            style={{
              fontSize: "0.7rem",
              padding: "2px 8px",
              borderRadius: "1rem",
              backgroundColor: "rgba(255,255,255,0.1)",
              color: "#aaa",
            }}
          >
            等級 {obj.magnitude}
          </span>
        )}
        {obj.dynamic && (
          <span
            style={{
              fontSize: "0.7rem",
              padding: "2px 8px",
              borderRadius: "1rem",
              backgroundColor: "rgba(103,216,239,0.15)",
              color: "#67d8ef",
            }}
          >
            リアルタイム
          </span>
        )}
      </div>
    </div>
  );
}
