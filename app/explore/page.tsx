"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { DistanceLayer, VisibleObject, GeoPosition } from "../lib/types";
import {
  azAltToRaDec,
  deviceOrientationToAzAlt,
} from "../lib/coordinates";
import {
  getPlanetPosition,
  getSunPosition,
  getMoonPosition,
} from "../lib/orbital";
import { getMilkyWayScreenPoints } from "../components/MilkyWayBand";
import { useDeviceOrientation } from "../hooks/useDeviceOrientation";
import { useCamera } from "../hooks/useCamera";
import { useGeolocation } from "../hooks/useGeolocation";
import { useISS } from "../hooks/useISS";
import { useCelestialSearch } from "../hooks/useCelestialSearch";
import PermissionGate from "../components/PermissionGate";
import CameraView from "../components/CameraView";
import CosmosOverlay from "../components/CosmosOverlay";
import DistanceScale from "../components/DistanceScale";
import LayerSelector from "../components/LayerSelector";
import ObjectDetail from "../components/ObjectDetail";

const AU = 1.496e11;

export default function ExplorePage() {
  const [permissionDone, setPermissionDone] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [hasOrientation, setHasOrientation] = useState(false);
  const [selectedObject, setSelectedObject] = useState<VisibleObject | null>(null);
  const [activeLayers, setActiveLayers] = useState<Set<DistanceLayer>>(
    new Set(["earth-orbit", "solar-system", "galaxy", "deep-universe"])
  );

  // フォールバック方位（PCドラッグ操作）
  const [fallbackAzimuth, setFallbackAzimuth] = useState(180);
  const [fallbackAltitude, setFallbackAltitude] = useState(30);

  // 画面サイズ（stateで管理して再計算をトリガー）
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 800 });
  useEffect(() => {
    const update = () =>
      setCanvasSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const orientation = useDeviceOrientation();
  const camera = useCamera();
  const geo = useGeolocation();

  // センサーが後から有効になった場合に自動切替
  useEffect(() => {
    if (!hasOrientation && orientation.available) {
      setHasOrientation(true);
    }
  }, [hasOrientation, orientation.available]);
  const userPosition: GeoPosition = geo.position ?? {
    latitude: 35.68,
    longitude: 139.77,
  };
  const iss = useISS(permissionDone ? userPosition : null);

  // ─── 惑星位置（1分ごと更新）─────────────────────
  const [planetPositions, setPlanetPositions] = useState<
    Map<string, { ra: number; dec: number; distanceM?: number }>
  >(new Map());

  const updatePlanets = useCallback(() => {
    const now = new Date();
    const map = new Map<string, { ra: number; dec: number; distanceM?: number }>();
    for (const id of [
      "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune",
    ]) {
      const pos = getPlanetPosition(id, now);
      if (pos) map.set(id, { ra: pos.ra, dec: pos.dec, distanceM: pos.distanceAU * AU });
    }
    map.set("sun", getSunPosition(now));
    map.set("moon", getMoonPosition(now));
    setPlanetPositions(map);
  }, []);

  useEffect(() => {
    updatePlanets();
    const t = setInterval(updatePlanets, 60000);
    return () => clearInterval(t);
  }, [updatePlanets]);

  // ISS → 動的ポジション統合
  const dynamicPositions = useMemo(() => {
    const map = new Map(planetPositions);
    if (iss.ra !== null && iss.dec !== null && iss.visible) {
      map.set("iss", { ra: iss.ra, dec: iss.dec, distanceM: iss.distanceM ?? 408000 });
    }
    return map;
  }, [planetPositions, iss]);

  // ─── デバイス方位 → 方位角・仰角 ──────────────────
  // 回転行列でカメラの3D向きから正確にaz/altを算出
  const { azimuth, altitude } = useMemo(() => {
    if (hasOrientation) {
      return deviceOrientationToAzAlt(
        orientation.alpha,  // コンパスヘディング（hookで正規化済み）
        orientation.beta,
        orientation.gamma
      );
    }
    return { azimuth: fallbackAzimuth, altitude: fallbackAltitude };
  }, [
    hasOrientation,
    orientation.alpha,
    orientation.beta,
    orientation.gamma,
    fallbackAzimuth,
    fallbackAltitude,
  ]);

  // ─── 方位角・仰角 → 赤経・赤緯 ──────────────────
  const { ra: centerRA, dec: centerDec } = useMemo(
    () =>
      azAltToRaDec(
        azimuth,
        altitude,
        userPosition.latitude,
        userPosition.longitude,
        new Date()
      ),
    [azimuth, altitude, userPosition.latitude, userPosition.longitude]
  );

  // ─── 可視天体検索 ──────────────────────────────
  const visibleObjects = useCelestialSearch({
    centerRA,
    centerDec,
    canvasWidth: canvasSize.w,
    canvasHeight: canvasSize.h,
    activeLayers,
    dynamicPositions,
  });

  const milkyWayPoints = useMemo(
    () => getMilkyWayScreenPoints(centerRA, centerDec, canvasSize.w, canvasSize.h),
    [centerRA, centerDec, canvasSize.w, canvasSize.h]
  );

  // ─── 操作レイヤー: ドラッグ + タップ ─────────────
  const isDragging = useRef(false);
  const dragMoved = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    dragMoved.current = false;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };

      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved.current = true;

      if (!hasOrientation) {
        setFallbackAzimuth((a) => ((a - dx * 0.3) % 360 + 360) % 360);
        setFallbackAltitude((a) => Math.max(-90, Math.min(90, a + dy * 0.3)));
      }
    },
    [hasOrientation]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = false;

      // ドラッグせずリリース → タップとして天体検索
      if (!dragMoved.current) {
        const x = e.clientX;
        const y = e.clientY;
        let closest: VisibleObject | null = null;
        let minDist = 40;
        for (const vo of visibleObjects) {
          const dx = vo.screenX - x;
          const dy = vo.screenY - y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < minDist) {
            minDist = d;
            closest = vo;
          }
        }
        if (closest) {
          setSelectedObject(closest);
        } else {
          setSelectedObject(null);
        }
      }
    },
    [visibleObjects]
  );

  const handleLayerToggle = useCallback((layer: DistanceLayer) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  }, []);

  const handleScaleTap = useCallback((obj: VisibleObject) => {
    setSelectedObject(obj);
  }, []);

  // ─── 許可フロー ──────────────────────────────
  if (!permissionDone) {
    return (
      <PermissionGate
        onAllGranted={() => setPermissionDone(true)}
        onCameraResult={setHasCamera}
        onOrientationResult={setHasOrientation}
        onGeoResult={() => {}}
        requestCamera={camera.startCamera}
        requestOrientation={orientation.requestPermission}
        requestGeo={geo.requestPosition}
      />
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
      {/* カメラ or 星空背景 */}
      <CameraView stream={camera.stream} available={hasCamera} />

      {/* Canvas天体オーバーレイ（描画専用・イベント透過） */}
      <CosmosOverlay
        visibleObjects={visibleObjects}
        milkyWayPoints={milkyWayPoints}
      />

      {/* 最上位操作レイヤー: ドラッグ + タップ */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 3,
          cursor: hasOrientation ? "default" : "grab",
          touchAction: "none",
        }}
      />

      {/* 距離スケールバー */}
      <DistanceScale visibleObjects={visibleObjects} onObjectTap={handleScaleTap} />

      {/* レイヤー切替 */}
      <LayerSelector activeLayers={activeLayers} onToggle={handleLayerToggle} />

      {/* 天体詳細 */}
      <ObjectDetail
        object={selectedObject}
        onClose={() => setSelectedObject(null)}
      />

      {/* 方位・仰角表示 */}
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
        <span>仰角 {altitude > 0 ? "+" : ""}{altitude.toFixed(0)}°</span>
        {hasOrientation ? (
          <span style={{ color: "#a6e22e" }}>センサー有効</span>
        ) : (
          <span style={{ color: "#67d8ef" }}>ドラッグで操作</span>
        )}
      </div>
    </div>
  );
}
