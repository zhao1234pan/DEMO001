import { levelTheme } from "./LevelTheme";
import { Color, Graphics } from "cc";
import type { LevelConfig, MapPoint } from "./LevelConfig";
import { selectSceneDecorations } from "./BattleSceneryLayout";
import type { SceneDecoration } from "./BattleSceneryLayout";

const COURTYARD_PALETTE = {
  ground: "#e0ddc9", road: "#f0dfbd", edge: "#c7bea3", surface: "#d0d5bc", mark: "#a4ae91",
};

/** 正式庭院地图：道路与地台沿用已选B方案；环境绿化独立布局，不参与寻路或建造。 */
export class BattleMapView {
  private palette = levelTheme({} as LevelConfig);
  constructor(private readonly g: Graphics, private readonly width: number) {}

  draw(level: LevelConfig, top: number, bottom: number, landmarksReady: boolean): SceneDecoration[] {
    this.palette = levelTheme(level);
    const g = this.g; const palette = this.palette;
    g.clear();
    // 连续浅暖铺装不加整图圆角边框；保留用户选定的B方案绘制顺序与尺寸。
    this.fillRect(0, top, this.width, bottom - top, 0, palette.ground);
    this.drawCourtyardFloor(level);
    this.drawRoad(level.pathPoints);
    // 同材质连通铺地和单条浅缝表达“嵌砖”，不叠底面、亮边或按键式投影。
    this.drawJoinedSurface(level.towerSpots, palette.surface, 4, level.gridSize);
    for (const [x, y] of level.towerSpots) {
      this.fillRect(x - 19, y - 15, 38, 30, 2, palette.tile);
      g.strokeColor = this.color(palette.mark, 125); g.lineWidth = 0.8;
      g.roundRect(x - 19, y - 15, 38, 30, 2); g.stroke();
    }
    this.drawLandmarkThresholds(level.pathPoints);
    if (!landmarksReady) this.drawFallbackLandmarks(level.pathPoints);
    this.drawDirection(level.pathPoints[0], level.pathPoints[1]);
    // 素材自带足底接触影，不再给绿化画大椭圆或疑似建造格的底板。
    return selectSceneDecorations(level, this.width);
  }

  private drawRoad(path: readonly MapPoint[]): void {
    const g = this.g; const palette = this.palette;
    g.lineCap = Graphics.LineCap.ROUND; g.lineJoin = Graphics.LineJoin.ROUND;
    // 路面49、低对比路缘52、转角8与已验B方案一致，不生成第二套视觉路线。
    g.strokeColor = this.color(palette.edge); g.lineWidth = 52;
    this.trace(path, 0, 8); g.stroke();
    g.strokeColor = this.color(palette.road); g.lineWidth = 49;
    this.trace(path, 0, 8); g.stroke();
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

  private drawJoinedSurface(spots: readonly MapPoint[], fill: string, radius: number, gridSize: number): void {
    for (let i = 0; i < spots.length; i += 1) {
      const [x, y] = spots[i];
      for (let j = i + 1; j < spots.length; j += 1) {
        const [bx, by] = spots[j];
        if (Math.abs(x - bx) + Math.abs(y - by) !== gridSize) continue;
        this.fillRect(Math.min(x, bx) - 21, Math.min(y, by) - 17,
          Math.abs(x - bx) + 42, Math.abs(y - by) + 34, radius, fill);
      }
    }
    for (const [x, y] of spots) this.fillRect(x - 21, y - 17, 42, 34, radius, fill);
  }

  private drawCourtyardFloor(level: LevelConfig): void {
    const g = this.g; g.strokeColor = this.color(this.palette.seam, 95); g.lineWidth = 0.7;
    // 大块庭院铺装只在空闲地面露出接缝，主动退让道路、角色画布与地标文字。
    for (let y = 130; y < 603; y += level.theme === "rain" ? 75 : level.theme === "market" ? 150 : 100) this.drawFreeFloorLine(level, [12, y], [this.width - 12, y]);
    for (let x = 90; x < this.width - 12; x += level.theme === "midnight" ? 75 : 100) this.drawFreeFloorLine(level, [x, 86], [x, 602]);
  }

  private drawFreeFloorLine(level: LevelConfig, a: MapPoint, b: MapPoint): void {
    const g = this.g; const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / length; const uy = (b[1] - a[1]) / length;
    let beginning = -1;
    for (let distance = 0; distance <= length; distance += 8) {
      const step = Math.min(8, length - distance); const middle: MapPoint = [a[0] + ux * (distance + step / 2), a[1] + uy * (distance + step / 2)];
      const free = step > 0 && this.floorLineFits(level, middle, Math.abs(ux) * step / 2 + 1, Math.abs(uy) * step / 2 + 1);
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

  private floorLineFits(level: LevelConfig, point: MapPoint, radiusX: number, radiusY: number): boolean {
    const [x, y] = point;
    if (x - radiusX < 4 || x + radiusX > this.width - 4 || y - radiusY < 84 || y + radiusY > 602) return false;
    // 只用于沿用B方案的细砖缝；成组绿化在纯布局模块中使用完整矩形的严格道路净空。
    if (this.distanceToPath(point, level.pathPoints) < 24.5 + Math.hypot(radiusX, radiusY) + 3) return false;
    const overlaps = (left: number, top: number, right: number, bottom: number) =>
      x + radiusX + 4 > left && x - radiusX - 4 < right && y + radiusY + 4 > top && y - radiusY - 4 < bottom;
    if (level.towerSpots.some(([sx, sy]) => overlaps(sx - 30, sy - 47, sx + 30, sy + 13))) return false;
    return ![level.pathPoints[0], level.pathPoints[level.pathPoints.length - 1]]
      .some(([lx, ly]) => overlaps(lx - 32, ly - 40, lx + 32, ly + 34));
  }

  private drawLandmarkThresholds(path: readonly MapPoint[]): void {
    const palette = COURTYARD_PALETTE;
    // 地铁口和商店继续使用中心下移6的64×56画布；门槛只占原画布脚前范围，不移动路径。
    for (const [x, y] of [path[0], path[path.length - 1]]) {
      this.fillRect(x - 25, y + 20, 50, 12, 2, palette.edge);
      this.fillRect(x - 22, y + 21, 44, 9, 1, palette.road);
      this.g.strokeColor = this.color(palette.edge, 150); this.g.lineWidth = 0.7;
      this.g.moveTo(x - 7, y + 21); this.g.lineTo(x - 7, y + 30); this.g.stroke();
      this.g.moveTo(x + 8, y + 21); this.g.lineTo(x + 8, y + 30); this.g.stroke();
    }
  }

  private drawFallbackLandmarks(path: readonly MapPoint[]): void {
    const entry = path[0]; const goal = path[path.length - 1]; const g = this.g;
    // 资源未就绪也保持“地下通道”的形态：米灰石围墙、下行台阶、扶手与小绿牌，不退回山洞。
    this.fillRect(entry[0] - 25, entry[1] - 9, 50, 33, 3, "#d6d0b8");
    this.fillRect(entry[0] - 19, entry[1] - 5, 38, 25, 1, "#536a60");
    for (let i = 0; i < 4; i += 1) {
      this.fillRect(entry[0] - 17, entry[1] + 1 + i * 5, 34, 3, 0, "#c0bba6");
    }
    this.fillRect(entry[0] - 16, entry[1] - 19, 32, 9, 2, "#497363");
    g.strokeColor = this.color("#777765"); g.lineWidth = 2;
    for (const side of [-1, 1]) {
      g.moveTo(entry[0] + side * 23, entry[1] + 20); g.lineTo(entry[0] + side * 23, entry[1] - 12);
      g.lineTo(entry[0] + side * 18, entry[1] - 12); g.stroke();
    }
    this.fillRect(goal[0] - 24, goal[1] - 17, 48, 38, 6, "#fff1cd");
    this.fillRect(goal[0] - 24, goal[1] - 21, 48, 12, 4, "#dd8952");
    this.fillRect(goal[0] - 7, goal[1] - 1, 14, 22, 3, "#f8d879");
  }

  private trace(path: readonly MapPoint[], offsetY: number, cornerRadius: number): void {
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
