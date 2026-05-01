"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchISSPosition, issToAzAlt } from "../lib/iss";
import { azAltToRaDec } from "../lib/coordinates";
import { GeoPosition } from "../lib/types";

const POLL_INTERVAL = 30000;

interface ISSState {
  ra: number | null;
  dec: number | null;
  distanceM: number | null;
  visible: boolean;
}

export function useISS(userPosition: GeoPosition | null) {
  const [state, setState] = useState<ISSState>({
    ra: null,
    dec: null,
    distanceM: null,
    visible: false,
  });

  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const update = useCallback(async () => {
    if (!userPosition) return;

    const pos = await fetchISSPosition();
    if (!pos) {
      setState((s) => ({ ...s, visible: false }));
      return;
    }

    const { azimuth, altitude } = issToAzAlt(
      pos.latitude,
      pos.longitude,
      userPosition.latitude,
      userPosition.longitude
    );

    // 地平線の下ならvisible=false（マーカーは非表示だがデータは持つ）
    const visible = altitude > -5;

    const { ra, dec } = azAltToRaDec(
      azimuth,
      altitude,
      userPosition.latitude,
      userPosition.longitude,
      new Date()
    );

    // ISS距離を概算（仰角から）
    const issAltKm = 408;
    const R = 6371;
    const altRad = altitude * (Math.PI / 180);
    const cosAlt = Math.cos(altRad);
    const sinAlt = Math.sin(altRad);
    const sqrtArg = (R + issAltKm) ** 2 - (R * cosAlt) ** 2;
    const distKm = sqrtArg > 0
      ? Math.sqrt(sqrtArg) - R * sinAlt
      : issAltKm;

    setState({
      ra,
      dec,
      distanceM: Math.max(distKm, issAltKm) * 1000,
      visible,
    });
  }, [userPosition]);

  useEffect(() => {
    update();
    timerRef.current = setInterval(update, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [update]);

  return state;
}
