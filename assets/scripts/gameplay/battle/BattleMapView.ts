import { Color, Graphics } from "cc";
import type { LevelConfig, MapPoint } from "./LevelConfig";

const PALETTES = [
  { forest: "#294f43", ground: "#adc597", bank: "#8aa77a", tile: "#c2d2a8", edge: "#708e65", road: "#edd3a0" },
  { forest: "#254d43", ground: "#a5c49d", bank: "#80a27e", tile: "#bcd4b0", edge: "#668b6c", road: "#e8cea0" },
  { forest: "#254b49", ground: "#a3beb0", bank: "#7e9f90", tile: "#bfd1bc", edge: "#678a7e", road: "#e2cfae" },
  { forest: "#294847", ground: "#9ab4a0", bank: "#799681", tile: "#b8cbb0", edge: "#607e6a", road: "#e9cca0" },
];

/** 可复用静态地图皮肤：道路来自真实路线，地台来自真实格位；没有第二套视觉专用坐标。 */
export class BattleMapView {
  constructor(private readonly g: Graphics, private readonly width: number) {}

  draw(level: LevelConfig, top: number, bottom: number, landmarksReady: boolean): MapPoint[] {
    const g = this.g;
    const palette = PALETTES[Math.min(PALETTES.length - 1, Math.floor((level.id - 1) / 3))];
    g.clear();
    this.fillRect(0, top, this.width, bottom - top, 0, palette.forest);
    // 草坪像一整块林间空地，浅地面与深森林形成稳定边框；长屏只扩展外部环境。
    this.fillRect(8, 84, this.width - 16, 527, 24, "#173e34");
    this.fillRect(8, 80, this.width - 16, 527, 24, palette.ground);
    const foliage = this.selectFoliage(level);
    for (const [x, y] of foliage) {
      g.fillColor = this.color(palette.bank, 100); g.ellipse(x, y + 8, 27, 13); g.fill();
    }
    this.drawRoad(level.pathPoints, palette.edge, palette.road);
    // 正交相邻的格位共用一条低对比地台，先看到几组布阵区，再看每一个可建造单元。
    const spots = level.towerSpots;
    for (let i = 0; i < spots.length; i += 1) {
      const [x, y] = spots[i];
      for (let j = i + 1; j < spots.length; j += 1) {
        const [bx, by] = spots[j];
        if (Math.abs(x - bx) + Math.abs(y - by) !== 50) continue;
        this.fillRect(Math.min(x, bx) - 19, Math.min(y, by) - 14,
          Math.abs(x - bx) + 38, Math.abs(y - by) + 31, 10, palette.bank);
      }
    }
    for (const [x, y] of spots) {
      this.fillRect(x - 21, y - 14, 42, 33, 9, palette.edge);
      this.fillRect(x - 21, y - 17, 42, 32, 9, palette.tile);
      g.strokeColor = this.color("#edf0d5", 160); g.lineWidth = 1;
      g.moveTo(x - 12, y - 14); g.lineTo(x + 12, y - 14); g.stroke();
    }
    const entry = level.pathPoints[0]; const goal = level.pathPoints[level.pathPoints.length - 1];
    // 图片到达前使用能辨明进出方向的简洁地标，不再退回屏外传送圆。
    if (!landmarksReady) {
      this.fillRect(entry[0] - 22, entry[1] - 18, 44, 36, 16, "#526f57");
      this.fillRect(entry[0] - 12, entry[1] - 8, 24, 28, 10, "#263d37");
      this.fillRect(goal[0] - 24, goal[1] - 17, 48, 38, 6, "#fff1cd");
      this.fillRect(goal[0] - 24, goal[1] - 21, 48, 12, 4, "#dd8952");
      this.fillRect(goal[0] - 7, goal[1] - 1, 14, 22, 3, "#f8d879");
    }
    this.drawDirection(entry, level.pathPoints[1]);
    return foliage;
  }

  private drawRoad(path: readonly MapPoint[], edge: string, road: string): void {
    const g = this.g;
    g.lineCap = Graphics.LineCap.ROUND; g.lineJoin = Graphics.LineJoin.ROUND;
    // 一条路线画阴影、路缘、路面三个层次，不给十关制作十张背景图。
    for (const layer of [{ width: 59, color: "#577857", dy: 3 }, { width: 56, color: edge, dy: 0 }, { width: 49, color: road, dy: 0 }]) {
      g.strokeColor = this.color(layer.color); g.lineWidth = layer.width;
      this.trace(path, layer.dy); g.stroke();
    }
    // 路面接缝稀疏、固定且低对比，不逐帧随机制造噪点。
    g.strokeColor = this.color("#b49466", 75); g.lineWidth = 1.2;
    for (let i = 1; i < path.length; i += 1) {
      const a = path[i - 1]; const b = path[i];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const dx = (b[0] - a[0]) / Math.max(1, length); const dy = (b[1] - a[1]) / Math.max(1, length);
      for (let distance = 56; distance < length - 34; distance += 68) {
        const x = a[0] + dx * distance; const y = a[1] + dy * distance;
        g.moveTo(x - dy * 11, y + dx * 11); g.lineTo(x + dy * 11, y - dx * 11); g.stroke();
      }
    }
  }

  private trace(path: readonly MapPoint[], offsetY: number): void {
    const g = this.g;
    g.moveTo(path[0][0], path[0][1] + offsetY);
    for (let i = 1; i < path.length - 1; i += 1) {
      const before = path[i - 1]; const corner = path[i]; const after = path[i + 1];
      const incoming = Math.hypot(corner[0] - before[0], corner[1] - before[1]);
      const outgoing = Math.hypot(after[0] - corner[0], after[1] - corner[1]);
      const radius = Math.min(13, incoming / 3, outgoing / 3);
      const x1 = corner[0] - (corner[0] - before[0]) * radius / Math.max(1, incoming);
      const y1 = corner[1] - (corner[1] - before[1]) * radius / Math.max(1, incoming);
      const x2 = corner[0] + (after[0] - corner[0]) * radius / Math.max(1, outgoing);
      const y2 = corner[1] + (after[1] - corner[1]) * radius / Math.max(1, outgoing);
      g.lineTo(x1, y1 + offsetY); g.quadraticCurveTo(corner[0], corner[1] + offsetY, x2, y2 + offsetY);
    }
    const end = path[path.length - 1]; g.lineTo(end[0], end[1] + offsetY);
  }

  private selectFoliage(level: LevelConfig): MapPoint[] {
    const result: MapPoint[] = [];
    const landmarks = [level.pathPoints[0], level.pathPoints[level.pathPoints.length - 1]];
    // 装饰必须退让道路、可建造格和地标；绿植是环境，不伪装成可清除盆栽。
    for (let row = 0; row < 9; row += 1) for (let column = 0; column < 7; column += 1) {
      if (result.length >= 10 || (row * 3 + column + level.id) % 3 === 0) continue;
      const point: MapPoint = [26 + column * 56, 109 + row * 58];
      if (point[1] > 583 || this.distanceToPath(point, level.pathPoints) < 54) continue;
      if (level.towerSpots.some(([x, y]) => Math.hypot(x - point[0], y - point[1]) < 56)) continue;
      if (landmarks.some(([x, y]) => Math.hypot(x - point[0], y - point[1]) < 72)) continue;
      if (result.some(([x, y]) => Math.hypot(x - point[0], y - point[1]) < 70)) continue;
      result.push(point);
    }
    return result;
  }

  private distanceToPath(point: MapPoint, path: readonly MapPoint[]): number {
    let result = Infinity;
    for (let i = 1; i < path.length; i += 1) {
      const a = path[i - 1]; const b = path[i]; const dx = b[0] - a[0]; const dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / Math.max(1, dx * dx + dy * dy)));
      result = Math.min(result, Math.hypot(point[0] - a[0] - dx * t, point[1] - a[1] - dy * t));
    }
    return result;
  }

  private drawDirection(start: MapPoint, next: MapPoint): void {
    const dx = next[0] - start[0]; const dy = next[1] - start[1]; const length = Math.hypot(dx, dy);
    const ux = dx / Math.max(1, length); const uy = dy / Math.max(1, length);
    const x = start[0] + ux * Math.min(43, length * 0.58); const y = start[1] + uy * Math.min(43, length * 0.58);
    const g = this.g;
    g.strokeColor = this.color("#9b7954", 180); g.lineWidth = 3;
    g.moveTo(x - ux * 5 - uy * 5, y - uy * 5 + ux * 5); g.lineTo(x + ux * 3, y + uy * 3);
    g.lineTo(x - ux * 5 + uy * 5, y - uy * 5 - ux * 5); g.stroke();
  }

  private fillRect(x: number, y: number, width: number, height: number, radius: number, hex: string): void {
    this.g.fillColor = this.color(hex); this.g.roundRect(x, y, width, height, radius); this.g.fill();
  }
  private color(hex: string, alpha = 255): Color {
    const color = new Color(); Color.fromHEX(color, hex); color.a = alpha; return color;
  }
}
