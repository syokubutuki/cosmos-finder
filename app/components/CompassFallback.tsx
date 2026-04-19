"use client";

import { useCallback, useRef, useEffect, useState } from "react";

interface CompassFallbackProps {
  onOrientationChange: (alpha: number, beta: number) => void;
}

export default function CompassFallback({
  onOrientationChange,
}: CompassFallbackProps) {
  const [azimuth, setAzimuth] = useState(180);
  const [altitude, setAltitude] = useState(30);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };

      setAzimuth((prev) => ((prev - dx * 0.3) % 360 + 360) % 360);
      setAltitude((prev) => Math.max(-90, Math.min(90, prev + dy * 0.3)));
    },
    []
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    // alpha = compass heading, beta = tilt (90 = horizontal)
    const beta = 90 - altitude;
    onOrientationChange(azimuth, beta);
  }, [azimuth, altitude, onOrientationChange]);

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        cursor: "grab",
        touchAction: "none",
      }}
    >
      {/* 方位インジケーター */}
      <div
        style={{
          position: "fixed",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 15,
          display: "flex",
          gap: 16,
          background: "rgba(20,20,42,0.8)",
          padding: "6px 16px",
          borderRadius: "1rem",
          fontSize: "0.75rem",
          color: "#8888aa",
        }}
      >
        <span>方位 {azimuth.toFixed(0)}°</span>
        <span>仰角 {altitude.toFixed(0)}°</span>
        <span style={{ color: "#67d8ef" }}>ドラッグで操作</span>
      </div>
    </div>
  );
}
