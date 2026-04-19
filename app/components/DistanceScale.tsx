"use client";

import { VisibleObject } from "../lib/types";
import { LAYER_COLORS } from "../lib/celestial-objects";
import {
  distanceToLog,
  logToNormalized,
  LOG_SCALE_MIN,
  LOG_SCALE_MAX,
  DISTANCE_LANDMARKS,
} from "../lib/distance-engine";

interface DistanceScaleProps {
  visibleObjects: VisibleObject[];
  onObjectTap: (obj: VisibleObject) => void;
}

const BAR_HEIGHT_PERCENT = 70;

// レイヤー色帯の範囲 (log10 m)
const LAYER_BANDS: { layer: string; logMin: number; logMax: number }[] = [
  { layer: "earth-orbit", logMin: 5.6, logMax: 7.6 },
  { layer: "solar-system", logMin: 7.6, logMax: 13.2 },
  { layer: "galaxy", logMin: 13.2, logMax: 21.0 },
  { layer: "deep-universe", logMin: 21.0, logMax: 26.7 },
];

export default function DistanceScale({
  visibleObjects,
  onObjectTap,
}: DistanceScaleProps) {
  const barTop = (100 - BAR_HEIGHT_PERCENT) / 2;

  return (
    <div
      style={{
        position: "fixed",
        right: 12,
        top: `${barTop}%`,
        height: `${BAR_HEIGHT_PERCENT}%`,
        width: 32,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 色帯バー */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: 6,
          left: 0,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        {LAYER_BANDS.map((band) => {
          const top = logToNormalized(band.logMin) * 100;
          const bottom = logToNormalized(band.logMax) * 100;
          return (
            <div
              key={band.layer}
              style={{
                position: "absolute",
                left: 0,
                width: "100%",
                top: `${top}%`,
                height: `${bottom - top}%`,
                backgroundColor: LAYER_COLORS[band.layer],
                opacity: 0.4,
              }}
            />
          );
        })}
      </div>

      {/* ランドマークティック */}
      {DISTANCE_LANDMARKS.map((lm) => {
        const pos = logToNormalized(lm.logVal) * 100;
        if (pos < 0 || pos > 100) return null;
        return (
          <div
            key={lm.label}
            style={{
              position: "absolute",
              left: 0,
              top: `${pos}%`,
              display: "flex",
              alignItems: "center",
              transform: "translateY(-50%)",
            }}
          >
            <div
              style={{
                width: 10,
                height: 1,
                backgroundColor: "#8888aa",
              }}
            />
            <span
              style={{
                fontSize: "8px",
                color: "#8888aa",
                marginLeft: 2,
                whiteSpace: "nowrap",
              }}
            >
              {lm.label}
            </span>
          </div>
        );
      })}

      {/* 天体ドット */}
      {visibleObjects.map((vo) => {
        const logVal = distanceToLog(vo.object.distanceM);
        if (logVal < LOG_SCALE_MIN || logVal > LOG_SCALE_MAX) return null;
        const pos = logToNormalized(logVal) * 100;
        const color = LAYER_COLORS[vo.object.layer] || "#fff";

        return (
          <div
            key={vo.object.id}
            onClick={() => onObjectTap(vo)}
            style={{
              position: "absolute",
              left: -2,
              top: `${pos}%`,
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: color,
              transform: "translateY(-50%)",
              cursor: "pointer",
              boxShadow: `0 0 4px ${color}`,
            }}
            title={vo.object.name}
          />
        );
      })}
    </div>
  );
}
