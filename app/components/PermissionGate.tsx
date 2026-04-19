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

type Step = "intro" | "camera" | "orientation" | "geo";

interface StepResult {
  camera?: boolean;
  orientation?: boolean;
  geo?: boolean;
}

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
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<StepResult>({});

  const handleCamera = useCallback(async () => {
    setLoading(true);
    const ok = await requestCamera();
    onCameraResult(ok);
    setResults((r) => ({ ...r, camera: ok }));
    setLoading(false);
    setStep("orientation");
  }, [requestCamera, onCameraResult]);

  // iOS: requestPermission はユーザージェスチャーの直接応答で呼ぶ必要がある
  const handleOrientation = useCallback(async () => {
    setLoading(true);
    const ok = await requestOrientation();
    onOrientationResult(ok);
    setResults((r) => ({ ...r, orientation: ok }));
    setLoading(false);
    setStep("geo");
  }, [requestOrientation, onOrientationResult]);

  const handleGeo = useCallback(async () => {
    setLoading(true);
    const geo = await requestGeo();
    onGeoResult(!!geo);
    setResults((r) => ({ ...r, geo: !!geo }));
    setLoading(false);
    onAllGranted();
  }, [requestGeo, onGeoResult, onAllGranted]);

  const skipOrientation = useCallback(() => {
    onOrientationResult(false);
    setResults((r) => ({ ...r, orientation: false }));
    setStep("geo");
  }, [onOrientationResult]);

  const skipGeo = useCallback(() => {
    onGeoResult(false);
    setResults((r) => ({ ...r, geo: false }));
    onAllGranted();
  }, [onGeoResult, onAllGranted]);

  const stepConfig: Record<
    Step,
    { title: string; desc: string; action: () => void; skip?: () => void; icon: string }
  > = {
    intro: {
      title: "Cosmos Finder",
      desc: "カメラを向けた方向の宇宙を探索します。\nセンサーへのアクセスを順番に許可してください。",
      action: () => setStep("camera"),
      icon: "🔭",
    },
    camera: {
      title: "カメラ",
      desc: "カメラ映像を背景に表示します。",
      action: handleCamera,
      icon: "📷",
    },
    orientation: {
      title: "方位センサー",
      desc: "スマホの向きから天体の方向を特定します。\nこの許可がないとドラッグ操作になります。",
      action: handleOrientation,
      skip: skipOrientation,
      icon: "🧭",
    },
    geo: {
      title: "位置情報",
      desc: "現在地から正確な天体位置を計算します。",
      action: handleGeo,
      skip: skipGeo,
      icon: "📍",
    },
  };

  const cfg = stepConfig[step];
  const stepIndex = ["intro", "camera", "orientation", "geo"].indexOf(step);

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
      {/* プログレス */}
      <div style={{ display: "flex", gap: 8, marginBottom: "2rem" }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: i <= stepIndex ? "#ae81ff" : "#333",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>

      {/* アイコン */}
      <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>{cfg.icon}</div>

      {/* タイトル */}
      <h2 style={{ fontSize: "1.3rem", marginBottom: "0.8rem" }}>{cfg.title}</h2>

      {/* 説明 */}
      <p
        style={{
          color: "#8888aa",
          marginBottom: "1.5rem",
          lineHeight: 1.7,
          whiteSpace: "pre-line",
          fontSize: "0.85rem",
        }}
      >
        {cfg.desc}
      </p>

      {/* 結果表示 */}
      {Object.entries(results).length > 0 && (
        <div
          style={{
            marginBottom: "1.5rem",
            fontSize: "0.75rem",
            color: "#666",
            display: "flex",
            gap: 12,
          }}
        >
          {results.camera !== undefined && (
            <span style={{ color: results.camera ? "#a6e22e" : "#e6db74" }}>
              カメラ {results.camera ? "✓" : "×"}
            </span>
          )}
          {results.orientation !== undefined && (
            <span style={{ color: results.orientation ? "#a6e22e" : "#e6db74" }}>
              方位 {results.orientation ? "✓" : "×"}
            </span>
          )}
          {results.geo !== undefined && (
            <span style={{ color: results.geo ? "#a6e22e" : "#e6db74" }}>
              位置 {results.geo ? "✓" : "×"}
            </span>
          )}
        </div>
      )}

      {/* メインボタン */}
      <button
        onClick={cfg.action}
        disabled={loading}
        style={{
          padding: "0.8rem 2rem",
          borderRadius: "2rem",
          background: loading
            ? "#555"
            : "linear-gradient(135deg, #ae81ff, #f92672)",
          color: "#fff",
          border: "none",
          fontWeight: 700,
          fontSize: "1rem",
          cursor: loading ? "wait" : "pointer",
          minWidth: 200,
        }}
      >
        {loading ? "確認中..." : step === "intro" ? "開始" : "許可する"}
      </button>

      {/* スキップ */}
      {cfg.skip && !loading && (
        <button
          onClick={cfg.skip}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            background: "transparent",
            color: "#666",
            border: "1px solid #333",
            borderRadius: "1rem",
            fontSize: "0.8rem",
            cursor: "pointer",
          }}
        >
          スキップ
        </button>
      )}
    </div>
  );
}
