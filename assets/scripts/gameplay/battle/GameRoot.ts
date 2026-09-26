import {
  _decorator, Color, Component, EventTouch, Graphics, HorizontalTextAlignment,
  Label, Layers, Node, ResolutionPolicy, UITransform, Vec3,
  VerticalTextAlignment, view,
} from "cc";
import { DEBUG } from "cc/env";
import { ENEMY_CONFIG, GAME_CONFIG, TOWER_CONFIG, EnemyKind, TowerKind } from "./GameConfig";
import { getLevelConfig, LevelConfig, ObstacleKind } from "./LevelConfig";
import { PlatformService } from "../../services/PlatformService";
import { AudioService } from "../../services/AudioService";

const { ccclass } = _decorator;
// 运行时使用 390 宽的轻量逻辑坐标，逻辑高度与 750×1334 保持完全相同的宽高比。
// 横纵采用同一缩放比例，避免圆形、字号和触控区域在正式设计分辨率下发生轻微变形。
const DESIGN_W = GAME_CONFIG.designWidth;
const DESIGN_H = GAME_CONFIG.designHeight;
const W = GAME_CONFIG.prototypeLayoutWidth;
const H = GAME_CONFIG.prototypeLayoutHeight;
// 全局道具缩成右下角三个紧凑按钮，把主要可视面积还给塔防棋盘。
const PANEL_Y = 640;
const KINDS: TowerKind[] = ["sprout", "frost", "bloom"];
type GameSpeed = 1 | 2 | 3;
// 正式局内倍速档位按固定顺序循环，避免出现不受数值验证覆盖的任意倍率。
const GAME_SPEEDS: readonly GameSpeed[] = [1, 2, 3];
type PropKind = "freeze" | "clear" | "cash";
const PROP_BUTTONS = [
  { kind: "freeze" as const, x: 186, y: 648, width: 60, height: 40 },
  { kind: "clear" as const, x: 252, y: 648, width: 60, height: 40 },
  { kind: "cash" as const, x: 318, y: 648, width: 60, height: 40 },
];
// GM 入口只由 Cocos 的调试编译常量控制，正式抖音构建会直接隐藏整套测试界面。
const GM_BUTTON = { x: 348, y: 78, width: 36, height: 28 };
const GM_PROGRESS_BUTTON = { x: 115, y: 540, width: 160, height: 34 };
const GM_LEVEL_BUTTONS = Array.from({ length: GAME_CONFIG.maxLevels }, (_, index) => ({
  levelId: index + 1,
  x: 56 + (index % 2) * 158,
  y: 204 + Math.floor(index / 2) * 60,
  width: 120,
  height: 46,
}));

interface Enemy {
  kind: EnemyKind; hp: number; maxHp: number; speed: number; reward: number;
  radius: number; color: string; damage: number; distance: number; x: number; y: number;
  age: number; slow: number; hitFlash: number;
}

interface Tower {
  x: number; y: number; kind: TowerKind; level: number; cooldown: number;
  angle: number; spent: number; spot: Spot; recoil: number;
}

interface Obstacle {
  x: number; y: number; kind: ObstacleKind; hp: number; maxHp: number; reward: number;
  radius: number; hitFlash: number; spot: Spot;
}

type AttackTarget = Enemy | Obstacle;
interface Spot { x: number; y: number; tower: Tower | null; obstacle: Obstacle | null; }
interface Shot { x: number; y: number; target: AttackTarget; kind: TowerKind; level: number; speed: number; }
interface Particle { x: number; y: number; vx: number; vy: number; size: number; color: string; life: number; maxLife: number; }

@ccclass("GameRoot")
export class GameRoot extends Component {
  private contentRoot!: Node;
  private staticG!: Graphics;
  private dynamicG!: Graphics;
  private audio!: AudioService;
  private labels = new Map<string, Label>();
  private currentLevelId = 1;
  private level: LevelConfig = getLevelConfig(1);
  private coins = 0;
  private lives = 0;
  private wave: number = 0;
  private inWave = false;
  private paused = false;
  private gameSpeed: GameSpeed = 1;
  private screen: "playing" | "win" | "lose" = "playing";
  private revived = false;
  private gmPanelOpen = false;
  private gmSessionActive = false;
  private selectedTower: Tower | null = null;
  private selectedSpot: Spot | null = null;
  private selectedObstacle: Obstacle | null = null;
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
  private obstacles: Obstacle[] = [];
  private toastText = "选择店员，再点击发光塔位";
  private toastTime = 4;
  private defeated = 0;
  private earned = 0;
  private pathLength = 0;
  private damageFlash = 0;
  private battleFeedbackText = "";
  private battleFeedbackTime = 0;
  private battleFeedbackX = W / 2;
  private battleFeedbackY = H / 2;
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
    this.audio = new AudioService(this.node);
    this.createLabels();
    const savedSpeed = PlatformService.getNumber("night_store_game_speed", 1);
    this.gameSpeed = savedSpeed === 2 || savedSpeed === 3 ? savedSpeed : 1;
    this.currentLevelId = Math.max(1, Math.min(GAME_CONFIG.maxLevels, PlatformService.getNumber("night_store_unlocked_level", 1)));
    this.resetLevel(this.currentLevelId);
    this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    PlatformService.onHide(this.hideHandler);
  }

  onDestroy(): void {
    this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    PlatformService.offHide(this.hideHandler);
    this.audio.destroy();
  }

  update(dt: number): void {
    // 先限制单帧追赶时间，再把倍速后的游戏时间拆成稳定小步长，避免低帧率或三倍速时穿透目标。
    let remainingGameTime = Math.min(dt, 0.1) * this.gameSpeed;
    while (remainingGameTime > 0 && !this.paused && !this.gmPanelOpen && !this.adRequesting && this.screen === "playing") {
      const step = Math.min(remainingGameTime, 0.033);
      this.updateGame(step);
      remainingGameTime -= step;
    }
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
    this.makeLabel("coin", "", 15, 228, 34, 64, 36, "#fff9df");
    this.makeLabel("lives", "", 15, 292, 34, 50, 36, "#fff9df");
    this.makeLabel("speed", "×1", 12, 338, 34, 34, 36, "#fff9df");
    this.makeLabel("pause", "Ⅱ", 17, 372, 34, 34, 36, "#fff9df");
    KINDS.forEach((kind) => {
      this.makeLabel(`build-${kind}`, TOWER_CONFIG[kind].name, 10, 0, 0, 52, 16, "#17352e");
      this.makeLabel(`build-cost-${kind}`, `●${TOWER_CONFIG[kind].cost}`, 9, 0, 0, 52, 14, "#8c6a24");
    });
    this.makeLabel("context-upgrade", "", 10, 0, 0, 82, 34, "#fff9df");
    this.makeLabel("context-sell", "", 10, 0, 0, 82, 34, "#fff9df");
    this.makeLabel("obstacle-info", "", 10, 0, 0, 108, 30, "#fff9df");
    this.makeLabel("prop-freeze", "", 10, 216, 668, 60, 38, "#fff9df");
    this.makeLabel("prop-clear", "", 10, 282, 668, 60, 38, "#fff9df");
    this.makeLabel("prop-cash", "", 10, 348, 668, 60, 38, "#fff9df");
    this.makeLabel("toast", "", 12, 195, 101, 290, 30, "#fff9df");
    this.makeLabel("next-wave-title", "", 12, 0, 0, 68, 20, "#32724c");
    this.makeLabel("next-wave-number", "", 24, 0, 0, 58, 32, "#17352e");
    this.makeLabel("battle-feedback", "", 12, 0, 0, 150, 26, "#17352e");
    this.makeLabel("overlayTitle", "", 27, 195, 284, 286, 45, "#17352e");
    this.makeLabel("overlayStats", "", 14, 195, 340, 270, 58, "#32724c");
    this.makeLabel("overlayPrimary", "", 14, 195, 412, 246, 44, "#fff9df");
    this.makeLabel("overlayNote", "", 11, 195, 454, 270, 24, "#71877d");
    this.makeLabel("overlaySecondary", "", 14, 195, 496, 246, 40, "#fff9df");
    if (DEBUG) {
      this.makeLabel("gm-entry", "GM", 10, 366, 92, 36, 28, "#fff9df");
      this.makeLabel("gm-title", "GM 关卡选择", 21, 195, 148, 220, 34, "#17352e");
      this.makeLabel("gm-note", "仅调试构建显示｜切关不修改正式进度", 10, 195, 176, 280, 24, "#71877d");
      this.makeLabel("gm-close", "关闭", 10, 320, 148, 44, 28, "#fff9df");
      this.makeLabel("gm-current", "", 11, 195, 516, 250, 26, "#32724c");
      this.makeLabel("gm-progress", "返回正式进度", 11, 195, 557, 160, 34, "#fff9df");
      GM_LEVEL_BUTTONS.forEach((item) => this.makeLabel(`gm-level-${item.levelId}`, "", 12, item.x + item.width / 2, item.y + item.height / 2, item.width, item.height, "#17352e"));
    }
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
    if (this.damageFlash > 0) this.box(g, 0, 72, W, PANEL_Y - 72, 0, "#eb685d", Math.min(0.2, this.damageFlash * 0.7));
    this.drawContextMenu(g);
    this.drawPanels(g);
    this.drawWaveCountdown(g);
    if (this.paused || this.screen !== "playing") this.drawOverlay(g);
    this.drawGmPanel(g);
    this.syncLabels();
  }

  private drawSpots(g: Graphics): void {
    for (const spot of this.spots) {
      if (spot.obstacle) {
        this.drawObstacle(g, spot.obstacle);
      } else if (!spot.tower) {
        const selected = this.selectedSpot === spot;
        this.disc(g, spot.x, spot.y, selected ? 21 : 14, selected ? "#fff3c2" : "#ffffff", selected ? 0.9 : 0.2);
        this.ring(g, spot.x, spot.y, selected ? 21 : 14, selected ? "#e6a83e" : "#32724c", selected ? 0.95 : 0.25, selected ? 3 : 1.5);
        this.ring(g, spot.x, spot.y, selected ? 7 : 5, "#32724c", selected ? 0.6 : 0.25, 1.5);
      } else this.drawTower(g, spot.tower);
    }
  }

  private drawObstacle(g: Graphics, obstacle: Obstacle): void {
    const selected = obstacle === this.selectedObstacle;
    if (selected) {
      this.disc(g, obstacle.x, obstacle.y, obstacle.radius + 7, "#fff3c2", 0.45);
      this.ring(g, obstacle.x, obstacle.y, obstacle.radius + 7, "#e6a83e", 0.95, 3);
    }
    if (obstacle.kind === "crate") {
      this.box(g, obstacle.x - 14, obstacle.y - 13, 28, 26, 4, obstacle.hitFlash > 0 ? "#fff3c2" : "#a66f43");
      g.strokeColor = this.color("#6f472f"); g.lineWidth = 2;
      g.moveTo(obstacle.x - 10, obstacle.y - 9); g.lineTo(obstacle.x + 10, obstacle.y + 9);
      g.moveTo(obstacle.x + 10, obstacle.y - 9); g.lineTo(obstacle.x - 10, obstacle.y + 9); g.stroke();
    } else if (obstacle.kind === "basket") {
      this.disc(g, obstacle.x, obstacle.y + 2, 14, obstacle.hitFlash > 0 ? "#fff3c2" : "#d59b58");
      this.ring(g, obstacle.x, obstacle.y - 3, 10, "#6f472f", 0.9, 3);
      this.disc(g, obstacle.x - 5, obstacle.y + 2, 3, "#eb685d"); this.disc(g, obstacle.x + 5, obstacle.y + 2, 3, "#70c963");
    } else {
      this.box(g, obstacle.x - 10, obstacle.y + 3, 20, 13, 4, "#b87a50");
      this.disc(g, obstacle.x - 6, obstacle.y, 8, obstacle.hitFlash > 0 ? "#fff3c2" : "#58a95e");
      this.disc(g, obstacle.x + 6, obstacle.y - 2, 8, obstacle.hitFlash > 0 ? "#fff3c2" : "#70c963");
    }
    if (selected || obstacle.hitFlash > 0) {
      const ratio = Math.max(0, obstacle.hp / obstacle.maxHp);
      this.box(g, obstacle.x - 16, obstacle.y - obstacle.radius - 9, 32, 4, 2, "#17352e", 0.28);
      this.box(g, obstacle.x - 16, obstacle.y - obstacle.radius - 9, 32 * ratio, 4, 2, "#ffc34d");
    }
  }

  private drawTower(g: Graphics, tower: Tower): void {
    const cfg = TOWER_CONFIG[tower.kind];
    if (tower === this.selectedTower) {
      this.disc(g, tower.x, tower.y, cfg.range * (1 + (tower.level - 1) * 0.08), "#57a96a", 0.08);
      this.ring(g, tower.x, tower.y, cfg.range * (1 + (tower.level - 1) * 0.08), "#32724c", 0.35, 1);
    }
    this.disc(g, tower.x, tower.y + 4, 16, "#8c7047");
    this.disc(g, tower.x, tower.y + 1, 13, cfg.color);
    this.ring(g, tower.x, tower.y + 1, 13, "#2d6048", 1, 1.5);
    const barrelLength = tower.recoil > 0 ? 8 : 12;
    const barrelX = tower.x + Math.cos(tower.angle) * barrelLength;
    const barrelY = tower.y + 2 + Math.sin(tower.angle) * barrelLength;
    g.lineWidth = tower.kind === "bloom" ? 4.5 : 3;
    g.strokeColor = this.color(tower.kind === "frost" ? "#ddfbff" : "#734f35");
    g.moveTo(tower.x, tower.y + 2); g.lineTo(barrelX, barrelY); g.stroke();
    if (tower.recoil > 0) this.disc(g, barrelX, barrelY, tower.kind === "bloom" ? 4 : 3, cfg.shotColor, 0.9);
    if (tower.kind === "sprout") {
      this.disc(g, tower.x - 5, tower.y - 5, 5.5, "#3d874b"); this.disc(g, tower.x + 5, tower.y - 5, 5.5, "#3d874b");
      this.disc(g, tower.x, tower.y + 1, 6, "#dcf278");
    } else if (tower.kind === "frost") {
      for (let i = 0; i < 6; i += 1) {
        const a = (Math.PI * 2 * i) / 6;
        this.disc(g, tower.x + Math.cos(a) * 8, tower.y + 1 + Math.sin(a) * 8, 3, "#ddfbff");
      }
      this.disc(g, tower.x, tower.y + 1, 5, "#eefeff");
    } else {
      for (let i = 0; i < 6; i += 1) {
        const a = (Math.PI * 2 * i) / 6;
        this.disc(g, tower.x + Math.cos(a) * 7, tower.y + 1 + Math.sin(a) * 7, 4, "#ffd0de");
      }
      this.disc(g, tower.x, tower.y + 1, 4.5, "#ffe568");
    }
    for (let i = 0; i < tower.level; i += 1) this.disc(g, tower.x - 5 + i * 5, tower.y + 14, 1.7, "#ffc34d");
  }

  private drawEnemy(g: Graphics, enemy: Enemy): void {
    const wobble = Math.sin(enemy.age * 8) * 1.5;
    this.disc(g, enemy.x, enemy.y + 4 + wobble, enemy.radius, enemy.color);
    this.ring(g, enemy.x, enemy.y + 4 + wobble, enemy.radius, "#17352e", 0.45, 2);
    this.disc(g, enemy.x - 5, enemy.y + wobble, 2.2, "#fff9df"); this.disc(g, enemy.x + 5, enemy.y + wobble, 2.2, "#fff9df");
    this.disc(g, enemy.x - 5, enemy.y + wobble, 1.1, "#17352e"); this.disc(g, enemy.x + 5, enemy.y + wobble, 1.1, "#17352e");
    if (enemy.hitFlash > 0) this.disc(g, enemy.x, enemy.y + 4 + wobble, enemy.radius + 2, "#fff9df", Math.min(0.82, enemy.hitFlash * 7));
    if (enemy.kind === "tank") this.box(g, enemy.x - 13, enemy.y - 14 + wobble, 26, 8, 4, "#8e7357");
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    this.box(g, enemy.x - 17, enemy.y - enemy.radius - 10, 34, 5, 3, "#17352e", 0.32);
    this.box(g, enemy.x - 17, enemy.y - enemy.radius - 10, 34 * ratio, 5, 3, ratio > 0.35 ? "#70c963" : "#eb685d");
    if (enemy.slow > 0) this.ring(g, enemy.x, enemy.y, enemy.radius + 3, "#b4f6ff", 0.7, 2);
  }

  private drawPanels(g: Graphics): void {
    g.fillColor = this.color("#17352e"); g.rect(0, 0, W, 72); g.fill();
    this.box(g, 194, 13, 68, 42, 14, "#ffffff", 0.1); this.box(g, 265, 13, 55, 42, 14, "#ffffff", 0.1);
    this.disc(g, 338, 34, 18, "#ffffff", 0.12); this.disc(g, 372, 34, 18, "#ffffff", 0.12);
    const colors = ["#5797b5", "#d46f62", "#d5a748"];
    PROP_BUTTONS.forEach((button, index) => this.box(g, button.x, button.y, button.width, button.height, 11, colors[index], 0.96));
    if (this.toastTime > 0 && this.screen === "playing" && !this.paused) this.box(g, 43, 82, 304, 38, 16, "#17352e", 0.9);
  }

  private drawContextMenu(g: Graphics): void {
    if (this.paused || this.screen !== "playing") return;
    if (this.selectedSpot && !this.selectedSpot.tower && !this.selectedSpot.obstacle) {
      for (const item of this.buildMenuItems()) {
        const affordable = this.coins >= TOWER_CONFIG[item.kind].cost;
        this.disc(g, item.x, item.y, 26, affordable ? "#fff9df" : "#aeb9b5", 0.98);
        this.ring(g, item.x, item.y, 26, affordable ? TOWER_CONFIG[item.kind].color : "#53645f", 1, 3);
      }
      return;
    }
    if (this.selectedTower) {
      for (const item of this.towerMenuItems(this.selectedTower)) {
        const active = item.action === "sell" || (this.selectedTower.level < 3 && this.coins >= this.upgradeCost(this.selectedTower));
        this.box(g, item.x - 41, item.y - 18, 82, 36, 11, item.action === "sell" ? "#d88758" : active ? "#58a95e" : "#53645f");
      }
    }
  }

  private shouldShowWaveCountdown(): boolean {
    return this.screen === "playing" && !this.paused && !this.inWave && this.enemies.length === 0
      && this.wave < this.level.waves.length && this.toastTime <= 0;
  }

  private waveCountdownPosition(): { x: number; y: number } {
    const start = this.level.pathPoints[0];
    // 提示贴近怪物入口，并为顶部状态栏、底部道具栏和屏幕边缘保留安全距离。
    return {
      x: Math.max(42, Math.min(W - 42, start[0])),
      y: Math.max(145, Math.min(PANEL_Y - 44, start[1])),
    };
  }

  private drawWaveCountdown(g: Graphics): void {
    if (!this.shouldShowWaveCountdown()) return;
    const position = this.waveCountdownPosition();
    const urgent = this.nextWaveTimer <= 3;
    this.disc(g, position.x, position.y + 3, urgent ? 37 : 35, "#17352e", 0.2);
    this.disc(g, position.x, position.y, urgent ? 35 : 33, "#fff9df", 0.96);
    this.ring(g, position.x, position.y, urgent ? 35 : 33, urgent ? "#e78954" : "#58a95e", 1, urgent ? 3 : 2);
  }

  private buildMenuItems(): Array<{ kind: TowerKind; x: number; y: number }> {
    const spot = this.selectedSpot;
    if (!spot || spot.tower || spot.obstacle) return [];
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

  private towerMenuItems(tower: Tower): Array<{ action: "upgrade" | "sell"; x: number; y: number }> {
    const totalWidth = 172;
    const startX = Math.max(6, Math.min(W - totalWidth - 6, tower.x - totalWidth / 2));
    const centerX = startX + totalWidth / 2;
    const candidates = [tower.y - 58, tower.y + 58].map((value) => Math.max(100, Math.min(PANEL_Y - 24, value)));
    const y = this.distanceToPath(centerX, candidates[0]) >= this.distanceToPath(centerX, candidates[1]) ? candidates[0] : candidates[1];
    return [
      { action: "upgrade", x: startX + 41, y },
      { action: "sell", x: startX + 131, y },
    ];
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

  private drawGmPanel(g: Graphics): void {
    if (!DEBUG) return;
    this.box(g, GM_BUTTON.x, GM_BUTTON.y, GM_BUTTON.width, GM_BUTTON.height, 9, "#7358a6", 0.96);
    if (!this.gmPanelOpen) return;
    g.fillColor = this.color("#0c1f1a", 205); g.rect(0, 72, W, H - 72); g.fill();
    this.box(g, 35, 112, 320, 474, 24, "#fff9df");
    this.box(g, 298, 134, 44, 28, 9, "#7358a6");
    for (const item of GM_LEVEL_BUTTONS) {
      const current = item.levelId === this.currentLevelId;
      this.box(g, item.x, item.y, item.width, item.height, 12, current ? "#ffc34d" : "#dff0b7");
    }
    this.box(g, GM_PROGRESS_BUTTON.x, GM_PROGRESS_BUTTON.y, GM_PROGRESS_BUTTON.width, GM_PROGRESS_BUTTON.height, 11, "#58a95e");
  }

  private syncLabels(): void {
    this.setLabel("level", `第 ${this.level.id} 关${this.gmSessionActive ? "·GM" : ""}`);
    this.setLabel("wave", `${this.wave}/${this.level.waves.length} 波`);
    this.setLabel("coin", `● ${this.coins}`); this.setLabel("lives", `♥ ${this.lives}`);
    this.setLabel("speed", `×${this.gameSpeed}`); this.setLabel("pause", this.paused ? "▶" : "Ⅱ");
    const contextVisible = this.screen === "playing" && !this.paused && !this.gmPanelOpen;
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
    const showTowerMenu = contextVisible && Boolean(this.selectedTower);
    this.showLabel("context-upgrade", showTowerMenu);
    this.showLabel("context-sell", showTowerMenu);
    if (this.selectedTower && showTowerMenu) {
      const tower = this.selectedTower;
      const items = this.towerMenuItems(tower);
      const upgrade = items.find((item) => item.action === "upgrade")!;
      const sell = items.find((item) => item.action === "sell")!;
      this.setLabelPosition("context-upgrade", upgrade.x, upgrade.y);
      this.setLabelPosition("context-sell", sell.x, sell.y);
      this.setLabel("context-upgrade", tower.level >= 3 ? "已满级" : `升级 ●${this.upgradeCost(tower)}`);
      this.setLabel("context-sell", `出售 +${this.sellRefund(tower)}`);
    }
    const showObstacle = contextVisible && Boolean(this.selectedObstacle);
    this.showLabel("obstacle-info", showObstacle);
    if (this.selectedObstacle && showObstacle) {
      const obstacle = this.selectedObstacle;
      this.setLabelPosition("obstacle-info", Math.max(54, Math.min(W - 54, obstacle.x)), Math.max(92, obstacle.y - obstacle.radius - 26));
      this.setLabel("obstacle-info", `清理中 ♥${Math.ceil(obstacle.hp)}  +${obstacle.reward}`);
    }
    this.setLabel("prop-freeze", this.propButtonText("freeze"));
    this.setLabel("prop-clear", this.propButtonText("clear"));
    this.setLabel("prop-cash", this.propButtonText("cash"));
    ["prop-freeze", "prop-clear", "prop-cash"].forEach((key) => this.showLabel(key, !this.gmPanelOpen));
    this.showLabel("toast", this.toastTime > 0 && this.screen === "playing" && !this.paused && !this.gmPanelOpen); this.setLabel("toast", this.toastText);
    const showWaveCountdown = !this.gmPanelOpen && this.shouldShowWaveCountdown();
    this.showLabel("next-wave-title", showWaveCountdown);
    this.showLabel("next-wave-number", showWaveCountdown);
    if (showWaveCountdown) {
      const position = this.waveCountdownPosition();
      this.setLabelPosition("next-wave-title", position.x, position.y - 11);
      this.setLabelPosition("next-wave-number", position.x, position.y + 11);
      this.setLabel("next-wave-title", `下一波 ${this.wave + 1}/${this.level.waves.length}`);
      this.setLabel("next-wave-number", `${Math.max(1, Math.ceil(this.nextWaveTimer))}`);
    }
    const showBattleFeedback = this.battleFeedbackTime > 0 && this.screen === "playing" && !this.paused && !this.gmPanelOpen;
    this.showLabel("battle-feedback", showBattleFeedback);
    if (showBattleFeedback) {
      this.setLabelPosition("battle-feedback", this.battleFeedbackX, this.battleFeedbackY - (1 - this.battleFeedbackTime / 0.85) * 12);
      this.setLabel("battle-feedback", this.battleFeedbackText);
    }
    const overlay = !this.gmPanelOpen && (this.paused || this.screen !== "playing");
    ["overlayTitle", "overlayStats", "overlayPrimary", "overlayNote", "overlaySecondary"].forEach((key) => this.showLabel(key, overlay));
    this.syncGmLabels();
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

  private syncGmLabels(): void {
    if (!DEBUG) return;
    this.showLabel("gm-entry", true);
    const keys = ["gm-title", "gm-note", "gm-close", "gm-current", "gm-progress"];
    keys.forEach((key) => this.showLabel(key, this.gmPanelOpen));
    this.setLabel("gm-current", `当前：第 ${this.currentLevelId} 关${this.gmSessionActive ? "（GM 测试）" : "（正式进度）"}`);
    GM_LEVEL_BUTTONS.forEach((item) => {
      const key = `gm-level-${item.levelId}`;
      this.showLabel(key, this.gmPanelOpen);
      this.setLabel(key, `第 ${item.levelId} 关${item.levelId === this.currentLevelId ? "  当前" : ""}`);
      this.setLabelColor(key, item.levelId === this.currentLevelId ? "#6f472f" : "#17352e");
    });
  }

  private propButtonText(kind: PropKind): string {
    const shortName = kind === "freeze" ? "冷气" : kind === "clear" ? "清场" : "零钱";
    if (this.propCounts[kind] > 0) return `${shortName}\n×${this.propCounts[kind]}`;
    return this.propAdUsed[kind] ? `${shortName}\n用完` : `${shortName}\n广告`;
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
    this.selectedTower = null; this.selectedSpot = null; this.selectedObstacle = null; this.queue = []; this.spawnTimer = 0;
    this.spawnInterval = 0.78; this.nextWaveTimer = 4.2; this.frozenTime = 0; this.adRequesting = false;
    this.propCounts = { freeze: 1, clear: 1, cash: 1 }; this.propAdUsed = { freeze: false, clear: false, cash: false };
    this.enemies = []; this.towers = []; this.shots = []; this.particles = []; this.obstacles = [];
    this.spots = this.level.towerSpots.map(([x, y]) => ({ x, y, tower: null, obstacle: null }));
    for (const config of this.level.obstacles ?? []) {
      const spot = this.spots[config.spotIndex];
      if (!spot) continue;
      const obstacle: Obstacle = {
        x: spot.x, y: spot.y, kind: config.kind, hp: config.hp, maxHp: config.hp,
        reward: config.reward, radius: 15, hitFlash: 0, spot,
      };
      spot.obstacle = obstacle; this.obstacles.push(obstacle);
    }
    this.pathLength = this.computePathLength();
    this.drawStaticMap();
    this.toastText = this.level.id <= 3 ? "点空地建造；空闲时点货箱清理" : `第 ${this.level.id} 关：${this.level.title}`; this.toastTime = 4;
    this.defeated = 0; this.earned = 0;
    this.damageFlash = 0; this.battleFeedbackTime = 0; this.battleFeedbackText = "";
  }

  private updateGame(dt: number): void {
    this.toastTime = Math.max(0, this.toastTime - dt);
    this.frozenTime = Math.max(0, this.frozenTime - dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt);
    this.battleFeedbackTime = Math.max(0, this.battleFeedbackTime - dt);
    this.towers.forEach((tower) => { tower.recoil = Math.max(0, tower.recoil - dt); });
    this.obstacles.forEach((obstacle) => { obstacle.hitFlash = Math.max(0, obstacle.hitFlash - dt); });
    // 教学或波次奖励横幅结束后才开始倒计时，确保玩家能完整看到 4、3、2、1 的来袭预告。
    if (!this.inWave && this.enemies.length === 0 && this.wave < this.level.waves.length) {
      if (this.toastTime <= 0) this.nextWaveTimer -= dt;
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
      enemy.age += dt; enemy.slow = Math.max(0, enemy.slow - dt); enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      enemy.distance += enemy.speed * (this.frozenTime > 0 ? 0 : enemy.slow > 0 ? 0.57 : 1) * dt;
      const pos = this.pathPosition(enemy.distance); enemy.x = pos.x; enemy.y = pos.y;
      if (pos.done || enemy.distance >= this.pathLength) {
        this.lives -= enemy.damage; this.damageFlash = 0.28; this.audio.play("leak", 0.62);
        this.showBattleFeedback(`便利店耐久 -${enemy.damage}`, W - 78, 92);
        this.burst(enemy.x, enemy.y, "#eb685d", 14); this.enemies.splice(i, 1);
        if (this.lives <= 0) {
          this.lives = 0; this.screen = "lose";
          this.audio.play("lose", 0.82);
          PlatformService.setNumber("night_store_best_level", Math.max(this.level.id, PlatformService.getNumber("night_store_best_level", 0)));
          return;
        }
      }
    }

    // 店员优先处理范围内最靠近终点的敌人；只有没有敌人威胁时才清理玩家指定的障碍物。
    for (const tower of this.towers) {
      tower.cooldown -= dt;
      const cfg = TOWER_CONFIG[tower.kind];
      const range = cfg.range * (1 + (tower.level - 1) * 0.08);
      const enemyTarget = this.enemies.filter((enemy) => Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= range).sort((a, b) => b.distance - a.distance)[0];
      const obstacleTarget = this.selectedObstacle && this.obstacles.includes(this.selectedObstacle)
        && Math.hypot(this.selectedObstacle.x - tower.x, this.selectedObstacle.y - tower.y) <= range ? this.selectedObstacle : null;
      const target: AttackTarget | null = enemyTarget ?? obstacleTarget;
      if (!target) continue;
      tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
      if (tower.cooldown <= 0) {
        this.shots.push({ x: tower.x, y: tower.y, target, kind: tower.kind, level: tower.level, speed: tower.kind === "bloom" ? 150 : 230 });
        tower.recoil = 0.11;
        this.audio.play(tower.kind, tower.kind === "bloom" ? 0.24 : 0.18);
        // 升级同时提高伤害和少量攻速，但总效率不会压过新建店员，保留布阵选择。
        tower.cooldown = cfg.rate / (1 + (tower.level - 1) * 0.12);
      }
    }

    for (let i = this.shots.length - 1; i >= 0; i -= 1) {
      const shot = this.shots[i];
      if (!this.targetExists(shot.target)) { this.shots.splice(i, 1); continue; }
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
        this.audio.play("win", 0.8);
        // GM 选关用于隔离测试，通关不能污染玩家的正式解锁进度。
        if (!this.gmSessionActive) PlatformService.setNumber("night_store_unlocked_level", Math.min(GAME_CONFIG.maxLevels, Math.max(this.currentLevelId + 1, PlatformService.getNumber("night_store_unlocked_level", 1))));
      } else {
        // 先展示波次奖励，再留出完整的 3、2、1 预告，避免下一波突然出现。
        this.nextWaveTimer = 4.8;
        this.showToast(`守住了！夜班收入 +${bonus}`);
      }
    }
  }

  private startWave(): void {
    if (this.inWave || this.wave >= this.level.waves.length) return;
    const config = this.level.waves[this.wave]; this.wave += 1;
    this.queue = [...config.enemies]; this.spawnInterval = config.spawnInterval;
    this.spawnTimer = 0; this.inWave = true; this.showToast(config.announcement ?? `第 ${this.wave} 波来袭！`);
    this.audio.play("wave", 0.58);
  }

  private spawnEnemy(kind: EnemyKind): void {
    const base = ENEMY_CONFIG[kind];
    const hp = Math.round(base.hp * this.level.enemyHealthScale * (1 + (this.wave - 1) * 0.08));
    const start = this.level.pathPoints[0];
    this.enemies.push({ kind, hp, maxHp: hp, speed: base.speed * this.level.enemySpeedScale, reward: base.reward, radius: base.radius, color: base.color, damage: base.damage, distance: 0, x: start[0], y: start[1], age: 0, slow: 0, hitFlash: 0 });
  }

  private hit(shot: Shot, target: AttackTarget): void {
    const cfg = TOWER_CONFIG[shot.kind]; const damage = cfg.damage * (1 + (shot.level - 1) * 0.52);
    if (!this.isEnemy(target)) {
      target.hp -= damage; target.hitFlash = 0.12;
      this.burst(target.x, target.y, cfg.shotColor, shot.kind === "bloom" ? 10 : 5);
      if (target.hp <= 0) this.clearObstacle(target);
      return;
    }
    if (cfg.splash) {
      for (const enemy of this.enemies) if (Math.hypot(enemy.x - target.x, enemy.y - target.y) <= cfg.splash) {
        enemy.hp -= damage; enemy.hitFlash = 0.12;
      }
      this.burst(target.x, target.y, cfg.shotColor, 12);
    } else {
      target.hp -= damage; target.hitFlash = 0.12; if (cfg.slow) target.slow = 1.35 + shot.level * 0.2;
      this.burst(target.x, target.y, cfg.shotColor, 4);
    }
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i]; if (enemy.hp > 0) continue;
      this.defeatEnemyAt(i);
    }
  }

  private isEnemy(target: AttackTarget): target is Enemy {
    return "distance" in target;
  }

  private targetExists(target: AttackTarget): boolean {
    return this.isEnemy(target) ? this.enemies.includes(target) : this.obstacles.includes(target);
  }

  private clearObstacle(obstacle: Obstacle): void {
    const index = this.obstacles.indexOf(obstacle);
    if (index < 0) return;
    obstacle.spot.obstacle = null; this.obstacles.splice(index, 1);
    this.coins += obstacle.reward; this.earned += obstacle.reward;
    this.audio.play("defeat", 0.2); this.burst(obstacle.x, obstacle.y, "#ffc34d", 16);
    this.showBattleFeedback(`清出空地 +${obstacle.reward}`, obstacle.x, obstacle.y - 24);
    if (this.selectedObstacle === obstacle) {
      this.selectedObstacle = null; this.selectedSpot = obstacle.spot;
    }
  }

  private defeatEnemyAt(index: number): void {
    const enemy = this.enemies[index]; if (!enemy) return;
    this.coins += enemy.reward; this.earned += enemy.reward; this.defeated += 1;
    this.audio.play("defeat", 0.26);
    this.burst(enemy.x, enemy.y, "#ffc34d", 14); this.enemies.splice(index, 1);
  }

  private buildTower(spot: Spot, kind: TowerKind): void {
    if (!this.level.availableTowers.includes(kind)) { this.showToast("这名店员还没有加入夜班"); return; }
    const cfg = TOWER_CONFIG[kind];
    if (this.coins < cfg.cost) { this.showToast("夜班零钱不够，先赶走一些精怪吧"); return; }
    this.coins -= cfg.cost;
    const tower: Tower = { x: spot.x, y: spot.y, kind, level: 1, cooldown: 0, angle: 0, spent: cfg.cost, spot, recoil: 0 };
    spot.tower = tower; this.towers.push(tower); this.burst(spot.x, spot.y, cfg.color, 12);
    this.audio.play("build", 0.64); this.showBattleFeedback(`${cfg.name}上岗！`, spot.x, spot.y - 28);
    this.selectedTower = tower; this.selectedSpot = spot; this.selectedObstacle = null;
  }

  private upgradeSelected(): void {
    const tower = this.selectedTower; if (!tower) { this.showToast("先点击一名场上店员"); return; }
    if (tower.level >= 3) { this.showToast(`${TOWER_CONFIG[tower.kind].name}已经满级`); return; }
    const cost = this.upgradeCost(tower); if (this.coins < cost) { this.showToast("升级所需零钱不足"); return; }
    this.coins -= cost; tower.spent += cost; tower.level += 1; this.burst(tower.x, tower.y, "#ffc34d", 18);
    this.audio.play("upgrade", 0.68); this.showBattleFeedback(`${TOWER_CONFIG[tower.kind].name} Lv.${tower.level}`, tower.x, tower.y - 28);
  }

  private upgradeCost(tower: Tower): number {
    // 二级为基础造价的 75%，三级为 100%；首关第一波收入刚好能支持一次升级。
    return Math.round(TOWER_CONFIG[tower.kind].cost * (0.5 + tower.level * 0.25));
  }

  private sellRefund(tower: Tower): number {
    // 出售返还 65% 累计投入，允许转移火力但避免无损反复搬塔成为固定最优解。
    return Math.floor(tower.spent * 0.65);
  }

  private sellSelected(): void {
    const tower = this.selectedTower; if (!tower) return;
    const refund = this.sellRefund(tower);
    tower.spot.tower = null; this.towers = this.towers.filter((item) => item !== tower);
    this.coins += refund; this.audio.play("upgrade", 0.45);
    this.burst(tower.x, tower.y, "#ffc34d", 12); this.showBattleFeedback(`调岗返还 +${refund}`, tower.x, tower.y - 24);
    this.selectedTower = null; this.selectedSpot = tower.spot;
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
    this.audio.play("prop", 0.62);
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
    if (DEBUG && x >= GM_BUTTON.x && x <= GM_BUTTON.x + GM_BUTTON.width && y >= GM_BUTTON.y && y <= GM_BUTTON.y + GM_BUTTON.height) {
      this.gmPanelOpen = !this.gmPanelOpen; return;
    }
    if (DEBUG && this.gmPanelOpen) {
      if (x >= 298 && x <= 342 && y >= 134 && y <= 162) { this.gmPanelOpen = false; return; }
      if (x >= GM_PROGRESS_BUTTON.x && x <= GM_PROGRESS_BUTTON.x + GM_PROGRESS_BUTTON.width
        && y >= GM_PROGRESS_BUTTON.y && y <= GM_PROGRESS_BUTTON.y + GM_PROGRESS_BUTTON.height) {
        this.gmSessionActive = false; this.gmPanelOpen = false;
        const officialLevel = Math.max(1, Math.min(GAME_CONFIG.maxLevels, PlatformService.getNumber("night_store_unlocked_level", 1)));
        this.resetLevel(officialLevel); return;
      }
      const levelButton = GM_LEVEL_BUTTONS.find((item) => x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height);
      if (levelButton) {
        this.gmSessionActive = true; this.gmPanelOpen = false; this.resetLevel(levelButton.levelId); return;
      }
      // 面板外点击仅关闭 GM，不把同一次点击传递给战斗，防止误建造或误用道具。
      if (x < 35 || x > 355 || y < 112 || y > 586) this.gmPanelOpen = false;
      return;
    }
    if (this.screen === "playing" && y < 70) {
      if (x >= 354) { this.paused = !this.paused; return; }
      if (x >= 320) { this.cycleGameSpeed(); return; }
    }
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

    // 先处理塔位旁的上下文按钮，避免点到按钮时被下方建造单元再次选中。
    if (this.selectedTower) {
      const item = this.towerMenuItems(this.selectedTower).find((candidate) => Math.abs(candidate.x - x) <= 41 && Math.abs(candidate.y - y) <= 18);
      if (item) {
        if (item.action === "upgrade") this.upgradeSelected(); else this.sellSelected();
        return;
      }
    } else if (this.selectedSpot && !this.selectedSpot.tower && !this.selectedSpot.obstacle) {
      const buildItem = this.buildMenuItems().find((item) => Math.hypot(item.x - x, item.y - y) <= 29);
      if (buildItem) { this.buildTower(this.selectedSpot, buildItem.kind); return; }
    }

    if (y >= PANEL_Y) {
      const button = PROP_BUTTONS.find((item) => x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height);
      if (button) this.useProp(button.kind);
      return;
    }

    const spot = this.spots.find((item) => Math.hypot(item.x - x, item.y - y) <= 23);
    if (spot) {
      this.selectedSpot = spot; this.selectedTower = spot.tower; this.selectedObstacle = spot.obstacle;
      // 玩家已经主动操作时收起教学提示，给塔位菜单让出完整可视空间。
      this.toastTime = 0;
      return;
    }
    this.selectedTower = null; this.selectedSpot = null; this.selectedObstacle = null;
  }

  private cycleGameSpeed(): void {
    const currentIndex = GAME_SPEEDS.indexOf(this.gameSpeed);
    this.gameSpeed = GAME_SPEEDS[(currentIndex + 1) % GAME_SPEEDS.length];
    // 倍速属于玩家的正式偏好设置，切关、重开、复活和下次启动都沿用当前选择。
    PlatformService.setNumber("night_store_game_speed", this.gameSpeed);
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
    this.inWave = false; this.wave = Math.max(0, this.wave - 1); this.nextWaveTimer = 5.3;
    this.showToast(result.rewarded ? "继续营业！当前波次即将重来" : "暂无广告，测试环境已直接继续");
  }

  private showToast(value: string): void { this.toastText = value; this.toastTime = 2.3; }

  private showBattleFeedback(value: string, x: number, y: number): void {
    // 浮字宽 150，中心点至少离左右边缘 75，避免边缘塔位的建造、出售反馈被裁切。
    this.battleFeedbackText = value; this.battleFeedbackX = Math.max(75, Math.min(W - 75, x));
    this.battleFeedbackY = Math.max(90, Math.min(PANEL_Y - 18, y)); this.battleFeedbackTime = 0.85;
  }

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
