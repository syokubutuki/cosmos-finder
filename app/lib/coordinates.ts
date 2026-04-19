/**
 * デバイス方位 + GPS + 時刻 → 赤経・赤緯変換
 */

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/**
 * 地方恒星時 (Local Sidereal Time) を度で返す
 */
export function getLocalSiderealTime(date: Date, lonDeg: number): number {
  const j2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const d = (date.getTime() - j2000) / 86400000;

  // グリニッジ恒星時 (度)
  let gst = 280.46061837 + 360.98564736629 * d;
  gst = ((gst % 360) + 360) % 360;

  // 地方恒星時
  let lst = gst + lonDeg;
  lst = ((lst % 360) + 360) % 360;
  return lst;
}

/**
 * DeviceOrientation → カメラが向いている方位角・仰角
 *
 * 回転行列 R = Rz(α) × Rx(β) × Ry(γ) でカメラの向き (0,0,-1) を
 * 地球座標 (X=東, Y=北, Z=上) に変換する。
 *
 * @param compassHeading コンパスヘディング（真北から時計回り, 0-360°）
 * @param beta  前後傾斜 (-180〜180°, 0=水平, 90=垂直)
 * @param gamma 左右傾斜 (-90〜90°)
 * @returns azimuth (真北CW, 0-360°), altitude (水平0°, 天頂+90°)
 */
export function deviceOrientationToAzAlt(
  compassHeading: number,
  beta: number,
  gamma: number
): { azimuth: number; altitude: number } {
  // コンパスヘディング(CW) → W3C alpha(CCW) に変換してラジアン化
  const a = ((360 - compassHeading) % 360) * DEG;
  const b = beta * DEG;
  const g = gamma * DEG;

  // カメラ方向 (0, 0, -1) に回転行列 Rz(a)·Rx(b)·Ry(g) を適用
  // 結果: 地球座標系 (X=東, Y=北, Z=上) でのカメラ方向ベクトル
  const xEast =
    -Math.cos(a) * Math.sin(g) - Math.sin(a) * Math.sin(b) * Math.cos(g);
  const yNorth =
    -Math.sin(a) * Math.sin(g) + Math.cos(a) * Math.sin(b) * Math.cos(g);
  const zUp = -Math.cos(b) * Math.cos(g);

  // 方位角: 北から時計回り
  let azimuth = Math.atan2(xEast, yNorth) * RAD;
  azimuth = ((azimuth % 360) + 360) % 360;

  // 仰角: 水平面からの角度
  const altitude = Math.asin(Math.max(-1, Math.min(1, zUp))) * RAD;

  return { azimuth, altitude };
}

/**
 * 方位角(azimuth, 北=0, 東=90)・仰角(altitude) → 赤経(RA)・赤緯(Dec)
 * すべて度単位
 */
export function azAltToRaDec(
  azDeg: number,
  altDeg: number,
  latDeg: number,
  lonDeg: number,
  date: Date
): { ra: number; dec: number } {
  const az = azDeg * DEG;
  const alt = altDeg * DEG;
  const lat = latDeg * DEG;

  // 赤緯
  const sinDec =
    Math.sin(alt) * Math.sin(lat) +
    Math.cos(alt) * Math.cos(lat) * Math.cos(az);
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));

  // 時角
  const cosH =
    (Math.sin(alt) - Math.sin(lat) * Math.sin(dec)) /
    (Math.cos(lat) * Math.cos(dec));
  let H = Math.acos(Math.max(-1, Math.min(1, cosH)));
  if (Math.sin(az) > 0) H = 2 * Math.PI - H;

  // 赤経
  const lst = getLocalSiderealTime(date, lonDeg);
  let ra = lst - H * RAD;
  ra = ((ra % 360) + 360) % 360;

  return { ra, dec: dec * RAD };
}

/**
 * 赤経(RA)・赤緯(Dec) → 方位角・仰角
 */
export function raDecToAzAlt(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  lonDeg: number,
  date: Date
): { azimuth: number; altitude: number } {
  const lat = latDeg * DEG;
  const dec = decDeg * DEG;

  const lst = getLocalSiderealTime(date, lonDeg);
  const H = (lst - raDeg) * DEG;

  const sinAlt =
    Math.sin(dec) * Math.sin(lat) +
    Math.cos(dec) * Math.cos(lat) * Math.cos(H);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  const cosAz =
    (Math.sin(dec) - Math.sin(lat) * Math.sin(altitude)) /
    (Math.cos(lat) * Math.cos(altitude));
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz)));
  if (Math.sin(H) > 0) azimuth = 2 * Math.PI - azimuth;

  return { azimuth: azimuth * RAD, altitude: altitude * RAD };
}

/**
 * 2天体間の角距離（度）
 */
export function angularDistance(
  ra1: number,
  dec1: number,
  ra2: number,
  dec2: number
): number {
  const r1 = ra1 * DEG,
    d1 = dec1 * DEG;
  const r2 = ra2 * DEG,
    d2 = dec2 * DEG;

  const cosDist =
    Math.sin(d1) * Math.sin(d2) +
    Math.cos(d1) * Math.cos(d2) * Math.cos(r1 - r2);

  return Math.acos(Math.max(-1, Math.min(1, cosDist))) * RAD;
}
