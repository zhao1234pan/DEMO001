import {
  _decorator, Color, Component, EventTouch, Graphics, HorizontalTextAlignment,
  Label, Layers, Node, ResolutionPolicy, UITransform, Vec3,
  VerticalTextAlignment, view,
} from "cc";
import { ENEMY_CONFIG, GAME_CONFIG, TOWER_CONFIG, EnemyKind, TowerKind } from "./GameConfig";
import { getLevelConfig, LevelConfig } from "./LevelConfig";
import { PlatformService } from "../../services/PlatformService";

const { ccclass } = _decorator;
// 运行时仍使用 390×700 的轻量逻辑坐标，再映射到正式 750×1334 设计分辨率。
// 这样可以保持现有原型数值易读，同时确保抖音竖屏适配由 Cocos 统一处理。
const DESIGN_W = GAME_CONFIG.designWidth;
const DESIGN_H = GAME_CONFIG.designHeight;
const W = GAME_CONFIG.prototypeLayoutWidth;
const H = GAME_CONFIG.prototypeLayoutHeight;
// 底部 68 像素只保留三个救援道具；建造和升级改为跟随塔位的上下文操作。
const PANEL_Y = 632;
const KINDS: TowerKind[] = ["sprout", "frost", "bloom"];
type PropKind = "freeze" | "clear" | "cash";
const PROP_KINDS: PropKind[] = ["freeze", "clear", "cash"];

interface Enemy {
  kind: EnemyKind; hp: number; maxHp: number; speed: number; reward: number;
  radius: number; color: string; damage: number; distance: number; x: number; y: number;
  age: number; slow: number;
}

interface Tower {
  x: number; y: number; kind: TowerKind; level: number; cooldown: number;
  angle: number; spent: number; spot: Spot;
}

interface Spot { x: number; y: number; tower: Tower | null; }
interface Shot { x: number; y: number; target: Enemy; kind: TowerKind; level: number; speed: number; }
interface Particle { x: number; y: number; vx: number; vy: number; size: number; color: string; life: number; maxLife: number; }

@ccclass("GameRoot")
export class GameRoot extends Component {
  private contentRoot!: Node;
  private staticG!: Graphics;
  private dynamicG!: Graphics;
  private labels = new Map<string, Label>();
  private currentLevelId = 1;
  private level: LevelConfig = getLevelConfig(1);
  private coins = 0;
  private lives = 0;
  private wave: number = 0;
  private inWave = false;
  private paused = false;
  private screen: "playing" | "win" | "lose" = "playing";
  private revived = false;
  private selectedTower: Tower | null = null;
  private selectedSpot: Spot | null = null;
  private queue: EnemyKind[] = [];
  private spawnTimer = 0;
  private spawnInterval = 0.72;
  private nextWaveTimer = 4;
  private frozenTime = 0;
  private adRequesting = false;
  private propCounts: Record<PropKind, number> = { freeze: 1, clear: 1, cash: 1 };
  private propAdUsed: Record<PropKind, boolean> = { freeze: false, clear: false, cash: false };
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private shots: Shot[] = [];
  private particles: Particle[] = [];
  private spots: Spot[] = [];
  private toastText = "选择店员，再点击发光塔位";
  private toastTime = 4;
  private defeated = 0;
  private earned = 0;
  private pathLength = 0;
  private readonly hideHandler = (): void => { this.paused = true; };

  onLoad(): void {
    view.setDesignResolutionSize(DESIGN_W, DESIGN_H, ResolutionPolicy.FIXED_WIDTH);
    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    transform.setContentSize(DESIGN_W, DESIGN_H);
    this.contentRoot = new Node("PrototypeContent");
    this.contentRoot.layer = Layers.Enum.UI_2D;
    this.contentRoot.addComponent(UITransform).setContentSize(W, H);
    this.contentRoot.setScale(DESIGN_W / W, DESIGN_H / H, 1);
    this.node.addChild(this.contentRoot);
    this.staticG = this.createGraphics("StaticMap");
    this.dynamicG = this.createGraphics("DynamicGame");
    this.createLabels();
    this.currentLevelId = Math.max(1, Math.min(GAME_CONFIG.maxLevels, PlatformService.getNumber("night_store_unlocked_level", 1)));
    this.resetLevel(this.currentLevelId);
    this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    PlatformService.onHide(this.hideHandler);
  }

  onDestroy(): void {
    this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    PlatformService.offHide(this.hideHandler);
  }

  update(dt: number): void {
    dt = Math.min(dt, 0.033);
    if (!this.paused && !this.adRequesting && this.screen === "playing") this.updateGame(dt);
    this.render();
  }

  private createGraphics(name: string): Graphics {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.setPosition(-W / 2, H / 2);
    node.setScale(1, -1, 1);
    this.contentRoot.addChild(node);
    node.addComponent(UITransform).setContentSize(W, H);
    return node.addComponent(Graphics);
  }

  private createLabels(): void {
    this.makeLabel("title", "叮咚！夜班开始", 14, 82, 21, 150, 28, "#fff9df", HorizontalTextAlignment.LEFT);
    this.makeLabel("level", "", 12, 65, 50, 110, 22, "#aee3bd", HorizontalTextAlignment.LEFT);
    this.makeLabel("wave", "", 12, 145, 50, 70, 22, "#aee3bd");
    this.makeLabel("coin", "", 16, 236, 34, 70, 36, "#fff9df");
    this.makeLabel("lives", "", 16, 310, 34, 54, 36, "#fff9df");
    this.makeLabel("pause", "Ⅱ", 18, 360, 34, 40, 40, "#fff9df");
    KINDS.forEach((kind) => {
      this.makeLabel(`build-${kind}`, TOWER_CONFIG[kind].name, 10, 0, 0, 52, 16, "#17352e");
      this.makeLabel(`build-cost-${kind}`, `●${TOWER_CONFIG[kind].cost}`, 9, 0, 0, 52, 14, "#8c6a24");
    });
    this.makeLabel("context-upgrade", "", 11, 0, 0, 112, 36, "#fff9df");
    this.makeLabel("prop-freeze", "", 11, 69, 666, 108, 38, "#fff9df");
    this.makeLabel("prop-clear", "", 11, 195, 666, 108, 38, "#fff9df");
    this.makeLabel("prop-cash", "", 11, 321, 666, 108, 38, "#fff9df");
    this.makeLabel("toast", "", 12, 195, 101, 290, 30, "#fff9df");
    this.makeLabel("overlayTitle", "", 27, 195, 284, 286, 45, "#17352e");
    this.makeLabel("overlayStats", "", 14, 195, 340, 270, 58, "#32724c");
    this.makeLabel("overlayPrimary", "", 14, 195, 412, 246, 44, "#fff9df");
    this.makeLabel("overlayNote", "", 11, 195, 454, 270, 24, "#71877d");
    this.makeLabel("overlaySecondary", "", 14, 195, 496, 246, 40, "#fff9df");
  }

  private makeLabel(key: string, value: string, size: number, x: number, y: number, width: number, height: number, hex: string, align = HorizontalTextAlignment.CENTER): Label {
    const node = new Node(key);
    node.layer = Layers.Enum.UI_2D;
    node.setPosition(x - W / 2, H / 2 - y);
    this.contentRoot.addChild(node);
    node.addComponent(UITransform).setContentSize(width, height);
    const label = node.addComponent(Label);
    label.string = value; label.fontSize = size; label.lineHeight = size + 5; label.color = this.color(hex);
    label.horizontalAlign = align; label.verticalAlign = VerticalTextAlignment.CENTER;
    this.labels.set(key, label);
    return label;
  }

  private color(hex: string, alpha = 255): Color {
    const value = new Color();
    Color.fromHEX(value, hex);
    value.a = alpha;
    return value;
  }

  private drawStaticMap(): void {
    const g = this.staticG;
    g.clear(); g.fillColor = this.color("#dff0b7"); g.rect(0, 0, W, H); g.fill();
    g.lineCap = Graphics.LineCap.ROUND; g.lineJoin = Graphics.LineJoin.ROUND;
    const path = this.level.pathPoints;
    const tracePath = (): void => {
      g.moveTo(path[0][0], path[0][1]);
      for (let i = 1; i < path.length; i += 1) g.lineTo(path[i][0], path[i][1]);
    };
    g.lineWidth = 58; g.strokeColor = this.color("#c59b60"); tracePath(); g.stroke();
    g.lineWidth = 48; g.strokeColor = this.color("#eacb92"); tracePath(); g.stroke();
    const start = path[0]; const end = path[path.length - 1];
    g.fillColor = this.color("#856b9e"); g.circle(start[0], start[1], 31); g.fill();
    g.fillColor = this.color("#c9a9df"); g.circle(start[0], start[1], 21); g.fill();
    g.fillColor = this.color("#88d072"); g.circle(end[0], end[1], 31); g.fill();
    g.fillColor = this.color("#d7ff86"); g.circle(end[0], end[1], 21); g.fill();
  }

  private render(): void {
    const g = this.dynamicG;
    g.clear();
    this.drawSpots(g);
    this.enemies.forEach((enemy) => this.drawEnemy(g, enemy));
    this.shots.forEach((shot) => this.disc(g, shot.x, shot.y, shot.kind === "bloom" ? 5 : 3.5, TOWER_CONFIG[shot.kind].shotColor));
    this.particles.forEach((p) => this.disc(g, p.x, p.y, p.size, p.color, Math.max(0, p.life / p.maxLife)));
    if (this.frozenTime > 0) this.box(g, 0, 72, W, PANEL_Y - 72, 0, "#b8f2ff", 0.14);
    this.drawContextMenu(g);
    this.drawPanels(g);
    this.syncLabels();
    if (this.paused || this.screen !== "playing") this.drawOverlay(g);
  }

  private drawSpots(g: Graphics): void {
    for (const spot of this.spots) {
      if (!spot.tower) {
        const selected = this.selectedSpot === spot;
        this.disc(g, spot.x, spot.y, selected ? 27 : 24, selected ? "#fff3c2" : "#ffffff", selected ? 0.88 : 0.42);
        this.ring(g, spot.x, spot.y, selected ? 27 : 24, selected ? "#e6a83e" : "#32724c", selected ? 0.95 : 0.4, selected ? 3 : 2);
        this.ring(g, spot.x, spot.y, 9, "#32724c", 0.45, 2);
      } else this.drawTower(g, spot.tower);
    }
  }

  private drawTower(g: Graphics, tower: Tower): void {
    const cfg = TOWER_CONFIG[tower.kind];
    if (tower === this.selectedTower) {
      this.disc(g, tower.x, tower.y, cfg.range * (1 + (tower.level - 1) * 0.08), "#57a96a", 0.08);
      this.ring(g, tower.x, tower.y, cfg.range * (1 + (tower.level - 1) * 0.08), "#32724c", 0.35, 1);
    }
    this.disc(g, tower.x, tower.y + 6, 22, "#8c7047");
    this.disc(g, tower.x, tower.y + 2, 18, cfg.color);
    this.ring(g, tower.x, tower.y + 2, 18, "#2d6048", 1, 2);
    if (tower.kind === "sprout") {
      this.disc(g, tower.x - 7, tower.y - 7, 8, "#3d874b"); this.disc(g, tower.x + 7, tower.y - 7, 8, "#3d874b");
      this.disc(g, tower.x, tower.y + 1, 8, "#dcf278");
    } else if (tower.kind === "frost") {
      for (let i = 0; i < 6; i += 1) {
        const a = (Math.PI * 2 * i) / 6;
        this.disc(g, tower.x + Math.cos(a) * 11, tower.y + 2 + Math.sin(a) * 11, 4, "#ddfbff");
      }
      this.disc(g, tower.x, tower.y + 2, 7, "#eefeff");
    } else {
      for (let i = 0; i < 6; i += 1) {
        const a = (Math.PI * 2 * i) / 6;
        this.disc(g, tower.x + Math.cos(a) * 10, tower.y + 2 + Math.sin(a) * 10, 6, "#ffd0de");
      }
      this.disc(g, tower.x, tower.y + 2, 6, "#ffe568");
    }
    for (let i = 0; i < tower.level; i += 1) this.disc(g, tower.x - 7 + i * 7, tower.y + 19, 2.2, "#ffc34d");
  }

  private drawEnemy(g: Graphics, enemy: Enemy): void {
    const wobble = Math.sin(enemy.age * 8) * 1.5;
    this.disc(g, enemy.x, enemy.y + 4 + wobble, enemy.radius, enemy.color);
    this.ring(g, enemy.x, enemy.y + 4 + wobble, enemy.radius, "#17352e", 0.45, 2);
    this.disc(g, enemy.x - 5, enemy.y + wobble, 2.2, "#fff9df"); this.disc(g, enemy.x + 5, enemy.y + wobble, 2.2, "#fff9df");
    this.disc(g, enemy.x - 5, enemy.y + wobble, 1.1, "#17352e"); this.disc(g, enemy.x + 5, enemy.y + wobble, 1.1, "#17352e");
    if (enemy.kind === "tank") this.box(g, enemy.x - 13, enemy.y - 14 + wobble, 26, 8, 4, "#8e7357");
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    this.box(g, enemy.x - 17, enemy.y - enemy.radius - 10, 34, 5, 3, "#17352e", 0.32);
    this.box(g, enemy.x - 17, enemy.y - enemy.radius - 10, 34 * ratio, 5, 3, ratio > 0.35 ? "#70c963" : "#eb685d");
    if (enemy.slow > 0) this.ring(g, enemy.x, enemy.y, enemy.radius + 3, "#b4f6ff", 0.7, 2);
  }

  private drawPanels(g: Graphics): void {
    g.fillColor = this.color("#17352e"); g.rect(0, 0, W, 72); g.fill(); g.rect(0, PANEL_Y, W, H - PANEL_Y); g.fill();
    this.box(g, 198, 13, 75, 42, 14, "#ffffff", 0.1); this.box(g, 276, 13, 58, 42, 14, "#ffffff", 0.1);
    this.disc(g, 360, 34, 20, "#ffffff", 0.12);
    this.box(g, 12, 642, 114, 48, 12, "#5797b5");
    this.box(g, 138, 642, 114, 48, 12, "#d46f62");
    this.box(g, 264, 642, 114, 48, 12, "#d5a748");
    if (this.toastTime > 0 && this.screen === "playing" && !this.paused) this.box(g, 43, 82, 304, 38, 16, "#17352e", 0.9);
  }

  private drawContextMenu(g: Graphics): void {
    if (this.paused || this.screen !== "playing") return;
    if (this.selectedSpot && !this.selectedSpot.tower) {
      for (const item of this.buildMenuItems()) {
        const affordable = this.coins >= TOWER_CONFIG[item.kind].cost;
        this.disc(g, item.x, item.y, 26, affordable ? "#fff9df" : "#aeb9b5", 0.98);
        this.ring(g, item.x, item.y, 26, affordable ? TOWER_CONFIG[item.kind].color : "#53645f", 1, 3);
      }
      return;
    }
    if (this.selectedTower) {
      const center = this.upgradeMenuCenter(this.selectedTower);
      const active = this.selectedTower.level < 3 && this.coins >= this.upgradeCost(this.selectedTower);
      this.box(g, center.x - 58, center.y - 20, 116, 40, 13, active ? "#58a95e" : "#53645f");
    }
  }

  private buildMenuItems(): Array<{ kind: TowerKind; x: number; y: number }> {
    const spot = this.selectedSpot;
    if (!spot || spot.tower) return [];
    const kinds = this.level.availableTowers;
    const spacing = 58;
    const totalWidth = (kinds.length - 1) * spacing;
    // 整组按钮一起做边缘避让，而不是逐个夹紧，防止三个按钮在窄边缘处互相重叠。
    const startX = Math.max(28, Math.min(W - 28 - totalWidth, spot.x - totalWidth / 2));
    const candidates = [spot.y - 62, spot.y + 62].map((value) => Math.max(150, Math.min(PANEL_Y - 30, value)));
    // 比较上下两侧所有按钮到道路的最小距离，优先把菜单放到不遮挡战斗的一边。
    const score = (candidateY: number): number => Math.min(...kinds.map((_, index) => this.distanceToPath(startX + index * spacing, candidateY)));
    const y = score(candidates[0]) >= score(candidates[1]) ? candidates[0] : candidates[1];
    return kinds.map((kind, index) => ({ kind, x: startX + index * spacing, y }));
  }

  private upgradeMenuCenter(tower: Tower): { x: number; y: number } {
    const x = Math.max(62, Math.min(W - 62, tower.x));
    const candidates = [tower.y - 58, tower.y + 58].map((value) => Math.max(100, Math.min(PANEL_Y - 24, value)));
    const y = this.distanceToPath(x, candidates[0]) >= this.distanceToPath(x, candidates[1]) ? candidates[0] : candidates[1];
    return { x, y };
  }

  private distanceToPath(x: number, y: number): number {
    let minimum = Number.POSITIVE_INFINITY;
    const path = this.level.pathPoints;
    for (let index = 0; index < path.length - 1; index += 1) {
      const a = path[index]; const b = path[index + 1];
      const vx = b[0] - a[0]; const vy = b[1] - a[1];
      const lengthSquared = vx * vx + vy * vy;
      const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - a[0]) * vx + (y - a[1]) * vy) / lengthSquared));
      minimum = Math.min(minimum, Math.hypot(x - a[0] - ratio * vx, y - a[1] - ratio * vy));
    }
    return minimum;
  }

  private drawOverlay(g: Graphics): void {
    g.fillColor = this.color("#0c1f1a", 196); g.rect(0, 72, W, H - 72); g.fill();
    if (this.paused && this.screen === "playing") {
      this.box(g, 55, 226, 280, 210, 24, "#fff9df"); this.box(g, 91, 355, 208, 52, 14, "#58a95e");
      return;
    }
    const win = this.screen === "win";
    this.box(g, 36, 176, 318, win ? 318 : 360, 26, "#fff9df");
    this.disc(g, 195, 225, 40, win ? "#8fd66f" : "#f09a7c");
    if (!win && !this.revived) {
      this.box(g, 72, 386, 246, 52, 14, "#e78954"); this.box(g, 72, 474, 246, 44, 14, "#58a95e");
    } else this.box(g, 72, 394, 246, 52, 14, "#58a95e");
  }

  private syncLabels(): void {
    this.setLabel("level", `第 ${this.level.id} 关`);
    this.setLabel("wave", `${this.wave}/${this.level.waves.length} 波`);
    this.setLabel("coin", `● ${this.coins}`); this.setLabel("lives", `♥ ${this.lives}`); this.setLabel("pause", this.paused ? "▶" : "Ⅱ");
    const contextVisible = this.screen === "playing" && !this.paused;
    const buildItems = contextVisible ? this.buildMenuItems() : [];
    KINDS.forEach((kind) => {
      const item = buildItems.find((candidate) => candidate.kind === kind);
      this.showLabel(`build-${kind}`, Boolean(item));
      this.showLabel(`build-cost-${kind}`, Boolean(item));
      if (!item) return;
      this.setLabel(`build-${kind}`, TOWER_CONFIG[kind].name);
      this.setLabel(`build-cost-${kind}`, `●${TOWER_CONFIG[kind].cost}`);
      this.setLabelPosition(`build-${kind}`, item.x, item.y - 3);
      this.setLabelPosition(`build-cost-${kind}`, item.x, item.y + 12);
      this.setLabelColor(`build-${kind}`, this.coins >= TOWER_CONFIG[kind].cost ? "#17352e" : "#53645f");
      this.setLabelColor(`build-cost-${kind}`, this.coins >= TOWER_CONFIG[kind].cost ? "#8c6a24" : "#53645f");
    });
    const showUpgrade = contextVisible && Boolean(this.selectedTower);
    this.showLabel("context-upgrade", showUpgrade);
    if (this.selectedTower && showUpgrade) {
      const tower = this.selectedTower;
      const center = this.upgradeMenuCenter(tower);
      this.setLabelPosition("context-upgrade", center.x, center.y);
      this.setLabel("context-upgrade", tower.level >= 3 ? `${TOWER_CONFIG[tower.kind].name} Lv.3｜已满级` : `${TOWER_CONFIG[tower.kind].name} Lv.${tower.level}｜升级 ●${this.upgradeCost(tower)}`);
    }
    this.setLabel("prop-freeze", this.propButtonText("冰柜冷气", "freeze"));
    this.setLabel("prop-clear", this.propButtonText("闭店清场", "clear"));
    this.setLabel("prop-cash", this.propButtonText("紧急零钱", "cash"));
    this.showLabel("toast", this.toastTime > 0 && this.screen === "playing" && !this.paused); this.setLabel("toast", this.toastText);
    const overlay = this.paused || this.screen !== "playing";
    ["overlayTitle", "overlayStats", "overlayPrimary", "overlayNote", "overlaySecondary"].forEach((key) => this.showLabel(key, overlay));
    if (!overlay) return;
    if (this.paused && this.screen === "playing") {
      this.setLabelPosition("overlayPrimary", 195, 381);
      this.setLabel("overlayTitle", "暂停营业"); this.setLabel("overlayStats", "店员们稍微休息一下"); this.setLabel("overlayPrimary", "继续营业");
      this.setLabel("overlayNote", ""); this.setLabel("overlaySecondary", "");
    } else {
      const win = this.screen === "win";
      this.setLabelPosition("overlayPrimary", 195, win || this.revived ? 420 : 412);
      this.setLabel("overlayTitle", win ? "顺利打烊！" : "便利店失守了");
      this.setLabel("overlayStats", `赶走 ${this.defeated} 只夜间精怪\n本局收入 ${this.earned}`);
      this.setLabel("overlayPrimary", win ? (this.level.id < GAME_CONFIG.maxLevels ? "下一关" : "再次挑战") : !this.revived ? "看广告继续营业" : "重新挑战");
      this.setLabel("overlayNote", !win && !this.revived ? "保留店员，从当前波次继续" : "");
      this.setLabel("overlaySecondary", !win && !this.revived ? "重新开始" : "");
    }
  }

  private propButtonText(name: string, kind: PropKind): string {
    if (this.propCounts[kind] > 0) return `${name}\n×${this.propCounts[kind]}`;
    return this.propAdUsed[kind] ? `${name}\n已用完` : `${name}\n看广告`;
  }

  private disc(g: Graphics, x: number, y: number, radius: number, hex: string, alpha = 1): void {
    g.fillColor = this.color(hex, Math.round(alpha * 255)); g.circle(x, y, radius); g.fill();
  }

  private ring(g: Graphics, x: number, y: number, radius: number, hex: string, alpha = 1, width = 1): void {
    g.strokeColor = this.color(hex, Math.round(alpha * 255)); g.lineWidth = width; g.circle(x, y, radius); g.stroke();
  }

  private box(g: Graphics, x: number, y: number, width: number, height: number, radius: number, hex: string, alpha = 1): void {
    g.fillColor = this.color(hex, Math.round(alpha * 255)); g.roundRect(x, y, width, height, radius); g.fill();
  }

  private setLabel(key: string, value: string): void { const item = this.labels.get(key); if (item) item.string = value; }
  private setLabelColor(key: string, hex: string): void { const item = this.labels.get(key); if (item) item.color = this.color(hex); }
  private setLabelPosition(key: string, x: number, y: number): void {
    const item = this.labels.get(key); if (item) item.node.setPosition(x - W / 2, H / 2 - y);
  }
  private showLabel(key: string, visible: boolean): void { const item = this.labels.get(key); if (item) item.node.active = visible; }

  private resetLevel(levelId = this.currentLevelId): void {
    this.currentLevelId = Math.max(1, Math.min(GAME_CONFIG.maxLevels, levelId)); this.level = getLevelConfig(this.currentLevelId);
    this.coins = this.level.initialCoins; this.lives = this.level.initialLives; this.wave = 0;
    this.inWave = false; this.paused = false; this.screen = "playing"; this.revived = false;
    this.selectedTower = null; this.selectedSpot = null; this.queue = []; this.spawnTimer = 0;
    this.spawnInterval = 0.78; this.nextWaveTimer = this.level.id === 1 ? 7 : 5; this.frozenTime = 0; this.adRequesting = false;
    this.propCounts = { freeze: 1, clear: 1, cash: 1 }; this.propAdUsed = { freeze: false, clear: false, cash: false };
    this.enemies = []; this.towers = []; this.shots = []; this.particles = [];
    this.spots = this.level.towerSpots.map(([x, y]) => ({ x, y, tower: null }));
    this.pathLength = this.computePathLength();
    this.drawStaticMap();
    this.toastText = this.level.id === 1 ? "先点空塔位，再选择豆包" : `第 ${this.level.id} 关：${this.level.title}`; this.toastTime = 4;
    this.defeated = 0; this.earned = 0;
  }

  private updateGame(dt: number): void {
    this.toastTime = Math.max(0, this.toastTime - dt);
    this.frozenTime = Math.max(0, this.frozenTime - dt);
    // 波次自动衔接，但预留短暂整理时间；首关开局等待更久，给玩家完成第一次建造。
    if (!this.inWave && this.enemies.length === 0 && this.wave < this.level.waves.length) {
      this.nextWaveTimer -= dt;
      if (this.nextWaveTimer <= 0) this.startWave();
    }
    if (this.inWave && this.queue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnEnemy(this.queue.shift()!);
        this.spawnTimer = this.spawnInterval;
      }
    }

    // 敌人只保存“沿路线行进的距离”，不同关卡换路线时无需改移动状态结构。
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      enemy.age += dt; enemy.slow = Math.max(0, enemy.slow - dt);
      enemy.distance += enemy.speed * (this.frozenTime > 0 ? 0 : enemy.slow > 0 ? 0.57 : 1) * dt;
      const pos = this.pathPosition(enemy.distance); enemy.x = pos.x; enemy.y = pos.y;
      if (pos.done || enemy.distance >= this.pathLength) {
        this.lives -= enemy.damage; this.burst(enemy.x, enemy.y, "#eb685d", 10); this.enemies.splice(i, 1);
        if (this.lives <= 0) {
          this.lives = 0; this.screen = "lose";
          PlatformService.setNumber("night_store_best_level", Math.max(this.level.id, PlatformService.getNumber("night_store_best_level", 0)));
          return;
        }
      }
    }

    // 店员始终优先攻击路线进度最靠前的目标，减少玩家无法理解的漏怪情况。
    for (const tower of this.towers) {
      tower.cooldown -= dt;
      const cfg = TOWER_CONFIG[tower.kind];
      const range = cfg.range * (1 + (tower.level - 1) * 0.08);
      const target = this.enemies.filter((enemy) => Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= range).sort((a, b) => b.distance - a.distance)[0];
      if (!target) continue;
      tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
      if (tower.cooldown <= 0) {
        this.shots.push({ x: tower.x, y: tower.y, target, kind: tower.kind, level: tower.level, speed: tower.kind === "bloom" ? 150 : 230 });
        // 升级同时提高伤害和少量攻速，但总效率不会压过新建店员，保留布阵选择。
        tower.cooldown = cfg.rate / (1 + (tower.level - 1) * 0.12);
      }
    }

    for (let i = this.shots.length - 1; i >= 0; i -= 1) {
      const shot = this.shots[i];
      if (!this.enemies.includes(shot.target)) { this.shots.splice(i, 1); continue; }
      const dx = shot.target.x - shot.x; const dy = shot.target.y - shot.y; const distance = Math.hypot(dx, dy);
      if (distance < shot.target.radius + 6) { this.hit(shot, shot.target); this.shots.splice(i, 1); }
      else { shot.x += dx / distance * shot.speed * dt; shot.y += dy / distance * shot.speed * dt; }
    }

    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 35 * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    if (this.inWave && this.queue.length === 0 && this.enemies.length === 0) {
      this.inWave = false; const bonus = 12 + this.wave * 4; this.coins += bonus; this.earned += bonus;
      if (this.wave >= this.level.waves.length) {
        this.screen = "win";
        PlatformService.setNumber("night_store_unlocked_level", Math.min(GAME_CONFIG.maxLevels, Math.max(this.currentLevelId + 1, PlatformService.getNumber("night_store_unlocked_level", 1))));
      } else {
        this.nextWaveTimer = 2.4;
        this.showToast(`守住了！夜班收入 +${bonus}`);
      }
    }
  }

  private startWave(): void {
    if (this.inWave || this.wave >= this.level.waves.length) return;
    const config = this.level.waves[this.wave]; this.wave += 1;
    this.queue = [...config.enemies]; this.spawnInterval = config.spawnInterval;
    this.spawnTimer = 0; this.inWave = true; this.showToast(config.announcement ?? `第 ${this.wave} 波来袭！`);
  }

  private spawnEnemy(kind: EnemyKind): void {
    const base = ENEMY_CONFIG[kind];
    const hp = Math.round(base.hp * this.level.enemyHealthScale * (1 + (this.wave - 1) * 0.08));
    const start = this.level.pathPoints[0];
    this.enemies.push({ kind, hp, maxHp: hp, speed: base.speed * this.level.enemySpeedScale, reward: base.reward, radius: base.radius, color: base.color, damage: base.damage, distance: 0, x: start[0], y: start[1], age: 0, slow: 0 });
  }

  private hit(shot: Shot, target: Enemy): void {
    const cfg = TOWER_CONFIG[shot.kind]; const damage = cfg.damage * (1 + (shot.level - 1) * 0.52);
    if (cfg.splash) {
      for (const enemy of this.enemies) if (Math.hypot(enemy.x - target.x, enemy.y - target.y) <= cfg.splash) enemy.hp -= damage;
      this.burst(target.x, target.y, cfg.shotColor, 12);
    } else {
      target.hp -= damage; if (cfg.slow) target.slow = 1.35 + shot.level * 0.2;
      this.burst(target.x, target.y, cfg.shotColor, 4);
    }
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i]; if (enemy.hp > 0) continue;
      this.defeatEnemyAt(i);
    }
  }

  private defeatEnemyAt(index: number): void {
    const enemy = this.enemies[index]; if (!enemy) return;
    this.coins += enemy.reward; this.earned += enemy.reward; this.defeated += 1;
    this.burst(enemy.x, enemy.y, "#ffc34d", 10); this.enemies.splice(index, 1);
  }

  private buildTower(spot: Spot, kind: TowerKind): void {
    if (!this.level.availableTowers.includes(kind)) { this.showToast("这名店员还没有加入夜班"); return; }
    const cfg = TOWER_CONFIG[kind];
    if (this.coins < cfg.cost) { this.showToast("夜班零钱不够，先赶走一些精怪吧"); return; }
    this.coins -= cfg.cost;
    const tower: Tower = { x: spot.x, y: spot.y, kind, level: 1, cooldown: 0, angle: 0, spent: cfg.cost, spot };
    spot.tower = tower; this.towers.push(tower); this.burst(spot.x, spot.y, cfg.color, 12);
    this.selectedTower = tower; this.selectedSpot = spot;
  }

  private upgradeSelected(): void {
    const tower = this.selectedTower; if (!tower) { this.showToast("先点击一名场上店员"); return; }
    if (tower.level >= 3) { this.showToast(`${TOWER_CONFIG[tower.kind].name}已经满级`); return; }
    const cost = this.upgradeCost(tower); if (this.coins < cost) { this.showToast("升级所需零钱不足"); return; }
    this.coins -= cost; tower.spent += cost; tower.level += 1; this.burst(tower.x, tower.y, "#ffc34d", 18);
  }

  private upgradeCost(tower: Tower): number {
    // 二级为基础造价的 75%，三级为 100%；首关第一波收入刚好能支持一次升级。
    return Math.round(TOWER_CONFIG[tower.kind].cost * (0.5 + tower.level * 0.25));
  }

  private useProp(kind: PropKind): void {
    if (this.screen !== "playing" || this.paused || this.adRequesting) return;
    if (this.propCounts[kind] > 0) {
      this.propCounts[kind] -= 1; this.applyProp(kind); return;
    }
    if (this.propAdUsed[kind]) { this.showToast("本关这个道具已经用完了"); return; }
    void this.usePropWithAd(kind);
  }

  private applyProp(kind: PropKind): void {
    if (kind === "freeze") {
      this.frozenTime = Math.max(this.frozenTime, 5); this.showToast("冰柜冷气：全场冻结 5 秒"); return;
    }
    if (kind === "cash") {
      const amount = 75 + this.level.id * 3; this.coins += amount; this.earned += amount;
      this.showToast(`紧急零钱 +${amount}`); return;
    }
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      if (enemy.kind === "tank") {
        enemy.hp -= enemy.maxHp * 0.45;
        this.burst(enemy.x, enemy.y, "#ffcf79", 8);
        if (enemy.hp <= 0) this.defeatEnemyAt(i);
      } else this.defeatEnemyAt(i);
    }
    this.showToast("闭店清场：普通精怪已被赶走");
  }

  private async usePropWithAd(kind: PropKind): Promise<void> {
    this.adRequesting = true; this.showToast("正在请求道具广告…");
    const result = await PlatformService.showRewardedVideo(GAME_CONFIG.rewardAdUnitId);
    this.adRequesting = false;
    if (!result.rewarded && result.reason !== "missing-ad-unit") { this.showToast("广告未完整观看，暂未补充道具"); return; }
    this.propAdUsed[kind] = true; this.applyProp(kind);
  }

  private onTouchEnd(event: EventTouch): void {
    const point = event.getUILocation();
    const local = this.node.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(point.x, point.y));
    const designX = local.x + DESIGN_W / 2;
    const designY = DESIGN_H / 2 - local.y;
    this.handlePress(designX * W / DESIGN_W, designY * H / DESIGN_H);
  }

  private handlePress(x: number, y: number): void {
    if (x < 0 || x > W || y < 0 || y > H || this.adRequesting) return;
    if (this.screen === "playing" && y < 70 && x > 335) { this.paused = !this.paused; return; }
    if (this.paused && this.screen === "playing") {
      if (x >= 91 && x <= 299 && y >= 355 && y <= 407) this.paused = false;
      return;
    }
    if (this.screen === "lose") {
      if (!this.revived && x >= 72 && x <= 318 && y >= 386 && y <= 438) void this.reviveWithAd();
      else if (!this.revived && x >= 72 && x <= 318 && y >= 474 && y <= 518) this.resetLevel();
      else if (this.revived && x >= 72 && x <= 318 && y >= 394 && y <= 446) this.resetLevel();
      return;
    }
    if (this.screen === "win") { if (x >= 72 && x <= 318 && y >= 394 && y <= 446) this.advanceLevel(); return; }

    // 先处理塔位旁的上下文按钮，避免点到按钮时被下方塔位再次选中。
    if (this.selectedTower) {
      const center = this.upgradeMenuCenter(this.selectedTower);
      if (x >= center.x - 58 && x <= center.x + 58 && y >= center.y - 20 && y <= center.y + 20) {
        this.upgradeSelected(); return;
      }
    } else if (this.selectedSpot && !this.selectedSpot.tower) {
      const buildItem = this.buildMenuItems().find((item) => Math.hypot(item.x - x, item.y - y) <= 29);
      if (buildItem) { this.buildTower(this.selectedSpot, buildItem.kind); return; }
    }

    if (y >= PANEL_Y) {
      if (y >= 642 && y <= 690) {
        const index = Math.floor((x - 12) / 126);
        if (index >= 0 && index < PROP_KINDS.length && x <= 12 + index * 126 + 114) this.useProp(PROP_KINDS[index]);
      }
      return;
    }

    const spot = this.spots.find((item) => Math.hypot(item.x - x, item.y - y) <= 29);
    if (spot) {
      this.selectedSpot = spot;
      this.selectedTower = spot.tower;
      // 玩家已经主动操作时收起教学提示，给塔位菜单让出完整可视空间。
      this.toastTime = 0;
      return;
    }
    this.selectedTower = null; this.selectedSpot = null;
  }

  private advanceLevel(): void {
    const next = this.currentLevelId < GAME_CONFIG.maxLevels ? this.currentLevelId + 1 : this.currentLevelId;
    this.resetLevel(next);
  }

  private async reviveWithAd(): Promise<void> {
    if (this.revived) return;
    this.adRequesting = true; this.showToast("正在请求继续营业广告…");
    const result = await PlatformService.showRewardedVideo(GAME_CONFIG.rewardAdUnitId);
    this.adRequesting = false;
    if (!result.rewarded && result.reason !== "missing-ad-unit") { this.showToast("广告未完整观看，暂未复活"); return; }
    // 复活保留布阵，但清掉当前波次的临时对象并回退一波，避免广告返回后立刻再次失败。
    this.revived = true; this.lives = Math.max(3, Math.ceil(this.level.initialLives * 0.4)); this.screen = "playing"; this.enemies = []; this.shots = []; this.queue = [];
    this.inWave = false; this.wave = Math.max(0, this.wave - 1); this.nextWaveTimer = 1.5;
    this.showToast(result.rewarded ? "继续营业！当前波次即将重来" : "暂无广告，测试环境已直接继续");
  }

  private showToast(value: string): void { this.toastText = value; this.toastTime = 2.3; }

  private burst(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2; const speed = 18 + Math.random() * 45;
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: 1.5 + Math.random() * 2.5, color, life: 0.35 + Math.random() * 0.35, maxLife: 0.7 });
    }
  }

  private pathPosition(distance: number): { x: number; y: number; done: boolean } {
    // 路线由正交折线组成；按累计距离逐段插值，入口方向可以是左、右或顶部。
    const path = this.level.pathPoints;
    let remaining = distance;
    for (let i = 0; i < path.length - 1; i += 1) {
      const a = path[i]; const b = path[i + 1]; const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (remaining <= length) { const t = remaining / length; return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, done: false }; }
      remaining -= length;
    }
    const end = path[path.length - 1]; return { x: end[0], y: end[1], done: true };
  }

  private computePathLength(): number {
    const path = this.level.pathPoints;
    let total = 0;
    for (let i = 0; i < path.length - 1; i += 1) total += Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]);
    return total;
  }
}
