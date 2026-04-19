"use client";

import { useState, useCallback } from "react";

interface PermissionGateProps {
  onAllGranted: () => void;
  onCameraResult: (granted: boolean) => void;
  onOrientationResult: (granted: boolean) => void;
  onGeoResult: (granted: boolean) => void;
  requestCamera: () => Promise<boolean>;
  requestOrientation: () => Promise<boolean>;
  requestGeo: () => Promise<unknown>;
}

type Step = "intro" | "camera" | "orientation" | "geo" | "done";

export default function PermissionGate({
  onAllGranted,
  onCameraResult,
  onOrientationResult,
  onGeoResult,
  requestCamera,
  requestOrientation,
  requestGeo,
}: PermissionGateProps) {
  const [step, setStep] = useState<Step>("intro");
  const [error, setError] = useState<string | null>(null);

  const handleStart = useCallback(async () => {
    setStep("camera");
    setError(null);

    // カメラ
    const cam = await requestCamera();
    onCameraResult(cam);
    if (!cam) setError("カメラが利用できません（フォールバックで動作します）");

    setStep("orientation");
    const ori = await requestOrientation();
    onOrientationResult(ori);
    if (!ori) setError("方位センサー未検出（後から有効になる場合があります）");

    setStep("geo");
    const geo = await requestGeo();
    onGeoResult(!!geo);

    setStep("done");
    onAllGranted();
  }, [requestCamera, requestOrientation, requestGeo, onAllGranted, onCameraResult, onOrientationResult, onGeoResult]);

  if (step === "done") return null;

  const stepLabels: Record<Step, string> = {
    intro: "準備",
    camera: "カメラ...",
    orientation: "方位センサー...",
    geo: "位置情報...",
    done: "",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(10, 10, 18, 0.95)",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      {step === "intro" ? (
        <>
          <h2 style={{ fontSize: "1.4rem", marginBottom: "1rem" }}>
            センサーへのアクセス
          </h2>
          <p style={{ color: "#8888aa", marginBottom: "2rem", lineHeight: 1.6 }}>
            AR体験のためにカメラ・方位センサー・
            <br />
            位置情報へのアクセスを許可してください
          </p>
          <button
            onClick={handleStart}
            style={{
              padding: "0.8rem 2rem",
              borderRadius: "2rem",
              background: "linear-gradient(135deg, #ae81ff, #f92672)",
              color: "#fff",
              border: "none",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            許可して開始
          </button>
        </>
      ) : (
        <>
          <div
            style={{
              width: 40,
              height: 40,
              border: "3px solid #ae81ff",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              marginBottom: "1rem",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: "#ccc" }}>{stepLabels[step]}</p>
          {error && (
            <p style={{ color: "#e6db74", fontSize: "0.8rem", marginTop: "0.5rem" }}>
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
