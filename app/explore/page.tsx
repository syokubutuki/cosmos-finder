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
import CompassFallback from "../components/CompassFallback";

const AU = 1.496e11;

export default function ExplorePage() {
  const [permissionDone, setPermissionDone] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [hasOrientation, setHasOrientation] = useState(false);
  const [selectedObject, setSelectedObject] = useState<VisibleObject | null>(null);
  const [activeLayers, setActiveLayers] = useState<Set<DistanceLayer>>(
    new Set(["earth-orbit", "solar-system", "galaxy", "deep-universe"])
  );

  // フォールバック方位
  const [fallbackAlpha, setFallbackAlpha] = useState(180);
  const [fallbackBeta, setFallbackBeta] = useState(90);

  const orientation = useDeviceOrientation();
  const camera = useCamera();
  const geo = useGeolocation();
  const userPosition: GeoPosition = geo.position ?? { latitude: 35.68, longitude: 139.77 }; // デフォルト: 東京
  const iss = useISS(permissionDone ? userPosition : null);

  // 惑星位置（1分ごと更新）
  const [planetPositions, setPlanetPositions] = useState<
    Map<string, { ra: number; dec: number; distanceM?: number }>
  >(new Map());

  const updatePlanets = useCallback(() => {
    const now = new Date();
    const map = new Map<string, { ra: number; dec: number; distanceM?: number }>();

    // 惑星
    for (const id of ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune"]) {
      const pos = getPlanetPosition(id, now);
      if (pos) {
        map.set(id, { ra: pos.ra, dec: pos.dec, distanceM: pos.distanceAU * AU });
      }
    }

    // 太陽
    const sun = getSunPosition(now);
    map.set("sun", { ra: sun.ra, dec: sun.dec });

    // 月
    const moon = getMoonPosition(now);
    map.set("moon", { ra: moon.ra, dec: moon.dec });

    setPlanetPositions(map);
  }, []);

  useEffect(() => {
    updatePlanets();
    const timer = setInterval(updatePlanets, 60000);
    return () => clearInterval(timer);
  }, [updatePlanets]);

  // ISS位置を動的ポジションに追加
  const dynamicPositions = useMemo(() => {
    const map = new Map(planetPositions);
    if (iss.ra !== null && iss.dec !== null && iss.visible) {
      map.set("iss", {
        ra: iss.ra,
        dec: iss.dec,
        distanceM: iss.distanceM ?? 408000,
      });
    }
    return map;
  }, [planetPositions, iss]);

  // 方位角・仰角 → RA/Dec
  const alpha = hasOrientation ? orientation.alpha : fallbackAlpha;
  const beta = hasOrientation ? orientation.beta : fallbackBeta;

  const { azimuth, altitude } = useMemo(
    () => deviceOrientationToAzAlt(alpha, beta, 0, orientation.isIOS),
    [alpha, beta, orientation.isIOS]
  );

  const { ra: centerRA, dec: centerDec } = useMemo(
    () =>
      azAltToRaDec(
        azimuth,
        altitude,
        userPosition.latitude,
        userPosition.longitude,
        new Date()
      ),
    [azimuth, altitude, userPosition]
  );

  const canvasSize = useRef({ w: 0, h: 0 });
  useEffect(() => {
    const update = () => {
      canvasSize.current = {
        w: window.innerWidth,
        h: window.innerHeight,
      };
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const visibleObjects = useCelestialSearch({
    centerRA,
    centerDec,
    canvasWidth: canvasSize.current.w || 400,
    canvasHeight: canvasSize.current.h || 800,
    activeLayers,
    dynamicPositions,
  });

  const milkyWayPoints = useMemo(
    () =>
      getMilkyWayScreenPoints(
        centerRA,
        centerDec,
        canvasSize.current.w || 400,
        canvasSize.current.h || 800
      ),
    [centerRA, centerDec]
  );

  const handleLayerToggle = useCallback((layer: DistanceLayer) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  }, []);

  const handleObjectTap = useCallback((obj: VisibleObject) => {
    setSelectedObject(obj);
  }, []);

  const handleFallbackOrientation = useCallback(
    (a: number, b: number) => {
      setFallbackAlpha(a);
      setFallbackBeta(b);
    },
    []
  );

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
      {/* レイヤー0: カメラ or 星空 */}
      <CameraView stream={camera.stream} available={hasCamera} />

      {/* フォールバック操作レイヤー */}
      {!hasOrientation && (
        <CompassFallback onOrientationChange={handleFallbackOrientation} />
      )}

      {/* レイヤー2: Canvas天体オーバーレイ */}
      <CosmosOverlay
        visibleObjects={visibleObjects}
        onObjectTap={handleObjectTap}
        milkyWayPoints={milkyWayPoints}
      />

      {/* 距離スケールバー */}
      <DistanceScale
        visibleObjects={visibleObjects}
        onObjectTap={handleObjectTap}
      />

      {/* レイヤー切替 */}
      <LayerSelector activeLayers={activeLayers} onToggle={handleLayerToggle} />

      {/* 天体詳細 */}
      <ObjectDetail
        object={selectedObject}
        onClose={() => setSelectedObject(null)}
      />

      {/* 方位表示（センサーあり時） */}
      {hasOrientation && (
        <div
          style={{
            position: "fixed",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 15,
            background: "rgba(20,20,42,0.7)",
            padding: "4px 14px",
            borderRadius: "1rem",
            fontSize: "0.7rem",
            color: "#8888aa",
          }}
        >
          {azimuth.toFixed(0)}° / {altitude > 0 ? "+" : ""}
          {altitude.toFixed(0)}°
        </div>
      )}
    </div>
  );
}
