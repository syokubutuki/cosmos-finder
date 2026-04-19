"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface OrientationState {
  alpha: number;  // コンパスヘディング（CW from true north, 0-360）
  beta: number;   // 前後傾斜 (-180〜180)
  gamma: number;  // 左右傾斜 (-90〜90)
  available: boolean;
  permissionGranted: boolean;
}

const FILTER_COEFF = 0.15;

export function useDeviceOrientation() {
  const [state, setState] = useState<OrientationState>({
    alpha: 0,
    beta: 90,
    gamma: 0,
    available: false,
    permissionGranted: false,
  });

  const filteredRef = useRef({ alpha: 0, beta: 90, gamma: 0 });
  const isIOS = useRef(false);
  const eventNameRef = useRef<string>("deviceorientation");

  useEffect(() => {
    isIOS.current =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }, []);

  const handleOrientation = useCallback(
    (e: Event) => {
      const evt = e as DeviceOrientationEvent;
      let compassHeading: number;

      // iOS: webkitCompassHeading が真北基準のコンパスヘディング
      const iosEvt = evt as DeviceOrientationEvent & { webkitCompassHeading?: number };
      if (isIOS.current && iosEvt.webkitCompassHeading != null) {
        compassHeading = iosEvt.webkitCompassHeading;
      } else {
        // Android / W3C: alpha は北からCCW方向に増加
        // コンパスヘディング(CW from north)に変換
        const rawAlpha = evt.alpha ?? 0;
        compassHeading = ((360 - rawAlpha) % 360 + 360) % 360;
      }

      const beta = evt.beta ?? 0;
      const gamma = evt.gamma ?? 0;

      // ローパスフィルタ
      const f = filteredRef.current;

      // コンパスヘディングは循環値(0-360)なのでラッピング処理
      let dAlpha = compassHeading - f.alpha;
      if (dAlpha > 180) dAlpha -= 360;
      if (dAlpha < -180) dAlpha += 360;
      f.alpha = ((f.alpha + dAlpha * FILTER_COEFF) % 360 + 360) % 360;

      f.beta = f.beta + (beta - f.beta) * FILTER_COEFF;
      f.gamma = f.gamma + (gamma - f.gamma) * FILTER_COEFF;

      setState({
        alpha: f.alpha,
        beta: f.beta,
        gamma: f.gamma,
        available: true,
        permissionGranted: true,
      });
    },
    []
  );

  const requestPermission = useCallback(async (): Promise<boolean> => {
    // iOS 13+: 明示的な許可が必要
    const DOE = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<string>;
    };

    if (typeof DOE.requestPermission === "function") {
      try {
        const result = await DOE.requestPermission();
        if (result === "granted") {
          window.addEventListener("deviceorientation", handleOrientation, true);
          eventNameRef.current = "deviceorientation";
          setState((s) => ({ ...s, permissionGranted: true }));
          return true;
        }
        return false;
      } catch {
        return false;
      }
    }

    // Android: deviceorientationabsolute を優先（真北基準の絶対方位）
    const useAbsolute = "ondeviceorientationabsolute" in window;
    const eventName = useAbsolute
      ? "deviceorientationabsolute"
      : "deviceorientation";
    eventNameRef.current = eventName;

    window.addEventListener(eventName, handleOrientation, true);

    // イベントが実際に発火するかチェック
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        setState((s) => ({ ...s, available: false }));
        resolve(false);
      }, 1000);

      const check = () => {
        clearTimeout(timeout);
        setState((s) => ({ ...s, available: true, permissionGranted: true }));
        resolve(true);
      };
      window.addEventListener(eventName, check, { once: true });
    });
  }, [handleOrientation]);

  useEffect(() => {
    return () => {
      window.removeEventListener(
        eventNameRef.current,
        handleOrientation,
        true
      );
    };
  }, [handleOrientation]);

  return {
    ...state,
    isIOS: isIOS.current,
    requestPermission,
  };
}
