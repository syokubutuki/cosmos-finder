# Cosmos Finder — スマホの向こうの宇宙

## プロジェクト概要
スマホカメラを向けた方向にある宇宙の天体と距離をAR風に可視化するWebアプリ。
ISSから460億光年先の宇宙の果てまで、4つのレイヤーで距離を体感できる。

## 技術構成
- Next.js（App Router）
- TypeScript
- Tailwind CSS
- ブラウザAPI: Device Orientation, MediaStream, Canvas 2D, Geolocation

## 4レイヤー構成
| レイヤー | 範囲 | 内容 |
|---------|------|------|
| 地球圏 | 〜36,000km | ISS（リアルタイム）、静止衛星 |
| 太陽系 | 〜5.5光時 | 太陽・月・惑星（ケプラー軌道計算） |
| 銀河 | 〜10万光年 | 恒星・星雲・星団・銀河中心 |
| 深宇宙 | 〜460億光年 | 銀河・銀河団・クエーサー・CMB |

## 核心モジュール
- `app/lib/distance-engine.ts` — 距離スケールエンジン（対数スケール・単位自動選択・比喩生成）
- `app/lib/coordinates.ts` — デバイス方位→天球座標変換
- `app/lib/orbital.ts` — ケプラー軌道計算（惑星位置）
- `app/lib/celestial-objects.ts` — 静的天体データ（30+天体）
- `app/components/CosmosOverlay.tsx` — Canvas 2Dメインオーバーレイ

## 外部API
- ISS位置: Open Notify API (`api.open-notify.org/iss-now.json`) — 30秒間隔ポーリング

## フォールバック
- 方位センサーなし → マウスドラッグ操作（CompassFallback）
- カメラなし → Canvas星空背景（CameraView内）
- ISS API失敗 → ISSマーカー非表示

## 開発コマンド
```
npm run dev    # ローカル起動
npm run build  # ビルド
npm run lint   # Lint
```

## デプロイ手順
```
git add .
git commit -m "変更内容のメモ"
git push
```
