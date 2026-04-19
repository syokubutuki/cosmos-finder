"use client";

import { DistanceLayer } from "../lib/types";
import { LAYER_COLORS, LAYER_NAMES } from "../lib/celestial-objects";

interface LayerSelectorProps {
  activeLayers: Set<DistanceLayer>;
  onToggle: (layer: DistanceLayer) => void;
}

const LAYERS: DistanceLayer[] = [
  "earth-orbit",
  "solar-system",
  "galaxy",
  "deep-universe",
];

export default function LayerSelector({
  activeLayers,
  onToggle,
}: LayerSelectorProps) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        display: "flex",
        gap: 6,
      }}
    >
      {LAYERS.map((layer) => {
        const active = activeLayers.has(layer);
        const color = LAYER_COLORS[layer];
        return (
          <button
            key={layer}
            onClick={() => onToggle(layer)}
            style={{
              padding: "6px 12px",
              borderRadius: "1rem",
              border: `1.5px solid ${color}`,
              backgroundColor: active ? color + "33" : "rgba(10,10,18,0.7)",
              color: active ? color : "#666",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {LAYER_NAMES[layer]}
          </button>
        );
      })}
    </div>
  );
}
