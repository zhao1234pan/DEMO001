import { Color, Graphics } from "cc";
import type { LevelConfig, MapPoint } from "./LevelConfig";
import type { MapSkin } from "./BattleMapSkin";

type ReviewSkin = Exclude<MapSkin, "classic">;

const REVIEW_PALETTES: Record<ReviewSkin, { ground: string; road: string; edge: string; surface: string; mark: string; shade: string }> = {
  meadow: { ground: "#b8ce98", road: "#ecd4a3", edge: "#c6bc8e", surface: "#c6d6ab", mark: "#8caa74", shade: "#a6bf88" },
  courtyard: { ground: "#e0ddc9", road: "#f0dfbd", edge: "#c7bea3", surface: "#d0d5bc", mark: "#a4ae91", shade: "#cbd0b8" },
  storybook: { ground: "#a7b69a", road: "#f0dfba", edge: "#a7b69a", surface: "#bec8a9", mark: "#849b7b", shade: "#97aa8b" },
};

const PALETTES = [
  { forest: "#294f43", ground: "#adc597", bank: "#8aa77a", tile: "#c2d2a8", edge: "#708e65", road: "#edd3a0" },
  { forest: "#254d43", ground: "#a5c49d", bank: "#80a27e", tile: "#bcd4b0", edge: "#668b6c", road: "#e8cea0" },
  { forest: "#254b49", ground: "#a3beb0", bank: "#7e9f90", tile: "#bfd1bc", edge: "#678a7e", road: "#e2cfae" },
  { forest: "#294847", ground: "#9ab4a0", bank: "#799681", tile: "#b8cbb0", edge: "#607e6a", road: "#e9cca0" },
];

/** 可复用静态地图皮肤：道路来自真实路线，地台来自真实格位；没有第二套视觉专用坐标。 */
export class BattleMapView {
  constructor(private readonly g: Graphics, private readonly width: number) {}

  draw(level: LevelConfig, top: number, bottom: number, landmarksReady: boolean, skin: MapSkin = "classic"): MapPoint[] {
    // 评审通过前不替换正式默认皮肤；旧绘制分支的顺序、颜色与装饰选择完全保留。
    if (skin === "classic") return this.drawClassic(level, top, bottom, landmarksReady);
    return this.drawReviewSkin(level, top, bottom, landmarksReady, skin);
  }

  private drawClassic(level: LevelConfig, top: number, bottom: number, landmarksReady: boolean): MapPoint[] {
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

  private drawReviewSkin(level: LevelConfig, top: number, bottom: number, landmarksReady: boolean, skin: ReviewSkin): MapPoint[] {
    const g = this.g; const palette = REVIEW_PALETTES[skin];
    g.clear();
    // 候选都使用连续地面，没有包围整张棋盘的圆角面板或第二道深色边框。
    this.fillRect(0, top, this.width, bottom - top, 0, palette.ground);
    if (skin === "courtyard") this.drawCourtyardFloor(level);

    this.drawReviewRoad(level.pathPoints, skin);
    if (skin === "courtyard") {
      // 同材质连通铺地和单条浅缝表达“嵌砖”，不叠底面、亮边或按键式投影。
      this.drawJoinedSurface(level.towerSpots, palette.surface, 4);
      for (const [x, y] of level.towerSpots) {
        this.fillRect(x - 19, y - 15, 38, 30, 2, "#e3e5cf");
        g.strokeColor = this.color(palette.mark, 125); g.lineWidth = 0.8;
        g.roundRect(x - 19, y - 15, 38, 30, 2); g.stroke();
      }
    } else if (skin === "storybook") {
      // 整组共享一块平面剪纸；只画色面，不给每格加奶油描边和独立高光。
      this.drawJoinedSurface(level.towerSpots, palette.surface, 11);
      for (const [x, y] of level.towerSpots) this.drawCornerMarks(x, y, palette.mark, 95, 4);
    } else {
      // 草地上只有四个低对比定位短线，角色直接落在草坪，不再坐在凸起台阶上。
      for (const [x, y] of level.towerSpots) this.drawCornerMarks(x, y, palette.mark, 145, 6);
    }
    this.drawLandmarkThresholds(level.pathPoints, skin);
    if (!landmarksReady) this.drawReviewFallbackLandmarks(level.pathPoints);
    this.drawDirection(level.pathPoints[0], level.pathPoints[1]);
    return this.selectFoliageForSkin(level, skin);
  }

  private drawReviewRoad(path: readonly MapPoint[], skin: ReviewSkin): void {
    const g = this.g; const palette = REVIEW_PALETTES[skin];
    g.lineCap = Graphics.LineCap.ROUND; g.lineJoin = Graphics.LineJoin.ROUND;
    // 只有草地/庭院保留很薄、低对比的材质过渡；不画错位投影或三重管状边线。
    if (skin !== "storybook") {
      g.strokeColor = this.color(palette.edge); g.lineWidth = 52;
      this.trace(path, 0, skin === "courtyard" ? 8 : 13); g.stroke();
    }
    g.strokeColor = this.color(palette.road); g.lineWidth = 49;
    this.trace(path, 0, skin === "courtyard" ? 8 : 13); g.stroke();
    if (skin !== "courtyard") return;

    // 石砖缝沿实际每段路线局部展开，不把整幅方格纹理盖在路面上，也不产生假路。
    g.strokeColor = this.color("#c4b59b", 140); g.lineWidth = 0.8;
    for (let i = 1; i < path.length; i += 1) {
      const a = path[i - 1]; const b = path[i]; const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const ux = (b[0] - a[0]) / Math.max(1, length); const uy = (b[1] - a[1]) / Math.max(1, length);
      for (let distance = 35; distance < length - 28; distance += 38) {
        const x = a[0] + ux * distance; const y = a[1] + uy * distance;
        g.moveTo(x - uy * 21, y + ux * 21); g.lineTo(x + uy * 21, y - ux * 21); g.stroke();
        const end = Math.min(distance + 38, length - 28);
        g.moveTo(x, y); g.lineTo(a[0] + ux * end, a[1] + uy * end); g.stroke();
      }
    }
  }

  private drawJoinedSurface(spots: readonly MapPoint[], fill: string, radius: number): void {
    for (let i = 0; i < spots.length; i += 1) {
      const [x, y] = spots[i];
      for (let j = i + 1; j < spots.length; j += 1) {
        const [bx, by] = spots[j];
        if (Math.abs(x - bx) + Math.abs(y - by) !== 50) continue;
        this.fillRect(Math.min(x, bx) - 21, Math.min(y, by) - 17,
          Math.abs(x - bx) + 42, Math.abs(y - by) + 34, radius, fill);
      }
    }
    for (const [x, y] of spots) this.fillRect(x - 21, y - 17, 42, 34, radius, fill);
  }

  private drawCornerMarks(x: number, y: number, hex: string, alpha: number, length: number): void {
    const g = this.g; g.strokeColor = this.color(hex, alpha); g.lineWidth = 1.2;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      g.moveTo(x + sx * (16 - length), y + sy * 12);
      g.lineTo(x + sx * 16, y + sy * 12);
      g.lineTo(x + sx * 16, y + sy * (12 - length)); g.stroke();
    }
  }

  private drawCourtyardFloor(level: LevelConfig): void {
    const g = this.g; g.strokeColor = this.color("#bec6af", 95); g.lineWidth = 0.7;
    // 大块庭院铺装只在空闲地面露出接缝，主动退让道路、角色画布与地标文字。
    for (let y = 130; y < 603; y += 100) this.drawFreeFloorLine(level, [12, y], [this.width - 12, y]);
    for (let x = 90; x < this.width - 12; x += 100) this.drawFreeFloorLine(level, [x, 86], [x, 602]);
  }

  private drawFreeFloorLine(level: LevelConfig, a: MapPoint, b: MapPoint): void {
    const g = this.g; const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / length; const uy = (b[1] - a[1]) / length;
    let beginning = -1;
    for (let distance = 0; distance <= length; distance += 8) {
      const step = Math.min(8, length - distance); const middle: MapPoint = [a[0] + ux * (distance + step / 2), a[1] + uy * (distance + step / 2)];
      const free = step > 0 && this.decorationFits(level, middle, Math.abs(ux) * step / 2 + 1, Math.abs(uy) * step / 2 + 1);
      if (free && beginning < 0) beginning = distance;
      if (!free && beginning >= 0) {
        if (distance - beginning >= 16) {
          g.moveTo(a[0] + ux * beginning, a[1] + uy * beginning); g.lineTo(a[0] + ux * distance, a[1] + uy * distance); g.stroke();
        }
        beginning = -1;
      }
    }
    // 长度不是8的倍数时仍需收尾，不能让同一条地砖缝在场地边缘无故缺一截。
    if (beginning >= 0 && length - beginning >= 16) {
      g.moveTo(a[0] + ux * beginning, a[1] + uy * beginning); g.lineTo(b[0], b[1]); g.stroke();
    }
  }

  private selectFoliageForSkin(level: LevelConfig, skin: ReviewSkin): MapPoint[] {
    const candidates: MapPoint[] = [];
    for (let row = 0; row < 9; row += 1) for (const x of [28, 86, 144, 202, 260, 318, this.width - 28]) {
      const point: MapPoint = [x, 108 + row * 58];
      if (this.decorationFits(level, point, 24, 20)) candidates.push(point);
    }
    // 植物首先贴合场地外围或完整空隙，数量有上限；不再用逐格盖章填满所有留白。
    candidates.sort((a, b) => Math.min(a[0], this.width - a[0]) - Math.min(b[0], this.width - b[0]) || a[1] - b[1]);
    const result: MapPoint[] = []; const maximum = skin === "courtyard" ? 4 : skin === "storybook" ? 5 : 6;
    for (const point of candidates) {
      if (result.length >= maximum) break;
      if (result.some(([x, y]) => Math.hypot(x - point[0], y - point[1]) < 82)) continue;
      result.push(point);
    }
    return result;
  }

  private decorationFits(level: LevelConfig, point: MapPoint, radiusX: number, radiusY: number): boolean {
    const [x, y] = point;
    if (x - radiusX < 4 || x + radiusX > this.width - 4 || y - radiusY < 84 || y + radiusY > 602) return false;
    // 道路按49宽加装饰外接圆检查；用保守整张精灵画布，而不是难以复现的Alpha轮廓。
    if (this.distanceToPath(point, level.pathPoints) < 24.5 + Math.hypot(radiusX, radiusY) + 3) return false;
    const overlaps = (left: number, top: number, right: number, bottom: number) =>
      x + radiusX + 4 > left && x - radiusX - 4 < right && y + radiusY + 4 > top && y - radiusY - 4 < bottom;
    if (level.towerSpots.some(([sx, sy]) => overlaps(sx - 30, sy - 47, sx + 30, sy + 13))) return false;
    return ![level.pathPoints[0], level.pathPoints[level.pathPoints.length - 1]]
      .some(([lx, ly]) => overlaps(lx - 32, ly - 40, lx + 32, ly + 34));
  }

  private drawLandmarkThresholds(path: readonly MapPoint[], skin: ReviewSkin): void {
    const palette = REVIEW_PALETTES[skin];
    // 门槛留在64×56地标自身脚底范围内，承接贴纸白边，不扩大地标或移动真实出入口。
    for (const [x, y] of [path[0], path[path.length - 1]]) {
      this.fillRect(x - 25, y + 20, 50, 12, skin === "courtyard" ? 2 : 7, skin === "storybook" ? "#d5ceb0" : palette.edge);
      this.fillRect(x - 22, y + 21, 44, 9, skin === "courtyard" ? 1 : 5, palette.road);
      if (skin === "courtyard") {
        this.g.strokeColor = this.color(palette.edge, 150); this.g.lineWidth = 0.7;
        this.g.moveTo(x - 7, y + 21); this.g.lineTo(x - 7, y + 30); this.g.stroke();
        this.g.moveTo(x + 8, y + 21); this.g.lineTo(x + 8, y + 30); this.g.stroke();
      }
    }
  }

  private drawReviewFallbackLandmarks(path: readonly MapPoint[]): void {
    const entry = path[0]; const goal = path[path.length - 1];
    this.fillRect(entry[0] - 22, entry[1] - 18, 44, 36, 16, "#526f57");
    this.fillRect(entry[0] - 12, entry[1] - 8, 24, 28, 10, "#263d37");
    this.fillRect(goal[0] - 24, goal[1] - 17, 48, 38, 6, "#fff1cd");
    this.fillRect(goal[0] - 24, goal[1] - 21, 48, 12, 4, "#dd8952");
    this.fillRect(goal[0] - 7, goal[1] - 1, 14, 22, 3, "#f8d879");
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

  private trace(path: readonly MapPoint[], offsetY: number, cornerRadius = 13): void {
    const g = this.g;
    g.moveTo(path[0][0], path[0][1] + offsetY);
    for (let i = 1; i < path.length - 1; i += 1) {
      const before = path[i - 1]; const corner = path[i]; const after = path[i + 1];
      const incoming = Math.hypot(corner[0] - before[0], corner[1] - before[1]);
      const outgoing = Math.hypot(after[0] - corner[0], after[1] - corner[1]);
      const radius = Math.min(cornerRadius, incoming / 3, outgoing / 3);
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
