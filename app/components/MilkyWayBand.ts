/**
 * 天の川帯の画面座標を計算
 * 銀河面（銀緯0°）のラインを赤道座標に変換し、画面に射影する
 */

import { gnomonicProject, normalizedToScreen } from "../lib/projection";

const DEG = Math.PI / 180;

// 銀河面の赤道座標（銀緯0°のラインをサンプリング）
// 銀河座標 → 赤道座標変換の事前計算値
const GALACTIC_PLANE_POINTS: { ra: number; dec: number }[] = [];

// 銀河座標系の定数
const RA_GP = 192.85948; // 銀河北極の赤経
const DEC_GP = 27.12825; // 銀河北極の赤緯
const L_NCP = 122.93192; // 天の北極の銀経

function galacticToEquatorial(l: number, b: number): { ra: number; dec: number } {
  const lr = l * DEG;
  const br = b * DEG;
  const decGP = DEC_GP * DEG;
  const raGP = RA_GP * DEG;
  const lncp = L_NCP * DEG;

  const sinDec =
    Math.sin(br) * Math.sin(decGP) +
    Math.cos(br) * Math.cos(decGP) * Math.sin(lr - lncp);
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));

  const y = Math.cos(br) * Math.cos(lr - lncp);
  const x = Math.sin(br) * Math.cos(decGP) - Math.cos(br) * Math.sin(decGP) * Math.sin(lr - lncp);
  let ra = Math.atan2(y, x) + raGP;

  return {
    ra: (((ra / DEG) % 360) + 360) % 360,
    dec: dec / DEG,
  };
}

// 銀経0°〜360°を10°刻みでサンプリング
for (let l = 0; l <= 360; l += 10) {
  GALACTIC_PLANE_POINTS.push(galacticToEquatorial(l, 0));
}

export function getMilkyWayScreenPoints(
  centerRA: number,
  centerDec: number,
  canvasWidth: number,
  canvasHeight: number,
  fovDeg: number = 60
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];

  for (const pt of GALACTIC_PLANE_POINTS) {
    const proj = gnomonicProject(pt.ra, pt.dec, centerRA, centerDec);
    if (!proj.visible) continue;

    const screen = normalizedToScreen(proj.x, proj.y, canvasWidth, canvasHeight, fovDeg);
    if (
      screen.sx >= -100 &&
      screen.sx <= canvasWidth + 100 &&
      screen.sy >= -100 &&
      screen.sy <= canvasHeight + 100
    ) {
      points.push({ x: screen.sx, y: screen.sy });
    }
  }

  return points;
}
