"use client";

import { useMemo } from "react";
import { CelestialObject, DistanceLayer, VisibleObject } from "../lib/types";
import { CELESTIAL_OBJECTS } from "../lib/celestial-objects";
import { raDecToAzAlt } from "../lib/coordinates";
import { gnomonicProjectAzAlt, normalizedToScreen } from "../lib/projection";

const MAX_VISIBLE = 20;
const FOV_DEG = 60;
const DEG = Math.PI / 180;

interface SearchParams {
  centerAz: number;
  centerAlt: number;
  latitude: number;
  longitude: number;
  currentTime: number;
  canvasWidth: number;
  canvasHeight: number;
  activeLayers: Set<DistanceLayer>;
  dynamicPositions: Map<string, { ra: number; dec: number; distanceM?: number }>;
}

/** Az/Alt間の角距離（度） */
function angularDistAzAlt(
  az1: number, alt1: number,
  az2: number, alt2: number
): number {
  const a1 = az1 * DEG, e1 = alt1 * DEG;
  const a2 = az2 * DEG, e2 = alt2 * DEG;
  const cosDist =
    Math.sin(e1) * Math.sin(e2) +
    Math.cos(e1) * Math.cos(e2) * Math.cos(a1 - a2);
  return Math.acos(Math.max(-1, Math.min(1, cosDist))) / DEG;
}

export function useCelestialSearch(params: SearchParams): VisibleObject[] {
  const {
    centerAz, centerAlt, latitude, longitude, currentTime,
    canvasWidth, canvasHeight, activeLayers, dynamicPositions,
  } = params;

  return useMemo(() => {
    const now = new Date(currentTime);
    const candidates: {
      object: CelestialObject;
      angDist: number;
      objAz: number;
      objAlt: number;
    }[] = [];

    for (const obj of CELESTIAL_OBJECTS) {
      if (!activeLayers.has(obj.layer)) continue;

      let ra = obj.ra;
      let dec = obj.dec;
      let distanceM = obj.distanceM;

      if (obj.dynamic) {
        const pos = dynamicPositions.get(obj.id);
        if (pos) {
          ra = pos.ra;
          dec = pos.dec;
          if (pos.distanceM !== undefined) distanceM = pos.distanceM;
        } else if (obj.id === "iss") {
          continue;
        }
      }

      if (obj.type === "cmb") continue;

      // RA/Dec → Az/Alt 変換
      const { azimuth: objAz, altitude: objAlt } = raDecToAzAlt(
        ra, dec, latitude, longitude, now
      );

      const angDist = angularDistAzAlt(centerAz, centerAlt, objAz, objAlt);
      if (angDist <= FOV_DEG) {
        candidates.push({
          object: { ...obj, ra, dec, distanceM },
          angDist,
          objAz,
          objAlt,
        });
      }
    }

    candidates.sort((a, b) => {
      const importanceA = a.object.magnitude !== undefined ? -a.object.magnitude : 0;
      const importanceB = b.object.magnitude !== undefined ? -b.object.magnitude : 0;
      const scoreA = importanceA - a.angDist * 0.5;
      const scoreB = importanceB - b.angDist * 0.5;
      return scoreB - scoreA;
    });

    return candidates.slice(0, MAX_VISIBLE).map(({ object, angDist, objAz, objAlt }) => {
      const projected = gnomonicProjectAzAlt(objAz, objAlt, centerAz, centerAlt);
      const screen = normalizedToScreen(
        projected.x,
        projected.y,
        canvasWidth,
        canvasHeight,
        FOV_DEG
      );

      return {
        object,
        screenX: screen.sx,
        screenY: screen.sy,
        angularDistance: angDist,
      };
    });
  }, [centerAz, centerAlt, latitude, longitude, currentTime, canvasWidth, canvasHeight, activeLayers, dynamicPositions]);
}
