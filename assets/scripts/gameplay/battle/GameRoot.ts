import {
  _decorator, Color, Component, EventTouch, Graphics, HorizontalTextAlignment,
  Label, Layers, Mask, Node, ResolutionPolicy, UITransform, Vec3,
  VerticalTextAlignment, view, sys, profiler, screen as deviceScreen,
} from "cc";
import { DEBUG } from "cc/env";
import { ENEMY_CONFIG, GAME_CONFIG, TOWER_CONFIG, EnemyKind, TowerKind } from "./GameConfig";
import { getLevelConfig, LevelConfig, ObstacleKind } from "./LevelConfig";
import { PlatformService } from "../../services/PlatformService";
import { AudioService } from "../../services/AudioService";
import { BattleArtView } from "./BattleArtView";
import { BattleUiView } from "./BattleUiView";
import { BattleMapView } from "./BattleMapView";
import { BattleSceneryView } from "./BattleSceneryView";
import { installMapStyleCapture, MapStyleReviewConfig, readMapStyleReview } from "../../debug/MapStyleReview";
import { BATTLE_UI, computeBattleLayout, containsPoint, HitRect } from "./BattleLayout";

const { ccclass } = _decorator;
// 运行时使用 390 宽的轻量逻辑坐标，逻辑高度与 750×1334 保持完全相同的宽高比。
// 横纵采用同一缩放比例，避免圆形、字号和触控区域在正式设计分辨率下发生轻微变形。
const DESIGN_W = GAME_CONFIG.designWidth;
const DESIGN_H = GAME_CONFIG.designHeight;
const W = GAME_CONFIG.prototypeLayoutWidth;
const H = GAME_CONFIG.prototypeLayoutHeight;
// 全局道具缩成右下角三个紧凑按钮，把主要可视面积还给塔防棋盘。
const PANEL_Y = 618;
const KINDS: TowerKind[] = ["sprout", "frost", "bloom"];
type GameSpeed = 1 | 2 | 3;
// 正式局内倍速档位按固定顺序循环，避免出现不受数值验证覆盖的任意倍率。
const GAME_SPEEDS: readonly GameSpeed[] = [1, 2, 3];
type PropKind = "freeze" | "clear" | "cash";
const PROP_BUTTONS = [
  { kind: "freeze" as const, x: 92, y: H - 76, width: 88, height: 64 },
  { kind: "clear" as const, x: 188, y: H - 76, width: 88, height: 64 },
  { kind: "cash" as const, x: 284, y: H - 76, width: 88, height: 64 },
];
const HOME_CONTINUE_BUTTON = { x: 55, y: 225, width: 280, height: 56 };
const HOME_LEVEL_BUTTONS = Array.from({ length: GAME_CONFIG.maxLevels }, (_, index) => ({
  levelId: index + 1,
  x: 55 + (index % 2) * 152,
  y: 335 + Math.floor(index / 2) * 58,
  width: 128,
  height: 48,
}));
// GM 入口只由 Cocos 的调试编译常量控制，正式抖音构建会直接隐藏整套测试界面。
const GM_BUTTON = { x: 12, y: H - 60, width: 50, height: 48 };
const GM_PROGRESS_BUTTON = { x: 115, y: 534, width: 160, height: 48 };
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
  private mapView!: BattleMapView;
  private scenery!: BattleSceneryView;
  private unitBaseG!: Graphics;
  private dynamicG!: Graphics;
  private art!: BattleArtView;
  private uiArt!: BattleUiView;
  private layoutTop = 0;
  private layoutBottom = H;
  private hitSize = BATTLE_UI.minimumHit;
  private touchStart: { x: number; y: number } | null = null;
  private touchId: number | null = null;
  private touchTravelCancelled = false;
  private appliedResolutionPolicy: number | null = null;
  private disposed = false;
  private mapReview: MapStyleReviewConfig | null = null;
  private releaseMapReviewCapture: (() => void) | null = null;
  private audio!: AudioService;
  private labels = new Map<string, Label>();
  private labelSizes = new Map<string, number>();
  private currentLevelId = 1;
  private unlockedLevel = 1;
  private level: LevelConfig = getLevelConfig(1);
  private coins = 0;
  private lives = 0;
  private wave: number = 0;
  private inWave = false;
  private paused = false;
  private gameSpeed: GameSpeed = 1;
  private screen: "home" | "playing" | "win" | "lose" = "home";
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
  private readonly hideHandler = (): void => { this.paused = true; this.onTouchCancel(); };
  private readonly resizeHandler = (): void => { this.configureResolution(); this.applyLayout(); this.scheduleOnce(() => this.applyLayout(), 0); };

  onLoad(): void {
    this.mapReview = readMapStyleReview();
    this.configureResolution();
    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    transform.setContentSize(DESIGN_W, DESIGN_H);
    this.contentRoot = new Node("PrototypeContent");
    this.contentRoot.layer = Layers.Enum.UI_2D;
    this.contentRoot.addComponent(UITransform).setContentSize(W, H);
    // 宽窗口的黑边不能漏出射程圈、边缘特效或装饰；长屏时遮罩随安全高度一起延展。
    this.contentRoot.addComponent(Mask).type = Mask.Type.GRAPHICS_RECT;
    this.contentRoot.setScale(DESIGN_W / W, DESIGN_H / H, 1);
    this.node.addChild(this.contentRoot);
    this.staticG = this.createGraphics("StaticMap");
    this.mapView = new BattleMapView(this.staticG, W);
    this.scenery = new BattleSceneryView(this.contentRoot, W, H);
    this.unitBaseG = this.createGraphics("UnitUnderlay");
    // 三层分离：范围和地面在下、精灵居中、血条/投射物/操作菜单在上。
    this.art = new BattleArtView(this.contentRoot, W, H);
    this.dynamicG = this.createGraphics("DynamicGame");
    this.uiArt = new BattleUiView(this.contentRoot, W, H);
    this.audio = new AudioService(this.node);
    this.createLabels();
    const savedSpeed = this.mapReview ? 1 : PlatformService.getNumber("night_store_game_speed", 1);
    this.gameSpeed = savedSpeed === 2 || savedSpeed === 3 ? savedSpeed : 1;
    this.currentLevelId = this.mapReview?.levelId ?? this.readUnlockedLevel();
    this.resetLevel(this.currentLevelId);
    if (this.mapReview) this.setupMapReview();
    else { this.unlockedLevel = this.currentLevelId; this.screen = "home"; }
    this.applyLayout();
    void this.art.load();
    void this.uiArt.load();
    void this.scenery.load().then(() => { if (!this.disposed) this.drawStaticMap(); });
    if (this.mapReview) this.releaseMapReviewCapture = installMapStyleCapture(this.mapReview,
      () => this.art.ready && this.uiArt.ready && this.scenery.ready);
    view.on("canvas-resize", this.resizeHandler, this);
    view.on("design-resolution-changed", this.resizeHandler, this);
    this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
    this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    PlatformService.onHide(this.hideHandler);
    // 体验版默认不让性能统计遮住左下GM与道具；Creator的Show FPS仍可按需手动打开。
    if (DEBUG) profiler.hideStats();
  }

  onDestroy(): void {
    this.disposed = true;
    this.releaseMapReviewCapture?.();
    view.off("canvas-resize", this.resizeHandler, this);
    view.off("design-resolution-changed", this.resizeHandler, this);
    this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
    this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    PlatformService.offHide(this.hideHandler);
    this.audio.destroy();
    this.art.destroy();
    this.uiArt.destroy();
    this.scenery.destroy();
  }

  private applyLayout(): void {
    const visible = view.getVisibleSize();
    const safe = sys.getSafeAreaRect(false);
    const layout = computeBattleLayout(visible.width, visible.height, safe, PlatformService.getTopOverlayInset(visible.width));
    this.node.getComponent(UITransform)!.setContentSize(visible.width, visible.height);
    this.contentRoot.setScale(layout.scale, layout.scale, 1);
    this.contentRoot.setPosition(layout.centerX, layout.centerY, 0);
    this.contentRoot.getComponent(UITransform)!.setContentSize(W, layout.bottom - layout.top);
    this.layoutTop = layout.top; this.layoutBottom = layout.bottom;
    // 紧凑安全区宁可缩小格位热区，也不让相邻50间距的格位互相抢点击；常规750宽时为88设计像素。
    this.hitSize = Math.min(BATTLE_UI.minimumHit, layout.hitSize);
    for (const [key, label] of this.labels) {
      label.fontSize = Math.max(this.labelSizes.get(key) ?? 13, 24 / layout.scale);
      label.lineHeight = label.fontSize + 4;
    }
    this.drawStaticMap();
    // 顶栏贴安全区顶部，道具贴安全区底部；地图保持等比居中，不拉长道路。
    const headerLabels: Array<[string, number, number]> = [
      ["title", 85, 24], ["level", 43, 51], ["wave", 109, 51],
      ["coin", 189, 36], ["lives", 247, 36], ["speed", 293, 36], ["pause", 353, 36],
    ];
    headerLabels.forEach(([key, x, y]) => this.setLabelPosition(key, x, y + this.layoutTop));
    PROP_BUTTONS.forEach((button) => this.setLabelPosition(`prop-${button.kind}`, button.x + button.width / 2, this.layoutBottom - 23));
    if (DEBUG) this.setLabelPosition("gm-entry", 37, this.layoutBottom - 36);
  }

  private configureResolution(): void {
    // 只取宽高比，物理像素与CSS像素的DPR会相互抵消；使用3.8.8推荐接口避免弃用警告。
    const frame = deviceScreen.windowSize;
    // 手机长屏固定宽度；桌面宽窗口完整容纳竖屏，不把狭短窗口挤成热区互相覆盖的横屏游戏。
    const policy = frame.width / Math.max(1, frame.height) > DESIGN_W / DESIGN_H + 0.01
      ? ResolutionPolicy.SHOW_ALL : ResolutionPolicy.FIXED_WIDTH;
    if (policy === this.appliedResolutionPolicy) return;
    // 先记录再设置，避免design-resolution-changed同步回调形成递归。
    this.appliedResolutionPolicy = policy;
    view.setDesignResolutionSize(DESIGN_W, DESIGN_H, policy);
  }

  private footerRect(rect: HitRect): HitRect { return { ...rect, y: rect.y + this.layoutBottom - H }; }
  private headerRect(rect: HitRect): HitRect { return { ...rect, y: rect.y + this.layoutTop }; }

  private buttonHit(rect: HitRect, x: number, y: number): boolean {
    // 按钮允许透明热区大于底板；按钮之间预留空隙，安全区压缩时也保持88设计像素的点击范围。
    const minimum = 88 / this.contentRoot.scale.x;
    const width = Math.max(rect.width, minimum); const height = Math.max(rect.height, minimum);
    const headerButton = rect.y >= this.layoutTop && rect.y + rect.height <= this.layoutTop + 60;
    // 顶栏只向上扩热区；即使未来收紧地图顶部留白，也不能向下抢走棋盘点击。
    const top = headerButton ? rect.y + rect.height - height : rect.y - (height - rect.height) / 2;
    return containsPoint({ x: rect.x - (width - rect.width) / 2, y: top, width, height }, x, y);
  }

  update(dt: number): void {
    // 美术评审只冻结实例状态并使用真实渲染链；不调用战斗推进、广告或存档。
    if (this.mapReview) { this.paused = false; this.render(); return; }
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
    this.makeLabel("home-title", GAME_CONFIG.gameName, 28, 195, 161, 310, 44, "#244d42");
    this.makeLabel("home-subtitle", "守住便利店，今晚也准时打烊", 14, 195, 194, 280, 28, "#6f795b");
    this.makeLabel("home-continue", "", 18, 195, 253, 280, 56, "#fff9df");
    this.makeLabel("home-progress", "", 15, 195, 307, 280, 28, "#32724c");
    this.makeLabel("home-note", "通关后解锁下一关", 13, 195, 654, 250, 28, "#fff2cd");
    HOME_LEVEL_BUTTONS.forEach((item) => this.makeLabel(
      `home-level-${item.levelId}`, "", 14, item.x + item.width / 2, item.y + item.height / 2, item.width, item.height, "#244d42",
    ));
    this.makeLabel("title", GAME_CONFIG.gameName, 15, 85, 24, 106, 28, "#fff2cd");
    this.makeLabel("level", "", 13, 43, 51, 64, 24, "#f9e7b7");
    this.makeLabel("wave", "", 13, 109, 51, 62, 24, "#e0ecd1");
    this.makeLabel("entry-mark", "地铁口", 13, 0, 0, 48, 22, "#fff4d1");
    this.makeLabel("goal-mark", "便利店", 13, 0, 0, 60, 22, "#fff4d1");
    this.makeLabel("coin", "", 17, 189, 36, 44, 38, "#4b422e");
    this.makeLabel("lives", "", 17, 247, 36, 24, 38, "#4b422e");
    this.makeLabel("speed", "×1", 17, 293, 36, 50, 40, "#fff9df");
    this.makeLabel("pause", "Ⅱ", 21, 353, 36, 50, 40, "#4b422e");
    KINDS.forEach((kind) => {
      this.makeLabel(`build-${kind}`, TOWER_CONFIG[kind].name, 16, 0, 0, 58, 24, "#17352e");
      this.makeLabel(`build-cost-${kind}`, `●${TOWER_CONFIG[kind].cost}`, 13, 0, 0, 58, 20, "#8c6a24");
    });
    this.makeLabel("context-upgrade", "", 16, 0, 0, 96, 46, "#fff9df");
    this.makeLabel("context-sell", "", 16, 0, 0, 96, 46, "#fff9df");
    this.makeLabel("obstacle-info", "", 13, 0, 0, 164, 30, "#fff9df");
    PROP_BUTTONS.forEach((button) => this.makeLabel(`prop-${button.kind}`, "", 13, button.x + button.width / 2, button.y + 53, button.width - 8, 22, "#4b422e"));
    this.makeLabel("toast", "", 12, 195, 101, 290, 30, "#fff9df");
    this.makeLabel("next-wave-title", "", 13, 0, 0, 82, 22, "#32724c");
    this.makeLabel("next-wave-number", "", 24, 0, 0, 58, 32, "#17352e");
    this.makeLabel("battle-feedback", "", 12, 0, 0, 150, 26, "#17352e");
    this.makeLabel("overlayTitle", "", 27, 195, 284, 286, 45, "#17352e");
    this.makeLabel("overlayStats", "", 14, 195, 340, 270, 58, "#32724c");
    this.makeLabel("overlayPrimary", "", 17, 195, 412, 246, 48, "#fff9df");
    this.makeLabel("overlayNote", "", 11, 195, 454, 270, 24, "#71877d");
    this.makeLabel("overlaySecondary", "", 17, 195, 498, 246, 48, "#fff9df");
    this.makeLabel("overlayHome", "返回首页", 16, 195, 488, 246, 48, "#4b624c");
    if (DEBUG) {
      this.makeLabel("gm-entry", "GM", 16, 37, H - 36, 50, 48, "#fff9df");
      this.makeLabel("gm-title", "GM 关卡选择", 21, 195, 148, 220, 34, "#17352e");
      this.makeLabel("gm-note", "测试选关，不改变正式解锁", 13, 195, 183, 280, 24, "#71877d");
      this.makeLabel("gm-close", "关闭", 15, 317, 148, 50, 48, "#fff9df");
      this.makeLabel("gm-current", "", 11, 195, 516, 250, 26, "#32724c");
      this.makeLabel("gm-progress", "返回正式进度", 16, 195, 558, 160, 48, "#fff9df");
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
    // 390逻辑单位的13号字约等于25设计像素，统一守住辅助文字24像素下限。
    label.string = value; label.fontSize = Math.max(13, size); label.lineHeight = Math.max(13, size) + 4; label.color = this.color(hex);
    label.horizontalAlign = align; label.verticalAlign = VerticalTextAlignment.CENTER;
    this.labels.set(key, label);
    this.labelSizes.set(key, Math.max(13, size));
    return label;
  }

  private color(hex: string, alpha = 255): Color {
    const value = new Color();
    Color.fromHEX(value, hex);
    value.a = alpha;
    return value;
  }

  private drawStaticMap(): void {
    const decorations = this.mapView.draw(this.level, this.layoutTop, this.layoutBottom, this.scenery.ready);
    const start = this.level.pathPoints[0]; const end = this.level.pathPoints[this.level.pathPoints.length - 1];
    this.scenery.setScene(start, end, decorations);
    this.setLabelPosition("entry-mark", start[0], start[1] - 29);
    this.setLabelPosition("goal-mark", end[0], end[1] - 29);
  }

  private render(): void {
    const g = this.dynamicG;
    g.clear();
    this.unitBaseG.clear();
    this.art.beginFrame();
    this.uiArt.beginFrame();
    if (this.screen === "home") {
      // 首页不提交战场精灵与操作图标；回收上一局对象后，用不透明底色盖住静态地图。
      this.art.endFrame();
      this.drawHome(g);
      this.drawGmPanel(g);
      this.uiArt.endFrame();
      this.syncHomeLabels();
      return;
    }
    this.drawSpots(this.unitBaseG);
    this.drawLandmarkStatus(g);
    this.enemies.forEach((enemy) => this.drawEnemy(g, enemy));
    this.art.endFrame();
    this.shots.forEach((shot) => this.disc(g, shot.x, shot.y, shot.kind === "bloom" ? 5 : 3.5, TOWER_CONFIG[shot.kind].shotColor));
    this.particles.forEach((p) => this.disc(g, p.x, p.y, p.size, p.color, Math.max(0, p.life / p.maxLife)));
    if (this.frozenTime > 0) this.box(g, 0, 72, W, PANEL_Y - 72, 0, "#b8f2ff", 0.14);
    if (this.damageFlash > 0) this.box(g, 0, 72, W, PANEL_Y - 72, 0, "#eb685d", Math.min(0.2, this.damageFlash * 0.7));
    this.drawContextMenu(g);
    this.drawPanels(g);
    this.drawWaveCountdown(g);
    if (this.paused || this.screen !== "playing") this.drawOverlay(g);
    this.drawGmPanel(g);
    this.uiArt.endFrame();
    this.syncLabels();
  }

  private drawSpots(g: Graphics): void {
    for (const spot of this.spots) {
      if (spot.obstacle) {
        // 成组地台已由静态层按真实格位绘制；清除障碍后露出同一格，不再叠22个椭圆石圈。
        this.drawSpotMarker(g, spot, false, true);
        this.drawObstacle(g, spot.obstacle);
      } else if (!spot.tower) {
        this.drawSpotMarker(g, spot, this.selectedSpot === spot, false);
      } else this.drawTower(g, spot.tower);
    }
  }

  private drawSpotMarker(g: Graphics, spot: Spot, selected: boolean, blocked: boolean): void {
    if (selected) {
      this.box(g, spot.x - 22, spot.y - 18, 44, 35, 10, "#fff0b4", 0.85);
      g.strokeColor = this.color("#d99b39"); g.lineWidth = 2;
      g.roundRect(spot.x - 22, spot.y - 18, 44, 35, 10); g.stroke();
    }
    if (!blocked) {
      // 加号只是视觉提示；所有格位保留独立46×46热区，不以装饰或角色PNG判定点击。
      this.box(g, spot.x - 5, spot.y - 2, 10, 3, 1.5, "#6b8c63", 0.7);
      this.box(g, spot.x - 1.5, spot.y - 5.5, 3, 10, 1.5, "#6b8c63", 0.7);
    }
  }

  private drawLandmarkStatus(g: Graphics): void {
    if (this.gmPanelOpen || this.paused || this.screen !== "playing" || this.selectedSpot) return;
    const start = this.level.pathPoints[0]; const end = this.level.pathPoints[this.level.pathPoints.length - 1];
    this.box(g, start[0] - 25, start[1] - 39, 50, 20, 8, "#294f43", 0.94);
    this.box(g, end[0] - 31, end[1] - 39, 62, 20, 8, "#765436", 0.94);
    this.box(g, end[0] - 24, end[1] + 29, 48, 5, 2.5, "#294f43");
    this.box(g, end[0] - 23, end[1] + 30, 46 * Math.max(0, this.lives / this.level.initialLives), 3, 1.5, this.lives > 2 ? "#98cd73" : "#ee7866");
  }

  private drawObstacle(g: Graphics, obstacle: Obstacle): void {
    const selected = obstacle === this.selectedObstacle;
    if (selected) {
      this.disc(g, obstacle.x, obstacle.y, obstacle.radius + 7, "#fff3c2", 0.45);
      this.ring(g, obstacle.x, obstacle.y, obstacle.radius + 7, "#e6a83e", 0.95, 3);
    }
    if (this.art.ready) this.art.drawObstacle(obstacle, obstacle);
    else if (obstacle.kind === "crate") {
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
      this.box(this.dynamicG, obstacle.x - 16, obstacle.y - 30, 32, 4, 2, "#17352e", 0.45);
      this.box(this.dynamicG, obstacle.x - 16, obstacle.y - 30, 32 * ratio, 4, 2, "#ffc34d");
    }
  }

  private drawTower(g: Graphics, tower: Tower): void {
    const cfg = TOWER_CONFIG[tower.kind];
    if (tower === this.selectedTower) {
      this.disc(g, tower.x, tower.y, cfg.range * (1 + (tower.level - 1) * 0.08), "#57a96a", 0.08);
      this.ring(g, tower.x, tower.y, cfg.range * (1 + (tower.level - 1) * 0.08), "#32724c", 0.35, 1);
    }
    if (this.art.ready) {
      this.art.drawTower(tower, tower);
      for (let i = 0; i < tower.level; i += 1) this.disc(this.dynamicG, tower.x + (i - (tower.level - 1) / 2) * 6, tower.y + 16, 2, "#ffbc45");
      if (tower.recoil > 0) this.disc(this.dynamicG, tower.x + (Math.cos(tower.angle) < 0 ? -12 : 12), tower.y - 5, 3, cfg.shotColor);
      return;
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
    if (this.art.ready) this.art.drawEnemy(enemy, enemy);
    else {
    this.disc(g, enemy.x, enemy.y + 4 + wobble, enemy.radius, enemy.color);
    this.ring(g, enemy.x, enemy.y + 4 + wobble, enemy.radius, "#17352e", 0.45, 2);
    this.disc(g, enemy.x - 5, enemy.y + wobble, 2.2, "#fff9df"); this.disc(g, enemy.x + 5, enemy.y + wobble, 2.2, "#fff9df");
    this.disc(g, enemy.x - 5, enemy.y + wobble, 1.1, "#17352e"); this.disc(g, enemy.x + 5, enemy.y + wobble, 1.1, "#17352e");
    if (enemy.hitFlash > 0) this.disc(g, enemy.x, enemy.y + 4 + wobble, enemy.radius + 2, "#fff9df", Math.min(0.82, enemy.hitFlash * 7));
    if (enemy.kind === "tank") this.box(g, enemy.x - 13, enemy.y - 14 + wobble, 26, 8, 4, "#8e7357");
    }
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    this.box(g, enemy.x - 15, enemy.y - enemy.radius - 12, 30, 5, 2.5, "#4b422e", 0.9);
    this.box(g, enemy.x - 14, enemy.y - enemy.radius - 11, 28 * ratio, 3, 1.5, ratio > 0.35 ? "#f59270" : "#ea635a");
    if (enemy.slow > 0) this.ring(g, enemy.x, enemy.y, enemy.radius + 3, "#b4f6ff", 0.7, 2);
  }

  private drawPanels(g: Graphics): void {
    g.fillColor = this.color("#244d42"); g.rect(0, this.layoutTop, W, BATTLE_UI.headerHeight); g.fill();
    this.box(g, 0, this.layoutTop + 3, W, 2, 0, "#537b5e");
    // 小雨棚纹样与终点便利店统一识别，不扩大顶栏占地。
    for (let i = 0; i < 15; i += 1) this.box(g, i * 26, this.layoutTop + 69, 26, 6, 2, i % 2 ? "#efd6a4" : "#d9945d");
    this.disc(g, 24, this.layoutTop + 24, 11, "#e6c785");
    g.fillColor = this.color("#456a4d"); g.ellipse(21, this.layoutTop + 21, 5, 3); g.fill();
    g.ellipse(27, this.layoutTop + 27, 5, 3); g.fill();
    this.box(g, 12, this.layoutTop + 40, 62, 23, 8, "#173b32");
    this.box(g, 79, this.layoutTop + 40, 60, 23, 8, "#355f4d");
    this.uiCard(g, 147, this.layoutTop + 12, 64, 48, "#fff5d6");
    this.uiCard(g, 216, this.layoutTop + 12, 46, 48, "#fff5d6");
    const speed = this.headerRect(BATTLE_UI.speed); const pause = this.headerRect(BATTLE_UI.pause);
    this.uiCard(g, speed.x, speed.y, speed.width, speed.height, "#ee9559");
    this.uiCard(g, pause.x, pause.y, pause.width, pause.height, "#fff5d6");
    if (!this.gmPanelOpen) {
      if (this.uiArt.ready) this.uiArt.drawIcon("hud-coin", "cash", 161, this.layoutTop + 36, 28);
      else { this.disc(g, 160, this.layoutTop + 36, 8, "#ffbf45"); this.ring(g, 160, this.layoutTop + 36, 6, "#bd792c", 1, 1.5); }
    }
    this.drawHeart(g, 228, this.layoutTop + 36);
    // 底部是一整块物资托盘，三道具等宽；左侧保留调试入口，发布版显示店铺纹章。
    this.box(g, 0, this.layoutBottom - 85, W, 85, 0, "#244d42");
    this.box(g, 7, this.layoutBottom - 82, W - 14, 85, 18, "#e7d4a8");
    this.box(g, 11, this.layoutBottom - 78, W - 22, 78, 15, "#f4e7c7");
    this.drawShopMark(g, 45, this.layoutBottom - 43);
    const colors = ["#a6d7de", "#efb894", "#ecd277"];
    PROP_BUTTONS.forEach((item, index) => {
      const button = this.footerRect(item);
      const exhausted = this.propCounts[item.kind] === 0 && this.propAdUsed[item.kind];
      this.uiCard(g, button.x, button.y, button.width, button.height, exhausted ? "#d1cfbd" : "#fff5d6", 13);
      this.box(g, button.x + 5, button.y + 5, button.width - 10, 38, 9, exhausted ? "#b6beb0" : colors[index]);
      if (this.screen === "playing" && !this.paused && !this.gmPanelOpen && this.uiArt.ready) {
        this.uiArt.drawIcon(`prop-${item.kind}`, item.kind, button.x + button.width / 2, button.y + 24, 45);
      }
    });
    if (this.toastTime > 0 && this.screen === "playing" && !this.paused) this.box(g, 43, 82, 304, 38, 16, "#17352e", 0.9);
  }

  private drawContextMenu(g: Graphics): void {
    if (this.paused || this.screen !== "playing" || this.gmPanelOpen) return;
    if (this.selectedSpot && !this.selectedSpot.tower && !this.selectedSpot.obstacle) {
      for (const item of this.buildMenuItems()) {
        const affordable = this.coins >= TOWER_CONFIG[item.kind].cost;
        this.uiCard(g, item.x - 32, item.y - 42, 64, 84, affordable ? "#fff5d6" : "#c6cec0", 16);
        this.disc(g, item.x, item.y - 19, 17, affordable ? "#dfebc8" : "#acb8a7");
        if (this.uiArt.ready) this.uiArt.drawIcon(`build-${item.kind}`, item.kind, item.x, item.y - 19, 40);
      }
      return;
    }
    if (this.selectedTower) {
      for (const item of this.towerMenuItems(this.selectedTower)) {
        const active = item.action === "sell" || (this.selectedTower.level < 3 && this.coins >= this.upgradeCost(this.selectedTower));
        this.uiCard(g, item.x - BATTLE_UI.contextWidth / 2, item.y - BATTLE_UI.contextHeight / 2, BATTLE_UI.contextWidth, BATTLE_UI.contextHeight, item.action === "sell" ? "#dd9764" : active ? "#78ad65" : "#879382", 13);
      }
    }
    if (this.selectedObstacle) {
      const position = this.obstacleInfoPosition();
      this.box(g, position.x - 86, position.y - 16, 172, 32, 10, "#244d42", 0.96);
    }
  }

  private obstacleInfoPosition(): { x: number; y: number } {
    const obstacle = this.selectedObstacle!;
    return { x: Math.max(98, Math.min(W - 98, obstacle.x)), y: Math.max(100, obstacle.y - 49) };
  }

  private shouldShowWaveCountdown(): boolean {
    if (this.mapReview) return false;
    return this.screen === "playing" && !this.paused && !this.inWave && this.enemies.length === 0
      && this.wave < this.level.waves.length && this.toastTime <= 0;
  }

  private waveCountdownPosition(): { x: number; y: number } {
    const start = this.level.pathPoints[0];
    const next = this.level.pathPoints[1];
    // 提示贴近怪物入口，并为顶部状态栏、底部道具栏和屏幕边缘保留安全距离。
    const preferred = {
      x: Math.max(48, Math.min(W - 48, start[0] + Math.sign(next[0] - start[0]) * 90)),
      y: Math.max(145, Math.min(PANEL_Y - 44, start[1] + Math.sign(next[1] - start[1]) * 90)),
    };
    const menus: HitRect[] = this.buildMenuItems().map((item) => ({ x: item.x - 32, y: item.y - 42, width: 64, height: 84 }));
    if (this.selectedTower) menus.push(...this.towerMenuItems(this.selectedTower).map((item) => ({
      x: item.x - BATTLE_UI.contextWidth / 2, y: item.y - BATTLE_UI.contextHeight / 2,
      width: BATTLE_UI.contextWidth, height: BATTLE_UI.contextHeight,
    })));
    if (this.selectedObstacle) {
      const info = this.obstacleInfoPosition();
      menus.push({ x: info.x - 86, y: info.y - 16, width: 172, height: 32 });
    }
    // 入口靠近首排时，菜单或清障信息会与倒计时相撞；只移动提示，不隐藏预告或更改波次计时。
    const candidates = [preferred, { x: W - preferred.x, y: preferred.y }];
    for (const y of [Math.max(145, preferred.y - 104), Math.min(PANEL_Y - 44, preferred.y + 104)]) {
      candidates.push({ x: preferred.x, y }, { x: W - preferred.x, y });
    }
    const fits = (point: { x: number; y: number }): boolean => menus.every((rect) => point.x + 48 <= rect.x || point.x - 48 >= rect.x + rect.width
      || point.y + 40 <= rect.y || point.y - 40 >= rect.y + rect.height);
    const nearby = candidates.find(fits);
    if (nearby) return nearby;
    // 屏内入口可能与整组三张建造卡同时占满近处候选；再搜索棋盘内空位，按离入口的距离排序。
    // 这里只在近处没有空间时降级，96×80的保守框包含数字与波次标题，不会缩小预告来挤菜单。
    const fallback: Array<{ x: number; y: number }> = [];
    for (let y = 145; y <= PANEL_Y - 44; y += 48) {
      for (let x = 48; x <= W - 48; x += 48) fallback.push({ x, y });
    }
    fallback.sort((a, b) => Math.hypot(a.x - preferred.x, a.y - preferred.y) - Math.hypot(b.x - preferred.x, b.y - preferred.y));
    return fallback.find(fits) ?? preferred;
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
    const spacing = 74;
    const totalWidth = (kinds.length - 1) * spacing;
    // 整组按钮一起做边缘避让，而不是逐个夹紧，防止三个按钮在窄边缘处互相重叠。
    const startX = Math.max(44, Math.min(W - 44 - totalWidth, spot.x - totalWidth / 2));
    const candidates = [spot.y - 82, spot.y + 82]
      .map((value) => Math.max(120, Math.min(PANEL_Y - 48, value)))
      .filter((value) => Math.abs(value - spot.y) >= 60);
    // 比较上下两侧所有按钮到道路的最小距离，优先把菜单放到不遮挡战斗的一边。
    const score = (candidateY: number): number => Math.min(...kinds.map((_, index) => this.distanceToPath(startX + index * spacing, candidateY)));
    const y = candidates.length < 2 || score(candidates[0]) >= score(candidates[1]) ? candidates[0] : candidates[1];
    return kinds.map((kind, index) => ({ kind, x: startX + index * spacing, y }));
  }

  private towerMenuItems(tower: Tower): Array<{ action: "upgrade" | "sell"; x: number; y: number }> {
    const totalWidth = BATTLE_UI.contextWidth * 2 + 10;
    const startX = Math.max(12, Math.min(W - totalWidth - 12, tower.x - totalWidth / 2));
    const centerX = startX + totalWidth / 2;
    const candidates = [tower.y - 65, tower.y + 65].map((value) => Math.max(104, Math.min(PANEL_Y - 40, value))).filter((value) => Math.abs(value - tower.y) >= 48);
    const y = candidates.length < 2 || this.distanceToPath(centerX, candidates[0]) >= this.distanceToPath(centerX, candidates[1]) ? candidates[0] : candidates[1];
    return [
      { action: "upgrade", x: startX + BATTLE_UI.contextWidth / 2, y },
      { action: "sell", x: startX + BATTLE_UI.contextWidth * 1.5 + 10, y },
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

  private drawHome(g: Graphics): void {
    this.box(g, 0, this.layoutTop, W, this.layoutBottom - this.layoutTop, 0, "#244d42");
    this.uiCard(g, 30, 68, 330, 568, "#fff7df", 26);
    this.drawAwning(g, 47, 75, 296);
    if (!this.gmPanelOpen && this.uiArt.ready) {
      KINDS.forEach((kind, index) => {
        const x = 141 + index * 54;
        this.disc(g, x, 110, 24, "#e8e6bd");
        this.uiArt.drawIcon(`home-staff-${kind}`, kind, x, 110, 46);
      });
    } else {
      this.disc(g, 195, 110, 27, "#f3d5a0");
      this.drawShopMark(g, 195, 110);
    }
    const primary = HOME_CONTINUE_BUTTON;
    this.uiCard(g, primary.x, primary.y, primary.width, primary.height, "#ee9559", 16);
    const unlocked = this.unlockedLevel;
    for (const item of HOME_LEVEL_BUTTONS) {
      const available = item.levelId <= unlocked;
      this.uiCard(g, item.x, item.y, item.width, item.height, available ? "#dceabe" : "#e0dfcd", 12);
    }
  }

  private syncHomeLabels(): void {
    for (const key of this.labels.keys()) this.showLabel(key, key.startsWith("home-") && !this.gmPanelOpen);
    const unlocked = this.unlockedLevel;
    this.setLabel("home-continue", `继续闯关 · 第 ${unlocked} 关`);
    this.setLabel("home-progress", `已解锁 ${unlocked} / ${GAME_CONFIG.maxLevels} 关`);
    for (const item of HOME_LEVEL_BUTTONS) {
      const available = item.levelId <= unlocked;
      const key = `home-level-${item.levelId}`;
      this.setLabel(key, `第 ${item.levelId.toString().padStart(2, "0")} 关\n${available ? "可挑战" : "未解锁"}`);
      this.setLabelColor(key, available ? "#244d42" : "#747b69");
    }
    this.syncGmLabels();
  }

  private readUnlockedLevel(): number {
    return getLevelConfig(PlatformService.getNumber("night_store_unlocked_level", 1)).id;
  }

  private startOfficialLevel(levelId: number): void {
    const level = getLevelConfig(levelId);
    if (level.id > this.readUnlockedLevel()) return;
    this.gmSessionActive = false; this.gmPanelOpen = false;
    this.resetLevel(level.id);
  }

  private returnHome(): void {
    // 返回首页即结束本局；只保留正式解锁和倍速偏好，GM 布阵不进入正式游戏。
    this.gmSessionActive = false; this.gmPanelOpen = false;
    this.onTouchCancel();
    this.unlockedLevel = this.readUnlockedLevel();
    this.resetLevel(this.unlockedLevel);
    this.screen = "home";
  }

  private overlayHomeButton(): HitRect {
    const y = this.paused && this.screen === "playing" ? 431 : this.screen === "lose" && !this.revived ? 540 : 464;
    return { x: 72, y, width: 246, height: 48 };
  }

  private drawOverlay(g: Graphics): void {
    g.fillColor = this.color("#0c1f1a", 196); g.rect(0, this.layoutTop + 72, W, this.layoutBottom - this.layoutTop - 72); g.fill();
    const home = this.overlayHomeButton();
    if (this.paused && this.screen === "playing") {
      this.uiCard(g, 55, 226, 280, 270, "#fff7df", 24);
      this.drawAwning(g, 78, 235, 234);
      this.uiCard(g, 91, 355, 208, 52, "#78ad65", 14);
      this.uiCard(g, home.x, home.y, home.width, home.height, "#e2e7cd", 14);
      return;
    }
    const win = this.screen === "win";
    this.uiCard(g, 36, 176, 318, !win && !this.revived ? 430 : 356, "#fff7df", 26);
    this.drawAwning(g, 64, 180, 262);
    this.disc(g, 195, 225, 40, win ? "#d8eabc" : "#f6c4a7");
    this.drawShopMark(g, 195, 225);
    if (!win && !this.revived) {
      this.uiCard(g, 72, 386, 246, 52, "#ee9559"); this.uiCard(g, 72, 474, 246, 48, "#78ad65");
    } else this.uiCard(g, 72, 394, 246, 52, "#78ad65");
    this.uiCard(g, home.x, home.y, home.width, home.height, "#e2e7cd", 14);
  }

  private drawGmPanel(g: Graphics): void {
    if (!DEBUG || this.mapReview) return;
    const entry = this.footerRect(GM_BUTTON);
    this.box(g, entry.x, entry.y, entry.width, entry.height, 13, "#7358a6", 0.96);
    if (!this.gmPanelOpen) return;
    g.fillColor = this.color("#0c1f1a", 205); g.rect(0, this.layoutTop, W, this.layoutBottom - this.layoutTop); g.fill();
    this.box(g, 35, 112, 320, 474, 24, "#fff9df");
    const close = BATTLE_UI.gmClose;
    this.box(g, close.x, close.y, close.width, close.height, 12, "#7358a6");
    for (const item of GM_LEVEL_BUTTONS) {
      const current = item.levelId === this.currentLevelId;
      this.box(g, item.x, item.y, item.width, item.height, 12, current ? "#ffc34d" : "#dff0b7");
    }
    this.box(g, GM_PROGRESS_BUTTON.x, GM_PROGRESS_BUTTON.y, GM_PROGRESS_BUTTON.width, GM_PROGRESS_BUTTON.height, 11, "#58a95e");
  }

  private syncLabels(): void {
    for (const key of this.labels.keys()) if (key.startsWith("home-")) this.showLabel(key, false);
    this.setLabel("level", `${this.level.id.toString().padStart(2, "0")}关${this.gmSessionActive && !this.mapReview ? "·GM" : "/10"}`);
    this.setLabel("wave", `${this.wave}/${this.level.waves.length} 波`);
    this.setLabel("coin", `${this.coins}`); this.setLabel("lives", `${this.lives}`);
    this.setLabel("speed", `×${this.gameSpeed}`); this.setLabel("pause", this.paused ? "▶" : "Ⅱ");
    ["title", "level", "wave", "coin", "lives", "speed", "pause"].forEach((key) => this.showLabel(key, !this.gmPanelOpen));
    const contextVisible = this.screen === "playing" && !this.paused && !this.gmPanelOpen;
    this.showLabel("entry-mark", contextVisible && !this.selectedSpot);
    this.showLabel("goal-mark", contextVisible && !this.selectedSpot);
    const buildItems = contextVisible ? this.buildMenuItems() : [];
    KINDS.forEach((kind) => {
      const item = buildItems.find((candidate) => candidate.kind === kind);
      this.showLabel(`build-${kind}`, Boolean(item));
      this.showLabel(`build-cost-${kind}`, Boolean(item));
      if (!item) return;
      this.setLabel(`build-${kind}`, TOWER_CONFIG[kind].name);
      this.setLabel(`build-cost-${kind}`, `●${TOWER_CONFIG[kind].cost}`);
      this.setLabelPosition(`build-${kind}`, item.x, item.y + 10);
      this.setLabelPosition(`build-cost-${kind}`, item.x, item.y + 29);
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
      const position = this.obstacleInfoPosition();
      this.setLabelPosition("obstacle-info", position.x, position.y);
      this.setLabel("obstacle-info", `清理 ♥${Math.ceil(obstacle.hp)}  +${obstacle.reward}`);
    }
    this.setLabel("prop-freeze", this.propButtonText("freeze"));
    this.setLabel("prop-clear", this.propButtonText("clear"));
    this.setLabel("prop-cash", this.propButtonText("cash"));
    ["prop-freeze", "prop-clear", "prop-cash"].forEach((key) => this.showLabel(key, contextVisible));
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
    ["overlayTitle", "overlayStats", "overlayPrimary", "overlayNote", "overlaySecondary", "overlayHome"].forEach((key) => this.showLabel(key, overlay));
    this.syncGmLabels();
    if (!overlay) return;
    const home = this.overlayHomeButton();
    this.setLabelPosition("overlayHome", home.x + home.width / 2, home.y + home.height / 2);
    this.setLabel("overlayHome", this.screen === "playing" ? "结束本局并返回" : "返回首页");
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
    if (this.mapReview) {
      for (const key of this.labels.keys()) if (key.startsWith("gm-")) this.showLabel(key, false);
      return;
    }
    this.showLabel("gm-entry", !this.gmPanelOpen);
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
    if (this.propCounts[kind] > 0) return `${shortName}×${this.propCounts[kind]}`;
    return this.propAdUsed[kind] ? `${shortName}·用完` : `${shortName}·广告`;
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

  /** 皮肤用可缩放矢量底板，图标用独立精灵；大圆角和统一描边不依赖高分大面板贴图。 */
  private uiCard(g: Graphics, x: number, y: number, width: number, height: number, fill: string, radius = 14): void {
    this.box(g, x, y + 3, width, height, radius, "#334933", 0.42);
    this.box(g, x, y, width, height, radius, fill);
    g.strokeColor = this.color("#655d43"); g.lineWidth = 1.8;
    g.roundRect(x, y, width, height, radius); g.stroke();
    g.strokeColor = this.color("#fff9e8", 180); g.lineWidth = 1;
    g.moveTo(x + radius, y + 4); g.lineTo(x + width - radius, y + 4); g.stroke();
  }

  private drawAwning(g: Graphics, x: number, y: number, width: number): void {
    for (let i = 0; i < 9; i += 1) this.box(g, x + i * width / 9, y, width / 9, 12, 4, i % 2 ? "#f4dfb8" : "#e5a46e");
  }

  private drawHeart(g: Graphics, x: number, y: number): void {
    g.fillColor = this.color("#ee7866"); g.strokeColor = this.color("#844a3b"); g.lineWidth = 1.5;
    g.moveTo(x, y + 8); g.bezierCurveTo(x - 17, y - 1, x - 8, y - 13, x, y - 5);
    g.bezierCurveTo(x + 8, y - 13, x + 17, y - 1, x, y + 8); g.close(); g.fill(); g.stroke();
  }

  private drawShopMark(g: Graphics, x: number, y: number): void {
    this.uiCard(g, x - 23, y - 16, 46, 38, "#fff5d6", 5);
    this.box(g, x - 16, y, 16, 22, 2, "#acccb4"); this.box(g, x + 6, y + 1, 12, 13, 2, "#f7d174");
    for (let i = 0; i < 5; i += 1) this.box(g, x - 25 + i * 10, y - 20, 10, 14, 3, i % 2 ? "#fff5d6" : "#ed9b5b");
    this.disc(g, x - 3, y + 12, 1.5, "#554d39");
  }

  private setLabel(key: string, value: string): void { const item = this.labels.get(key); if (item) item.string = value; }
  private setLabelColor(key: string, hex: string): void { const item = this.labels.get(key); if (item) item.color = this.color(hex); }
  private setLabelPosition(key: string, x: number, y: number): void {
    const item = this.labels.get(key); if (item) item.node.setPosition(x - W / 2, H / 2 - y);
  }
  private showLabel(key: string, visible: boolean): void { const item = this.labels.get(key); if (item) item.node.active = visible; }

  /** 三种风格共用同一视觉布阵：只引用真实格位和素材，绝不写回关卡配置或玩家进度。 */
  private setupMapReview(): void {
    if (!this.mapReview) return;
    this.gmSessionActive = true; this.gameSpeed = 1; this.toastTime = 0;
    if (this.mapReview.stage === "empty") return;
    // 示例为中局密度，不是初始资源下可直接购买的阵容，也不是无广告通关证据。
    const cleared = [this.obstacles[1], this.obstacles[5]].filter(Boolean);
    for (const obstacle of cleared) obstacle.spot.obstacle = null;
    this.obstacles = this.obstacles.filter((obstacle) => !cleared.includes(obstacle));
    const open = this.spots.filter((spot) => !spot.obstacle);
    for (let i = 0; i < 8; i += 1) {
      const spot = open[Math.round(i * (open.length - 1) / 7)];
      const kind = this.level.availableTowers[i % this.level.availableTowers.length];
      const tower: Tower = { x: spot.x, y: spot.y, kind, level: i % 3 === 0 ? 2 : 1,
        cooldown: 0, angle: 0, spent: TOWER_CONFIG[kind].cost, spot, recoil: 0 };
      spot.tower = tower; this.towers.push(tower);
    }
    this.coins = 235; this.wave = 2; this.inWave = true;
    const kinds: EnemyKind[] = ["normal", "swift", "tank", "normal", "swift", "normal"];
    [0.14, 0.22, 0.39, 0.46, 0.64, 0.72].forEach((ratio, i) => {
      this.spawnEnemy(kinds[i]);
      const enemy = this.enemies[this.enemies.length - 1];
      enemy.distance = this.pathLength * ratio; const point = this.pathPosition(enemy.distance);
      enemy.x = point.x; enemy.y = point.y; enemy.age = 0;
      enemy.hp = Math.round(enemy.maxHp * (i % 2 ? 0.65 : 0.9));
    });
    for (const tower of this.towers) {
      const target = this.enemies.reduce((a, b) => Math.hypot(a.x - tower.x, a.y - tower.y) < Math.hypot(b.x - tower.x, b.y - tower.y) ? a : b);
      tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
    }
  }

  private resetLevel(levelId = this.currentLevelId): void {
    this.level = getLevelConfig(levelId); this.currentLevelId = this.level.id;
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
    // 横幅结束后才开始按剩余秒数向上取整显示倒计时，倍速会同时加快预告和战斗。
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
          if (!this.gmSessionActive) PlatformService.setMaximumInteger("night_store_best_level", this.level.id, GAME_CONFIG.maxLevels);
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
        // 表现层只左右转身；子弹从手持工具附近发射，再追踪真实目标，不旋转整只动物。
        this.shots.push({ x: tower.x + (Math.cos(tower.angle) < 0 ? -12 : 12), y: tower.y - 5, target, kind: tower.kind, level: tower.level, speed: tower.kind === "bloom" ? 150 : 230 });
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
        if (!this.gmSessionActive) PlatformService.setMaximumInteger("night_store_unlocked_level", this.currentLevelId + 1, GAME_CONFIG.maxLevels);
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
    if (spot.tower || spot.obstacle) return;
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

  private onTouchStart(event: EventTouch): void {
    if (this.mapReview) return;
    // 第二根手指不能覆盖首个触点；多点交错统一取消当前点击，避免松手时触发另一处按钮。
    if (this.touchStart) { this.touchTravelCancelled = true; return; }
    const point = event.getUILocation();
    this.touchStart = { x: point.x, y: point.y };
    this.touchId = event.getID(); this.touchTravelCancelled = false;
  }

  private onTouchMove(event: EventTouch): void {
    if (!this.touchStart || event.getID() !== this.touchId) return;
    const point = event.getUILocation();
    // 锁存最大行程：即使滑远后又回到起点，也不能被当作一次点击。
    if (Math.hypot(point.x - this.touchStart.x, point.y - this.touchStart.y) > 24) this.touchTravelCancelled = true;
  }

  private onTouchCancel(event?: EventTouch): void {
    if (event && event.getID() !== this.touchId) return;
    this.touchStart = null; this.touchId = null; this.touchTravelCancelled = false;
  }

  private onTouchEnd(event: EventTouch): void {
    if (this.mapReview) return;
    if (event.getID() !== this.touchId) return;
    const point = event.getUILocation();
    const start = this.touchStart; const cancelled = this.touchTravelCancelled; this.onTouchCancel();
    // 手指滑动或系统取消不算点击，避免拖动到道具/出售按钮时意外触发。
    if (!start || cancelled || Math.hypot(point.x - start.x, point.y - start.y) > 24) return;
    const local = this.contentRoot.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(point.x, point.y));
    this.handlePress(local.x + W / 2, H / 2 - local.y);
  }

  private handlePress(x: number, y: number): void {
    if (this.mapReview) return;
    if (x < 0 || x > W || y < this.layoutTop || y > this.layoutBottom || this.adRequesting) return;
    if (DEBUG && !this.gmPanelOpen && this.buttonHit(this.footerRect(GM_BUTTON), x, y)) {
      this.gmPanelOpen = !this.gmPanelOpen; return;
    }
    if (DEBUG && this.gmPanelOpen) {
      if (this.buttonHit(BATTLE_UI.gmClose, x, y)) { this.gmPanelOpen = false; return; }
      if (this.buttonHit(GM_PROGRESS_BUTTON, x, y)) {
        this.returnHome(); return;
      }
      const levelButton = GM_LEVEL_BUTTONS.find((item) => this.buttonHit(item, x, y));
      if (levelButton) {
        this.gmSessionActive = true; this.gmPanelOpen = false; this.resetLevel(levelButton.levelId); return;
      }
      // 面板外点击仅关闭 GM，不把同一次点击传递给战斗，防止误建造或误用道具。
      if (x < 35 || x > 355 || y < 112 || y > 586) this.gmPanelOpen = false;
      return;
    }
    if (this.screen === "home") {
      if (this.buttonHit(HOME_CONTINUE_BUTTON, x, y)) this.startOfficialLevel(this.readUnlockedLevel());
      else {
        const levelButton = HOME_LEVEL_BUTTONS.find((item) => this.buttonHit(item, x, y));
        if (levelButton) this.startOfficialLevel(levelButton.levelId);
      }
      return;
    }
    if ((this.paused || this.screen !== "playing") && this.buttonHit(this.overlayHomeButton(), x, y)) {
      this.returnHome(); return;
    }
    if (this.screen === "playing") {
      if (this.buttonHit(this.headerRect(BATTLE_UI.pause), x, y)) { this.paused = !this.paused; return; }
      if (this.buttonHit(this.headerRect(BATTLE_UI.speed), x, y)) { this.cycleGameSpeed(); return; }
    }
    if (this.paused && this.screen === "playing") {
      if (this.buttonHit({ x: 91, y: 355, width: 208, height: 52 }, x, y)) this.paused = false;
      return;
    }
    if (this.screen === "lose") {
      if (!this.revived && this.buttonHit({ x: 72, y: 386, width: 246, height: 52 }, x, y)) void this.reviveWithAd();
      else if (!this.revived && this.buttonHit({ x: 72, y: 474, width: 246, height: 48 }, x, y)) this.resetLevel();
      else if (this.revived && this.buttonHit({ x: 72, y: 394, width: 246, height: 52 }, x, y)) this.resetLevel();
      return;
    }
    if (this.screen === "win") { if (this.buttonHit({ x: 72, y: 394, width: 246, height: 52 }, x, y)) this.advanceLevel(); return; }

    // 先处理塔位旁的上下文按钮，避免点到按钮时被下方建造单元再次选中。
    if (this.selectedTower) {
      const item = this.towerMenuItems(this.selectedTower).find((candidate) => this.buttonHit({ x: candidate.x - BATTLE_UI.contextWidth / 2, y: candidate.y - BATTLE_UI.contextHeight / 2, width: BATTLE_UI.contextWidth, height: BATTLE_UI.contextHeight }, x, y));
      if (item) {
        if (item.action === "upgrade") this.upgradeSelected(); else this.sellSelected();
        return;
      }
    } else if (this.selectedSpot && !this.selectedSpot.tower && !this.selectedSpot.obstacle) {
      const buildItem = this.buildMenuItems().find((item) => this.buttonHit({ x: item.x - 32, y: item.y - 42, width: 64, height: 84 }, x, y));
      if (buildItem) { this.buildTower(this.selectedSpot, buildItem.kind); return; }
    }

    const button = PROP_BUTTONS.find((item) => this.buttonHit(this.footerRect(item), x, y));
    if (button) { this.useProp(button.kind); return; }

    // 边缘格位把方形热区夹在可视边界内，保证不因一半热区在屏幕外而难以点中。
    const spot = this.spots.find((item) => containsPoint({
      x: Math.max(0, Math.min(W - this.hitSize, item.x - this.hitSize / 2)),
      y: item.y - this.hitSize / 2, width: this.hitSize, height: this.hitSize,
    }, x, y));
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
    // 表现层软预算：密集击杀时只减少装饰粒子，绝不跳过命中、奖励或敌人逻辑。
    const available = Math.max(0, 200 - this.particles.length);
    for (let i = 0; i < Math.min(count, available); i += 1) {
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
