/**
 * 天の川帯の画面座標を計算
 * 銀河面（銀緯0°）のラインを赤道座標に変換し、Az/Altで画面に射影する
 */

import { raDecToAzAlt } from "../lib/coordinates";
import { gnomonicProjectAzAlt, normalizedToScreen } from "../lib/projection";

const DEG = Math.PI / 180;

// 銀河座標系の定数
const RA_GP = 192.85948;
const DEC_GP = 27.12825;
const L_NCP = 122.93192;

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
const GALACTIC_PLANE_POINTS: { ra: number; dec: number }[] = [];
for (let l = 0; l <= 360; l += 10) {
  GALACTIC_PLANE_POINTS.push(galacticToEquatorial(l, 0));
}

export function getMilkyWayScreenPoints(
  centerAz: number,
  centerAlt: number,
  latitude: number,
  longitude: number,
  currentTime: number,
  canvasWidth: number,
  canvasHeight: number,
  fovDeg: number = 60
): { x: number; y: number }[] {
  const now = new Date(currentTime);
  const points: { x: number; y: number }[] = [];

  for (const pt of GALACTIC_PLANE_POINTS) {
    const { azimuth, altitude } = raDecToAzAlt(pt.ra, pt.dec, latitude, longitude, now);
    const proj = gnomonicProjectAzAlt(azimuth, altitude, centerAz, centerAlt);
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
