/**
 * 天球座標 → 画面座標の射影変換 (Gnomonic projection)
 */

const DEG = Math.PI / 180;

export interface ProjectedPoint {
  x: number;
  y: number;
  visible: boolean;
}

/**
 * 方位角/仰角座標系での接線面射影 (gnomonic projection)
 *
 * Az/Alt系で投影することで、スマホの物理的な向きと画面の軸が常に一致する。
 * - x正方向 = 画面右 = 方位角増加方向（時計回り）
 * - y正方向 = 画面上 = 仰角増加方向
 */
export function gnomonicProjectAzAlt(
  az: number,
  alt: number,
  centerAz: number,
  centerAlt: number
): ProjectedPoint {
  const a = az * DEG;
  const e = alt * DEG;
  const a0 = centerAz * DEG;
  const e0 = centerAlt * DEG;

  const cosc =
    Math.sin(e0) * Math.sin(e) +
    Math.cos(e0) * Math.cos(e) * Math.cos(a - a0);

  if (cosc <= 0) {
    return { x: 0, y: 0, visible: false };
  }

  const x = (Math.cos(e) * Math.sin(a - a0)) / cosc;
  const y =
    (Math.cos(e0) * Math.sin(e) -
      Math.sin(e0) * Math.cos(e) * Math.cos(a - a0)) /
    cosc;

  return { x, y, visible: true };
}

/**
 * 正規化座標 → ピクセル座標に変換
 * fovDeg: 視野角（度）
 */
export function normalizedToScreen(
  nx: number,
  ny: number,
  canvasWidth: number,
  canvasHeight: number,
  fovDeg: number = 60
): { sx: number; sy: number } {
  const fovRad = fovDeg * DEG;
  const scale = canvasWidth / (2 * Math.tan(fovRad / 2));

  const sx = canvasWidth / 2 + nx * scale;
  const sy = canvasHeight / 2 - ny * scale; // Y軸反転

  return { sx, sy };
}
