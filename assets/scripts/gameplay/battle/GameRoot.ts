import { loadoutRule, validLoadout, saveLoadout, resetLoadouts, wavePreview } from "./LevelLoadout";
import { attackProfile, evolutionChoices, evolutionByKey, StaffEvolution } from "./StaffEvolution";
import { configsReady, globalNumber, numeric, rows, text } from "../../config/ConfigTables";
import { loadGameConfigs } from "../../config/ConfigLoader";
import {
  _decorator, Color, Component, EventTouch, Graphics, HorizontalTextAlignment,
  Label, Layers, Mask, Node, ResolutionPolicy, UITransform, Vec3,
  VerticalTextAlignment, view, sys, profiler, screen as deviceScreen,
} from "cc";
import { DEBUG } from "cc/env";
import { ENEMY_CONFIG, GAME_CONFIG, TOWER_CONFIG, TOWER_KINDS, EnemyKind, TowerKind } from "./GameConfig";
import { getLevelConfig, LevelConfig, ObstacleKind } from "./LevelConfig";
import { PlatformService } from "../../services/PlatformService";
import { AudioService } from "../../services/AudioService";
import { BattleArtView } from "./BattleArtView";
import { BattleUiView } from "./BattleUiView";
import { PrefabGameMenuView as GameMenuView } from "../../ui/PrefabGameMenuView";
import { UiPrefabs } from "../../ui/UiPrefabs";
import { BattlePrefabView } from "../../ui/BattlePrefabView";
import { TutorialGuide } from "./TutorialGuide";
import { CollectionProgress } from "./CollectionData";
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
const KINDS = TOWER_KINDS;
type GameSpeed = 1 | 2 | 3;
// 正式局内倍速档位按固定顺序循环，避免出现不受数值验证覆盖的任意倍率。
const GAME_SPEEDS: readonly GameSpeed[] = [1, 2, 3];
type PropKind = "freeze" | "clear" | "cash";
const PROP_BUTTONS = [
  { kind: "freeze" as const, x: 92, y: H - 76, width: 88, height: 64 },
  { kind: "clear" as const, x: 188, y: H - 76, width: 88, height: 64 },
  { kind: "cash" as const, x: 284, y: H - 76, width: 88, height: 64 },
];
// GM 入口只由 Cocos 的调试编译常量控制，正式抖音构建会直接隐藏整套测试界面。
const GM_BUTTON = { x: 12, y: H - 60, width: 50, height: 48 };
const GM_PROGRESS_BUTTON = { x: 115, y: 534, width: 160, height: 48 };
const GM_LEVEL_BUTTONS: Array<{levelId:number;x:number;y:number;width:number;height:number}> = [];
function configureGmButtons():void { GM_LEVEL_BUTTONS.splice(0,GM_LEVEL_BUTTONS.length,...Array.from({ length: GAME_CONFIG.maxLevels }, (_, index) => ({
  levelId: index + 1,
  x: 43 + (index % 4) * 79,
  y: 204 + Math.floor(index / 4) * 60,
  width: 68,
  height: 46,
}))); }

interface Enemy {
  kind: EnemyKind; hp: number; maxHp: number; speed: number; reward: number;
  radius: number; color: string; damage: number; distance: number; x: number; y: number;
  age: number; slow: number; slows?: Record<string,{ratio:number;remaining:number}>; hitFlash: number;
  burnTime: number; burnDamage: number; markedTime: number; sinceHit: number;
}

interface Tower {
  x: number; y: number; kind: TowerKind; level: number; cooldown: number;
  angle: number; spent: number; spot: Spot; recoil: number; evolutionKey?: string; burstRemaining?: number; burstTimer?: number;
}

interface Obstacle {
  x: number; y: number; kind: ObstacleKind; hp: number; maxHp: number; reward: number;
  radius: number; hitFlash: number; spot: Spot;
}

type AttackTarget = Enemy | Obstacle;
interface Spot { x: number; y: number; tower: Tower | null; obstacle: Obstacle | null; }
interface Shot { evolutionKey?: string; x: number; y: number; target: AttackTarget; kind: TowerKind; level: number; speed: number; originX: number; originY: number; age: number; lane: number; }
interface Particle { x: number; y: number; vx: number; vy: number; size: number; color: string; life: number; maxLife: number; }

@ccclass("GameRoot")
export class GameRoot extends Component {
  private contentRoot!: Node;
  private uiPrefabs!: UiPrefabs;
  private battleUi!: BattlePrefabView;
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
  private contextPlacement: { key: string; points: Array<{ x: number; y: number }> } | null = null;
  private touchTravelCancelled = false;
  private readonly activeTouchIds = new Set<number | null>();
  private appliedResolutionPolicy: number | null = null;
  private disposed = false;
  private mapReview: MapStyleReviewConfig | null = null;
  private releaseMapReviewCapture: (() => void) | null = null;
  private audio!: AudioService;
  private menu: GameMenuView | null = null;
  private collection: CollectionProgress | null = null;
  private labels = new Map<string, Label>();
  private labelSizes = new Map<string, number>();
  private currentLevelId = 1;
  private unlockedLevel = 1;
  private level!: LevelConfig;
  private booted = false;
  private coins = 0;
  private lives = 0;
  private wave: number = 0;
  private inWave = false;
  private paused = false;
  private gameSpeed: GameSpeed = 1;
  private screen: "home" | "playing" | "win" | "lose" = "home";
  private revived = false;
  private readonly tutorial = new TutorialGuide();
  private guidePulse = 0;
  private guideCue: { rect: HitRect | null; text: string; color: string; period: number } | null = null;
  private gmPanelOpen = false;
  private gmResetArmed = false;
  private gmSessionActive = false;
  private selectedTower: Tower | null = null;
  private evolutionTower: Tower | null = null;
  private newEvolutionKeys: string[] = [];
  private selectedSpot: Spot | null = null;
  private selectedObstacle: Obstacle | null = null;
  private queue: EnemyKind[] = [];
  private spawnTimer = 0;
  private spawnInterval = 0.72;
  private nextWaveTimer = 4;
  private frozenTime = 0;
  private adRequesting = false;
  private battleRevision = 0;
  private adFeedback = "";
  private propCounts: Record<PropKind, number> = { freeze: 0, clear: 0, cash: 0 };
  private propAdUsed: Record<PropKind, boolean> = { freeze: false, clear: false, cash: false };
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private shots: Shot[] = [];
  private particles: Particle[] = [];
  private spots: Spot[] = [];
  private obstacles: Obstacle[] = [];
  private toastText = "";
  private toastTime = 4;
  private defeated = 0;
  private earned = 0;
  private pathLength = 0;
  private damageFlash = 0;
  private battleFeedbackText = "";
  private battleFeedbackTime = 0;
  private battleFeedbackX = W / 2;
  private battleFeedbackY = H / 2;
  // 反馈使用真实前台时间，不参与伤害、移速或碰撞计算。
  private impacts: Array<{x:number;y:number;kind:TowerKind;life:number;radius:number;fromX?:number;fromY?:number}> = [];
  private bossCue: {kind:EnemyKind;defeated:boolean;time:number} | null = null;
  private newEncounterKinds: EnemyKind[] = [];
  private newStaffKinds: TowerKind[] = [];
  private resultNextLevel = 0;
  private readonly hideHandler = (): void => { this.paused = true; this.audio?.setSuspended(true); this.onTouchCancel(); };
  private readonly showHandler = (): void => { this.audio?.setSuspended(false); };
  private readonly resizeHandler = (): void => { this.configureResolution(); this.applyLayout(); this.scheduleOnce(() => this.applyLayout(), 0); };

  onLoad(): void {
    // 配置就绪后统一加载预制体；重试期间禁止重复启动同一批资源。
    const loading = new Node("ConfigLoading"); loading.layer = Layers.Enum.UI_2D; this.node.addChild(loading);
    loading.addComponent(UITransform).setContentSize(650, 180);
    const label = loading.addComponent(Label); label.fontSize = 28;
    let busy = false;
    const start = async (): Promise<void> => {
      if (busy || this.disposed) return;
      busy = true; label.string = "加载中…";
      try {
        if (!configsReady()) await loadGameConfigs();
        const assets = await UiPrefabs.load();
        if (this.disposed) { assets.destroy(); return; }
        this.uiPrefabs = assets; loading.destroy(); this.boot();
      } catch (error) {
        console.error("Game UI/configuration load failed", error);
        if (!this.disposed) label.string = "界面加载失败\n点击重试";
      } finally { busy = false; }
    };
    loading.on(Node.EventType.TOUCH_END, () => { void start(); }); void start();
  }

  private boot(): void {
    configureGmButtons(); this.booted=true;
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
    this.battleUi = new BattlePrefabView(this.contentRoot, this.uiPrefabs);
    this.audio = new AudioService(this.node, !this.mapReview);
    this.createLabels();
    const savedSpeed = this.mapReview ? 1 : PlatformService.getNumber("night_store_game_speed", 1);
    this.gameSpeed = savedSpeed === 2 || savedSpeed === 3 ? savedSpeed : 1;
    this.currentLevelId = this.mapReview?.levelId ?? this.readUnlockedLevel();
    this.resetLevel(this.currentLevelId);
    if (this.mapReview) this.setupMapReview();
    else { this.unlockedLevel = this.currentLevelId; this.screen = "home"; }
    if (!this.mapReview) {
      this.collection = new CollectionProgress(this.unlockedLevel);
      this.menu = new GameMenuView(this.contentRoot, this.uiPrefabs, this.audio, this.collection, (id,roster) => this.startOfficialLevel(id,roster));
      this.menu.show(this.unlockedLevel);
    }
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
    PlatformService.onShow(this.showHandler);
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
    PlatformService.offShow(this.showHandler);
    this.menu?.destroy();
    this.battleUi?.destroy();
    this.uiPrefabs?.destroy();
    this.audio?.destroy();
    this.art?.destroy();
    this.uiArt?.destroy();
    this.scenery?.destroy();
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
      if (this.battleUi.fixedLabels.has(key)) continue;
      label.fontSize = Math.max(this.labelSizes.get(key) ?? 13, 24 / layout.scale);
      label.lineHeight = label.fontSize + 4;
    }
    this.drawStaticMap();
    // 顶栏贴安全区顶部，道具贴安全区底部；地图保持等比居中，不拉长道路。
    this.battleUi.layout(this.layoutTop, this.layoutBottom);
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

  private footerRect(rect: HitRect): HitRect {
    if (rect === GM_BUTTON) return this.battleUi.gmRect("Entry");
    const prop = PROP_BUTTONS.find(item => item === rect);
    return prop ? this.battleUi.propRect(prop.kind) : { ...rect, y: rect.y + this.layoutBottom - H };
  }
  private headerRect(rect: HitRect): HitRect {
    return this.battleUi.headerRect(rect === BATTLE_UI.pause ? "Pause" : "Speed");
  }

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
    if(!this.booted)return;
    // 美术评审只冻结实例状态并使用真实渲染链；不调用战斗推进、广告或存档。
    if (this.mapReview) { this.paused = false; this.render(); return; }
    // 先限制单帧追赶时间，再把倍速后的游戏时间拆成稳定小步长，避免低帧率或三倍速时穿透目标。
    // 准备时钟独立于倍速，后台/暂停/广告期间不推进；战斗仍用稳定子步长。
    const realDelta = Math.max(0, dt);
    if (this.screen === "playing" && !this.paused && !this.gmPanelOpen && !this.adRequesting) {
      this.guidePulse += realDelta;
      this.updateFeedback(realDelta);
    }
    if (!this.paused && !this.gmPanelOpen && !this.adRequesting && this.screen === "playing"
      && !this.inWave && this.enemies.length === 0 && this.wave < this.level.waves.length) {
      this.nextWaveTimer = Math.max(0, this.nextWaveTimer - realDelta);
      if (this.nextWaveTimer <= 0) this.startWave();
    }
    let remainingGameTime = Math.min(realDelta, 0.1) * this.gameSpeed;
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
    for (const [key, label] of this.battleUi.labels) { this.labels.set(key, label); this.labelSizes.set(key, label.fontSize); }
    this.makeLabel("entry-mark", text("ui.GameRoot.001"), 13, 0, 0, 48, 22, "#fff4d1");
    this.makeLabel("goal-mark", text("ui.GameRoot.002"), 13, 0, 0, 60, 22, "#fff4d1");
    this.makeLabel("next-wave-title", "", 13, 0, 0, 82, 22, "#32724c");
    this.makeLabel("next-wave-number", "", 24, 0, 0, 58, 32, "#17352e");
    this.makeLabel("next-wave-action", text("ui.opt.startWave"), 13, 0, 0, 100, 22, "#32724c");
    this.makeLabel("battle-feedback", "", 13, 0, 0, 150, 26, "#17352e");
  }

  private makeLabel(key: string, value: string, size: number, x: number, y: number, width: number, height: number, hex: string, align = HorizontalTextAlignment.CENTER): Label {
    // 仅世界坐标标记和动态反馈复用此控件；固定面板不走程序排版。
    const root = this.uiPrefabs.create("floating_label", this.contentRoot);
    const label = root.getChildByName("Text")!.getComponent(Label)!;
    label.node.name = key; label.node.setPosition(x - W / 2, H / 2 - y);
    label.node.getComponent(UITransform)!.setContentSize(width, height);
    label.string = value; label.fontSize = Math.max(13, size); label.lineHeight = label.fontSize + 4; label.color = this.color(hex);
    label.horizontalAlign = align; label.verticalAlign = VerticalTextAlignment.CENTER;
    this.labels.set(key, label); this.labelSizes.set(key, label.fontSize); return label;
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
    this.battleUi.beginFrame(this.screen === "home");
    this.guideCue = null;
    if (this.screen === "home") {
      this.art.endFrame(); this.uiArt.endFrame();
      for (const key of this.labels.keys()) this.showLabel(key, false);
      this.menu?.render(this.unlockedLevel, this.layoutTop, this.layoutBottom);
      this.drawGmPanel(g); this.syncGmLabels();
      return;
    }
    this.menu?.hide();
    this.drawSpots(this.unitBaseG);
    this.drawLandmarkStatus(g);
    this.enemies.forEach((enemy) => this.drawEnemy(g, enemy));
    this.art.endFrame();
    this.shots.forEach((shot) => this.drawShot(g, shot));
    this.drawImpacts(g);
    this.particles.forEach((p) => this.disc(g, p.x, p.y, p.size, p.color, Math.max(0, p.life / p.maxLife)));
    if (this.frozenTime > 0) this.box(g, 0, 72, W, PANEL_Y - 72, 0, "#b8f2ff", 0.14);
    if (this.damageFlash > 0) this.box(g, 0, 72, W, PANEL_Y - 72, 0, "#eb685d", Math.min(0.2, this.damageFlash * 0.7));
    this.drawContextMenu(g);
    this.guideCue = this.resolveGuideCue();
    this.drawPanels(g);
    this.drawGuide(g);
    this.drawWaveCountdown(g);
    if (this.paused || this.screen !== "playing") this.drawOverlay(g);
    this.drawGmPanel(g);
    this.uiArt.endFrame();
    this.syncLabels();
  }

  /** 弹道仅改变视觉轨迹；命中仍由逻辑坐标和真实目标判定，倍速与暂停保持同步。 */
  private drawShot(g: Graphics, shot: Shot): void {
    const cfg=attackProfile(shot.kind,shot.level,shot.evolutionKey);
    const angle = Math.atan2(shot.target.y - shot.y, shot.target.x - shot.x);
    const ux = Math.cos(angle), uy = Math.sin(angle);
    const traveled = Math.hypot(shot.x - shot.originX, shot.y - shot.originY);
    const remaining = Math.hypot(shot.target.x - shot.x, shot.target.y - shot.y);
    const progress = traveled / Math.max(1, traveled + remaining);
    let x = shot.x, y = shot.y;
    const line = (a: number, b: number, c: number, d: number, color: string, width: number): void => {
      g.strokeColor = this.color(color); g.lineWidth = width; g.moveTo(a,b); g.lineTo(c,d); g.stroke();
    };
    if (cfg.projectile === "bloom") {
      y -= Math.sin(progress * Math.PI) * cfg.arcHeight;
      this.disc(g, shot.x, shot.y + 3, 4, "#66725e", 0.2);
      this.disc(g,x,y,6,"#ea8a46"); this.disc(g,x-1,y-2,3,"#ffe4a0");
    } else if (cfg.projectile === "sprout") {
      line(x-ux*9,y-uy*9,x,y,"#a4bf69",2); this.disc(g,x,y,3.8,"#d4e875"); this.disc(g,x-1,y-1,1.4,"#fffbd4");
    } else if (cfg.projectile === "frost") {
      g.fillColor=this.color("#bdeafb"); g.moveTo(x+ux*7,y+uy*7); g.lineTo(x-uy*3,y+ux*3); g.lineTo(x-ux*5,y-uy*5); g.lineTo(x+uy*3,y-ux*3); g.close();g.fill();
      line(x-ux*13,y-uy*13,x-ux*7,y-uy*7,"#e9fbff",2);
    } else if (cfg.projectile === "scope") {
      line(x-ux*25,y-uy*25,x+ux*5,y+uy*5,"#997a45",3); line(x-ux*17,y-uy*17,x+ux*7,y+uy*7,"#fff0b4",1.5);
    } else if (cfg.projectile === "spark") {
      line(x-ux*18,y-uy*18,x-ux*10-uy*5,y-uy*10+ux*5,"#dec774",2);
      line(x-ux*10-uy*5,y-uy*10+ux*5,x-ux*6+uy*4,y-uy*6-ux*4,"#fff4b7",2);
      line(x-ux*6+uy*4,y-uy*6-ux*4,x,y,"#dec774",2); this.disc(g,x,y,3,"#fff6c4");
    } else if (cfg.projectile === "ember") {
      for(let i=3;i>=0;i--) this.disc(g,x-ux*i*4+uy*Math.sin(shot.age*22-i)*2,y-uy*i*4-ux*Math.sin(shot.age*22-i)*2,4-i*0.7,i===0?"#fff1ae":"#ed8f55",1-i*0.2);
    } else if (cfg.projectile === "mint") {
      this.ring(g,x,y,4+progress*2,"#72b99a",0.9,2); this.disc(g,x-1,y-2,1.5,"#edffe2");this.disc(g,x-ux*10,y-uy*10,2,"#a4d7b8",0.6);
    } else {
      const bend = Math.sin(progress*Math.PI) * (shot.lane-1)*cfg.laneBend; x-=uy*bend;y+=ux*bend;
      for(let i=-1;i<=1;i++) line(x-ux*8+uy*i*3,y-uy*8-ux*i*3,x+ux*4+uy*i*3,y+uy*4-ux*i*3,"#a0d8d2",2);
    }
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
      this.disc(g, tower.x, tower.y, attackProfile(tower.kind,tower.level,tower.evolutionKey).range, "#57a96a", 0.08);
      this.ring(g, tower.x, tower.y, attackProfile(tower.kind,tower.level,tower.evolutionKey).range, "#32724c", 0.35, 1);
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
    if (enemy.burnTime > 0) this.ring(g, enemy.x, enemy.y, enemy.radius + 5, "#ee8e50", 0.8, 2);
    if (enemy.markedTime > 0) this.ring(g, enemy.x, enemy.y, enemy.radius + 3, "#81dfb7", 0.8, 2);
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    this.box(g, enemy.x - 15, enemy.y - enemy.radius - 12, 30, 5, 2.5, "#4b422e", 0.9);
    this.box(g, enemy.x - 14, enemy.y - enemy.radius - 11, 28 * ratio, 3, 1.5, ratio > 0.35 ? "#f59270" : "#ea635a");
    if (enemy.slow > 0 || Object.keys(enemy.slows ?? {}).length > 0) this.ring(g, enemy.x, enemy.y, enemy.radius + 3, "#b4f6ff", 0.7, 2);
  }

  private previewVisible():boolean{return this.screen==="playing"&&!this.paused&&!this.gmPanelOpen&&!this.mapReview&&!this.bossCue&&!this.guideCue&&!this.selectedSpot&&!this.selectedTower&&!this.selectedObstacle&&!this.evolutionTower;}
  private drawPanels(_g: Graphics): void {
    const last=this.wave>=this.level.waves.length,index=Math.min(this.wave,this.level.waves.length-1),entries=wavePreview(this.level.waves[index]);
    const title=last?text("ui.preview.last"):text("ui.preview.title",index+1);
    const bubble=this.waveCountdownPosition(),panelHeight=this.battleUi.wavePreviewHeight(entries.length);
    const previewTop=this.shouldShowWaveCountdown()&&bubble.y<this.layoutTop+panelHeight+120?this.layoutBottom-PROP_BUTTONS[0].height-panelHeight-25:this.layoutTop+112;
    this.battleUi.showWavePreview(entries,title,this.previewOpen,this.previewVisible(),previewTop);
    this.battleUi.hudState(this.propCounts, this.propAdUsed, this.screen === "playing" && !this.paused && !this.gmPanelOpen,
      this.gmPanelOpen, this.shouldShowToast() && !this.bossCue && !this.enemies.some(e => ENEMY_CONFIG[e.kind].boss), Boolean(this.mapReview));
  }

  private drawContextMenu(_g: Graphics): void {
    if (this.paused || this.screen !== "playing" || this.gmPanelOpen) return;
    if (this.selectedSpot && !this.selectedSpot.tower && !this.selectedSpot.obstacle) {
      for (const item of this.buildMenuItems()) this.battleUi.showBuild(item.kind, item.x, item.y, this.coins >= TOWER_CONFIG[item.kind].cost);
    }
    if (this.selectedTower && this.evolutionTower !== this.selectedTower) for (const item of this.towerMenuItems(this.selectedTower)) {
      const enabled = item.action === "sell" || (this.selectedTower.level < globalNumber("maxStaffLevel") && this.coins >= this.upgradeCost(this.selectedTower));
      this.battleUi.showAction(item.action, item.x, item.y, enabled);
    }
    if (this.selectedObstacle) { const p = this.obstacleInfoPosition(); this.battleUi.showObstacle(p.x, p.y); }
  }

  private obstacleInfoPosition(): { x: number; y: number } {
    const obstacle = this.selectedObstacle!;
    return { x: Math.max(98, Math.min(W - 98, obstacle.x)), y: Math.max(100, obstacle.y - 49) };
  }

  private shouldShowWaveCountdown(): boolean {
    if (this.mapReview) return false;
    return this.screen === "playing" && !this.paused && !this.inWave && this.enemies.length === 0
      && !this.adRequesting && this.wave < this.level.waves.length;
  }


  private resolveGuideCue(): { rect: HitRect | null; text: string; color: string; period: number } | null {
    const step = this.tutorial.current;
    if (!step || this.screen !== "playing" || this.paused || this.gmPanelOpen || this.adRequesting || this.gmSessionActive || this.mapReview) return null;
    const partner = this.towers.find(item => item.kind === step.partnerKind);
    const kind = (step.action === "combo" && !partner ? step.partnerKind : step.staffKind) as TowerKind, config = TOWER_CONFIG[kind];
    const result = (rect: HitRect | null, value: string) => ({rect, text:value, color:step.highlightColor, period:numeric(step,"pulseSeconds")});
    const spotRect = (spot: Spot): HitRect => ({x:spot.x-22,y:spot.y-22,width:44,height:44});
    const tower = this.towers.find(item => item.kind === kind && (step.action !== "combo" || !partner || Math.hypot(item.x-partner.x,item.y-partner.y) <= config.range + TOWER_CONFIG[partner.kind].range));
    if (step.action === "clear") {
      const reachable = this.obstacles.filter(obstacle => this.towers.some(item => Math.hypot(item.x-obstacle.x,item.y-obstacle.y) <= attackProfile(item.kind,item.level,item.evolutionKey).range));
      const obstacle = reachable.find(item => item.spot === this.spots[numeric(step,"spotIndex")]) ?? reachable[0];
      if (!obstacle) return null;
      return result(spotRect(obstacle.spot), text(this.selectedObstacle === obstacle ? step.waitText : step.actionText));
    }
    if (tower) {
      if (step.action === "upgrade") {
        if (this.coins < this.upgradeCost(tower)) return result(null,text(step.waitText));
        return result(this.selectedTower === tower ? this.battleUi.contextRect("upgrade") : spotRect(tower.spot),text(this.selectedTower === tower ? step.actionText : step.selectText));
      }
      return result(spotRect(tower.spot),text(step.waitText));
    }
    if (this.coins < config.cost) return result(null,text("guide.coins",config.name));
    if (this.selectedSpot && !this.selectedSpot.obstacle && !this.selectedSpot.tower) return result(this.battleUi.contextRect(kind),text("guide.choose",config.name));
    const open = this.spots.filter(spot => !spot.tower && !spot.obstacle);
    const preferred = this.spots[numeric(step,"spotIndex")];
    const spot = partner ? open.sort((a,b)=>Math.hypot(a.x-partner.x,a.y-partner.y)-Math.hypot(b.x-partner.x,b.y-partner.y))[0] : open.includes(preferred) ? preferred : open[0];
    return spot ? result(spotRect(spot),text(step.action === "combo" && partner ? step.selectText : "guide.place",config.name)) : null;
  }

  private drawGuide(g: Graphics): void {
    const cue = this.guideCue;
    if (!cue || this.toastTime > 0) return;
    this.battleUi.showGuide(cue.text);
    if (!cue.rect) return;
    const pulse = (Math.sin(this.guidePulse * Math.PI * 2 / cue.period)+1)/2, padding = 3+2*pulse;
    const r=cue.rect; Color.fromHEX(g.strokeColor,cue.color); g.lineWidth=2+2*pulse;
    g.roundRect(r.x-padding, r.y-padding,r.width+padding*2,r.height+padding*2,8); g.stroke();
    // 提示只绘制，不注册触摸监听；按钮、空白关闭与取消手势继续走原输入链。
  }

  private shouldShowToast(): boolean {
    if (this.toastTime <= 0 || this.screen !== "playing" || this.paused || this.gmPanelOpen) return false;
    if (!this.shouldShowWaveCountdown()) return true;
    const p = this.waveCountdownPosition(), r = this.battleUi.toastRect();
    // 局部空间不足时优先保留可操作的倒计时；纯提示不能挡住数字或建造格。
    return p.x + 58 <= r.x || p.x - 58 >= r.x + r.width || p.y + 44 <= r.y || p.y - 44 >= r.y + r.height;
  }

  private waveCountdownPosition(): { x: number; y: number } {
    const start = this.level.pathPoints[0];
    const next = this.level.pathPoints[1];
    // 提示贴近怪物入口，并为顶部状态栏、底部道具栏和屏幕边缘保留安全距离。
    const preferred = {
      x: Math.max(60, Math.min(W - 60, start[0] + Math.sign(next[0] - start[0]) * 90)),
      y: Math.max(116, this.layoutTop + 116),
    };
    const menus: HitRect[] = this.buildMenuItems().map((item) => ({ x: item.x - 32, y: item.y - 32, width: 64, height: 64 }));
    if (this.selectedTower && this.evolutionTower !== this.selectedTower) menus.push(...this.towerMenuItems(this.selectedTower).map((item) => ({
      x: item.x - BATTLE_UI.contextWidth / 2, y: item.y - BATTLE_UI.contextHeight / 2,
      width: BATTLE_UI.contextWidth, height: BATTLE_UI.contextHeight,
    })));
    if (this.guideCue && this.toastTime <= 0) menus.push(this.battleUi.guideRect());
    if (this.selectedObstacle) {
      const info = this.obstacleInfoPosition();
      menus.push({ x: info.x - 86, y: info.y - 16, width: 172, height: 32 });
    }
    // 入口靠近首排时，菜单或清障信息会与倒计时相撞；只移动提示，不隐藏预告或更改波次计时。
    menus.push(...this.evolutionMenuItems().map(item=>this.battleUi.evolutionRect(item.evolution.key)));
    const candidates = [preferred, { x: W - preferred.x, y: preferred.y }];
    const toastRect = this.toastTime > 0 ? this.battleUi.toastRect() : null;
    // 气泡可点击，不能覆盖尚未选择的建造格，避免玩家点格位却提前开波。
    menus.push(...this.spots.map(spot => ({x:spot.x-20,y:spot.y-20,width:40,height:40})));
    for (const y of [Math.max(145, preferred.y - 104), Math.min(PANEL_Y - 44, preferred.y + 104)]) {
      candidates.push({ x: preferred.x, y }, { x: W - preferred.x, y });
    }
    const fits = (point: { x: number; y: number }, includeToast = true): boolean => (includeToast && toastRect ? menus.concat(toastRect) : menus).every((rect) => point.x + 58 <= rect.x || point.x - 58 >= rect.x + rect.width
      || point.y + 44 <= rect.y || point.y - 44 >= rect.y + rect.height);
    const nearby = candidates.find(point => fits(point));
    if (nearby) return nearby;
    // 屏内入口可能与整组三张建造卡同时占满近处候选；再搜索棋盘内空位，按离入口的距离排序。
    // 这里只在近处没有空间时降级，116×88的保守框包含数字与波次标题，不会缩小预告来挤菜单。
    const fallback: Array<{ x: number; y: number }> = [];
    for (let y = Math.max(116, this.layoutTop + 116); y <= PANEL_Y - 44; y += 48) {
      for (let x = 60; x <= W - 60; x += 48) fallback.push({ x, y });
    }
    fallback.sort((a, b) => Math.hypot(a.x - preferred.x, a.y - preferred.y) - Math.hypot(b.x - preferred.x, b.y - preferred.y));
    return fallback.find(point => fits(point)) ?? candidates.find(point => fits(point, false)) ?? fallback.find(point => fits(point, false)) ?? preferred;
  }

  private drawWaveCountdown(g: Graphics): void {
    if (!this.shouldShowWaveCountdown()) return;
    const position = this.waveCountdownPosition();
    const urgent = this.nextWaveTimer <= 3;
    this.box(g, position.x - 56, position.y - 40, 112, 84, 16, "#fff9df", 0.97);
    g.strokeColor = this.color(urgent ? "#e78954" : "#58a95e"); g.lineWidth = 2;
    g.roundRect(position.x - 56, position.y - 40, 112, 84, 16); g.stroke();
  }

  /** 菜单仍围绕选中格弹出；候选区域避开所有格位，防止邻格点击被升级/出售截走。 */
  private contextMenuPoints(x: number, y: number, count: number, width: number, height: number): Array<{ x: number; y: number }> {
    const guideVisible = Boolean(this.tutorial.current) && !this.gmSessionActive && !this.mapReview && this.toastTime <= 0;
    const key = [this.currentLevelId, x, y, count, width, height, this.layoutTop, this.layoutBottom, guideVisible].join("/");
    if (this.contextPlacement?.key === key) return this.contextPlacement.points;
    const gap = 10, margin = 6, tileHalf = BATTLE_UI.minimumHit / 2;
    const top = Math.max(78, this.layoutTop + BATTLE_UI.headerHeight + margin, guideVisible ? this.battleUi.guideRect().y + this.battleUi.guideRect().height + margin : 0);
    const bottom = Math.min(PANEL_Y - margin, this.layoutBottom - 82);
    let best: { score: number; points: Array<{ x: number; y: number }> } | null = null;
    for (const columns of Array.from(new Set([count, Math.ceil(count / 2), 1]))) {
      const rows = Math.ceil(count / columns), groupWidth = columns * width + (columns - 1) * gap;
      const groupHeight = rows * height + (rows - 1) * gap;
      const minX = margin + groupWidth / 2, maxX = W - margin - groupWidth / 2;
      const minY = top + groupHeight / 2, maxY = bottom - groupHeight / 2;
      if (minX > maxX || minY > maxY) continue;
      const clampX = (n: number) => Math.max(minX, Math.min(maxX, n));
      const clampY = (n: number) => Math.max(minY, Math.min(maxY, n));
      const xs = new Set([clampX(x), minX, maxX]);
      const ys = new Set([clampY(y - tileHalf - margin - groupHeight / 2), clampY(y + tileHalf + margin + groupHeight / 2), minY, maxY]);
      for (const spot of this.spots) {
        xs.add(clampX(spot.x - tileHalf - margin - groupWidth / 2)); xs.add(clampX(spot.x + tileHalf + margin + groupWidth / 2));
        ys.add(clampY(spot.y - tileHalf - margin - groupHeight / 2)); ys.add(clampY(spot.y + tileHalf + margin + groupHeight / 2));
      }
      for (const cx of xs) for (const cy of ys) {
        const points = Array.from({ length: count }, (_, i) => ({ x: cx - groupWidth / 2 + width / 2 + (i % columns) * (width + gap), y: cy - groupHeight / 2 + height / 2 + Math.floor(i / columns) * (height + gap) }));
        const overlaps = points.reduce((sum, p) => sum + this.spots.filter(spot => Math.abs(p.x - spot.x) < width / 2 + tileHalf + margin && Math.abs(p.y - spot.y) < height / 2 + tileHalf + margin).length, 0);
        // 优先无格位遮挡，再取距所选格最近的位置；同距优先原有横排。
        const score = overlaps * W * H + Math.hypot(cx - x, cy - y) + (columns === count ? 0 : gap);
        if (!best || score < best.score) best = { score, points };
      }
    }
    const points = best?.points ?? [];
    this.contextPlacement = { key, points };
    return points;
  }

  private buildMenuItems(): Array<{ kind: TowerKind; x: number; y: number }> {
    const spot = this.selectedSpot;
    if (!spot || spot.tower || spot.obstacle) return [];
    const kinds = this.level.availableTowers;
    // 建造菜单只跟随所选格和屏幕边界，不再为避让邻格搜索整张地图。
    const { width, height } = this.battleUi.buildSize();
    const gap = 6, columns = Math.min(4, kinds.length), rowCount = Math.ceil(kinds.length / columns);
    const groupWidth = columns * width + (columns - 1) * gap;
    const groupHeight = rowCount * height + (rowCount - 1) * gap;
    const left = Math.max(gap, Math.min(W - gap - groupWidth, spot.x - groupWidth / 2));
    const topLimit = Math.max(this.layoutTop + BATTLE_UI.headerHeight + gap, this.tutorial.current && this.toastTime <= 0 ? this.battleUi.guideRect().y + this.battleUi.guideRect().height + gap : 0);
    const above = spot.y - BATTLE_UI.minimumHit / 2 - gap - groupHeight;
    const top = above >= topLimit ? above : spot.y + BATTLE_UI.minimumHit / 2 + gap;
    const points = kinds.map((_, i) => ({ x: left + width / 2 + (i % columns) * (width + gap), y: top + height / 2 + Math.floor(i / columns) * (height + gap) }));
    return kinds.map((kind, i) => ({ kind, ...points[i] }));
  }

  private towerMenuItems(tower: Tower): Array<{ action: "upgrade" | "sell"; x: number; y: number }> {
    const points = this.contextMenuPoints(tower.x, tower.y, 2, BATTLE_UI.contextWidth, BATTLE_UI.contextHeight);
    return [{ action: "upgrade", ...points[0] }, { action: "sell", ...points[1] }];
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

  private readUnlockedLevel(): number {
    return getLevelConfig(Math.max(1, Math.min(GAME_CONFIG.maxLevels, PlatformService.getNumber("night_store_unlocked_level", 1)))).id;
  }

  private previewOpen = false;
  private startOfficialLevel(levelId: number, roster?: TowerKind[]): void {
    const level = getLevelConfig(levelId);
    if (level.mode !== "challenge" && level.id > this.readUnlockedLevel()) return;
    this.gmSessionActive = false; this.gmPanelOpen = false;
    const unlocked=this.readUnlockedLevel();this.unlockedLevel=unlocked;
    if(loadoutRule(level.id).enabled==="1"){
      if(!roster||!validLoadout(level.id,unlocked,roster)){this.paused=false;this.screen="home";this.menu?.showPreparation(unlocked,level.id);return;}
      this.resetLevel(level.id,roster);saveLoadout(level.id,unlocked,roster);
    }else this.resetLevel(level.id);
  }

  /** GM明确重置本地进度；不删除其他应用数据或声音偏好。 */
  private resetGmProgress(): void {
    if (!DEBUG) return;
    PlatformService.setNumber("night_store_unlocked_level", 1);
    PlatformService.setNumber("night_store_best_level", 0);
    PlatformService.setNumber("night_store_game_speed", 1);
    for (const row of rows("Tutorial")) PlatformService.setNumber("night_store_tutorial_" + row.id, 0);
    this.collection?.resetGmProgress();resetLoadouts();
    this.gmResetArmed = false; this.gmSessionActive = false; this.gmPanelOpen = false;
    this.gameSpeed = 1; this.unlockedLevel = 1; this.onTouchCancel();
    this.resetLevel(1); this.screen = "home"; this.menu?.show(1, "home", 1);
  }

  private returnHome(): void {
    // 结束本局并定位原关所在页，保留正式进度，不把重玩旧关改成最高关。
    const focus = this.currentLevelId, challenge = this.level.mode === "challenge";
    this.gmSessionActive = false; this.gmPanelOpen = false;
    this.onTouchCancel(); this.unlockedLevel = this.readUnlockedLevel();
    this.resetLevel(this.unlockedLevel); this.screen = "home";
    this.collection?.refresh(this.unlockedLevel);
    this.menu?.show(this.unlockedLevel, challenge ? "home" : "levels", challenge ? this.unlockedLevel : focus);
  }

  private overlayHomeButton(): HitRect {
    const mode = this.paused && this.screen === "playing" ? "pause" : this.screen === "win" ? "win" : this.revived ? "retry" : "lose";
    return this.battleUi.overlayRect("Home", mode);
  }

  private drawOverlay(_g: Graphics): void {
    const mode = this.paused && this.screen === "playing" ? "pause" : this.screen === "win" ? "win" : this.revived ? "retry" : "lose";
    this.battleUi.showOverlay(mode, this.labels);
  }

  private drawGmPanel(_g: Graphics): void {
    if (!DEBUG || this.mapReview) return;
    this.battleUi.showGm(this.gmPanelOpen, this.currentLevelId, this.gmResetArmed);
  }

  private syncLabels(): void {
    const boss = this.enemies.find(enemy => ENEMY_CONFIG[enemy.kind].boss);
    this.showLabel("boss-status", false);
    this.battleUi.showBoss(this.screen === "playing" && !this.paused && !this.gmPanelOpen && !this.adRequesting ? boss ?? null : null,
      this.screen === "playing" && !this.paused && !this.gmPanelOpen && !this.adRequesting ? this.bossCue : null);
    for (const key of this.labels.keys()) if (key.startsWith("home-")) this.showLabel(key, false);
    this.setLabel("level", this.level.mode === "challenge" ? text("challenge.hud") : text("ui.GameRoot.008", this.level.id, this.gmSessionActive && !this.mapReview ? "·GM" : ""));
    this.setLabel("wave", text("ui.GameRoot.009", this.wave, this.level.waves.length));
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
    const showEvolution = contextVisible && this.evolutionTower === this.selectedTower && Boolean(this.selectedTower) && this.towers.includes(this.selectedTower!);
    this.battleUi.showEvolutions(showEvolution ? this.evolutionMenuItems() : [], this.coins);
    const showTowerMenu = contextVisible && Boolean(this.selectedTower) && !showEvolution;
    this.showLabel("context-upgrade", showTowerMenu);
    this.showLabel("context-sell", showTowerMenu);
    if (this.selectedTower && showTowerMenu) {
      const tower = this.selectedTower;
      const items = this.towerMenuItems(tower);
      const upgrade = items.find((item) => item.action === "upgrade")!;
      const sell = items.find((item) => item.action === "sell")!;
      this.setLabelPosition("context-upgrade", upgrade.x, upgrade.y);
      this.setLabelPosition("context-sell", sell.x, sell.y);
      this.setLabel("context-upgrade", tower.evolutionKey ? text("ui.evolution.complete") : tower.level >= globalNumber("maxStaffLevel") ? text("ui.GameRoot.010") : text(this.canEvolve(tower) ? "ui.evolution.button" : "ui.GameRoot.011", this.upgradeCost(tower)));
      this.setLabel("context-sell", text("ui.GameRoot.012", this.sellRefund(tower)));
    }
    const showObstacle = contextVisible && Boolean(this.selectedObstacle);
    this.showLabel("obstacle-info", showObstacle);
    if (this.selectedObstacle && showObstacle) {
      const obstacle = this.selectedObstacle;
      const position = this.obstacleInfoPosition();
      this.setLabelPosition("obstacle-info", position.x, position.y);
      this.setLabel("obstacle-info", text("ui.GameRoot.013", Math.ceil(obstacle.hp), obstacle.reward));
    }
    this.setLabel("prop-freeze", this.propButtonText("freeze"));
    this.setLabel("prop-clear", this.propButtonText("clear"));
    this.setLabel("prop-cash", this.propButtonText("cash"));
    ["prop-freeze", "prop-clear", "prop-cash"].forEach((key) => this.showLabel(key, contextVisible));
    this.showLabel("toast", this.shouldShowToast()); this.setLabel("toast", this.toastText);
    const showWaveCountdown = !this.gmPanelOpen && this.shouldShowWaveCountdown();
    this.showLabel("next-wave-title", showWaveCountdown);
    this.showLabel("next-wave-number", showWaveCountdown);
    this.showLabel("next-wave-action", showWaveCountdown);
    if (showWaveCountdown) {
      const position = this.waveCountdownPosition();
      this.setLabelPosition("next-wave-title", position.x, position.y - 25);
      this.setLabelPosition("next-wave-number", position.x, position.y);
      this.setLabelPosition("next-wave-action", position.x, position.y + 26);
      this.setLabel("next-wave-title", text("ui.GameRoot.014", this.wave + 1, this.level.waves.length));
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
    this.setLabel("overlayHome", this.level.mode === "challenge" ? text("challenge.return") : this.screen === "playing" ? text("ui.GameRoot.015") : text("ui.GameRoot.016"));
    if (this.paused && this.screen === "playing") {
      this.setLabelPosition("overlayPrimary", 195, 381);
      this.setLabel("overlayTitle", text("ui.GameRoot.017")); this.setLabel("overlayStats", ""); this.setLabel("overlayPrimary", text("ui.GameRoot.018"));
      this.setLabel("overlayNote", ""); this.setLabel("overlaySecondary", "");
    } else {
      const win = this.screen === "win";
      this.setLabelPosition("overlayPrimary", 195, win || this.revived ? 420 : 412);
      this.setLabel("overlayTitle", win ? (this.level.mode === "challenge" ? text("challenge.win") : this.level.id === GAME_CONFIG.maxLevels ? text("ui.GameRoot.019") : text("ui.GameRoot.020")) : text("ui.GameRoot.021"));
      this.setLabel("overlayStats", text("result.stats", this.lives, this.level.initialLives,
        (this.level.obstacles?.length ?? 0) - this.obstacles.length, this.level.obstacles?.length ?? 0, this.defeated, this.earned));
      if (win) {
        const progress = this.resultNextLevel ? text("result.open", this.resultNextLevel)
          : this.level.mode === "adventure" && this.level.id === GAME_CONFIG.maxLevels ? text("result.complete")
          : text("result.progress", this.wave, this.level.waves.length);
        const details = [progress];
        if (this.newStaffKinds.length) details.push(text("result.staff", this.newStaffKinds.length));
        if(this.newEvolutionKeys.length)details.push(text("ui.evolution.result",this.newEvolutionKeys.map(key=>evolutionByKey(key)!.name).join("、")));
        if (this.newEncounterKinds.length) details.push(text("result.collection", this.newEncounterKinds.length));
        this.battleUi.showResult(details.join("\n"), [
          ...this.newEvolutionKeys.map(key=>{const e=evolutionByKey(key)!;return {name:e.name,image:"menu:"+e.imageKey};}),
          ...this.newStaffKinds.map(k => ({name:TOWER_CONFIG[k].name,image:"menu:"+k})),
          ...this.newEncounterKinds.map(k => ({name:ENEMY_CONFIG[k].name!,image:"menu:enemy_"+k})),
        ]);
      }
      this.setLabel("overlayPrimary", win ? (this.level.id < GAME_CONFIG.maxLevels ? text("result.next", this.level.id + 1) : text("ui.GameRoot.024")) : !this.revived ? text("ui.GameRoot.025") : text("ui.GameRoot.026"));
      this.setLabel("overlayNote", !win && !this.revived ? (this.adFeedback || text("ui.GameRoot.027")) : "");
      this.setLabel("overlaySecondary", !win && !this.revived ? text("ui.GameRoot.028") : "");
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
    this.setLabel("gm-current", text("ui.GameRoot.029", this.currentLevelId, this.gmSessionActive ? text("ui.GameRoot.extra0") : text("ui.GameRoot.extra1")));
    GM_LEVEL_BUTTONS.forEach((item) => {
      const key = `gm-level-${item.levelId}`;
      this.showLabel(key, this.gmPanelOpen);
      this.setLabel(key, text("ui.GameRoot.030", item.levelId, ""));
      this.setLabelColor(key, item.levelId === this.currentLevelId ? "#6f472f" : "#17352e");
    });
  }

  private propButtonText(kind: PropKind): string {
    const shortName = kind === "freeze" ? text("ui.GameRoot.031") : kind === "clear" ? text("ui.GameRoot.032") : text("ui.GameRoot.033");
    if (this.propCounts[kind] > 0) return `${shortName}×${this.propCounts[kind]}`;
    return this.propAdUsed[kind] ? text("ui.GameRoot.034", shortName) : text("ui.GameRoot.035", shortName);
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
    if (this.battleUi.fixedLabels.has(key)) return;
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

  private resetLevel(levelId?: number, roster?: readonly TowerKind[]): void {
    const retry=levelId===undefined;
    const selection=roster??(retry?this.level.availableTowers:undefined);
    levelId=levelId??this.currentLevelId;this.previewOpen=true;
    this.battleRevision++; this.adFeedback = "";
    this.menu?.hide();
    const base=getLevelConfig(levelId);this.level={...base,availableTowers:[...(selection??base.availableTowers)]}; this.currentLevelId = this.level.id;
    this.coins = this.level.initialCoins; this.lives = this.level.initialLives; this.wave = 0;
    this.inWave = false; this.paused = false; this.screen = "playing"; this.revived = false;
    this.evolutionTower = null; this.newEvolutionKeys = []; this.selectedTower = null; this.selectedSpot = null; this.selectedObstacle = null; this.queue = []; this.spawnTimer = 0;
    this.spawnInterval = 0.78; this.nextWaveTimer = globalNumber("firstWaveDelay"); this.frozenTime = 0; this.adRequesting = false;
    this.propCounts = { freeze: globalNumber("freePropCount"), clear: globalNumber("freePropCount"), cash: globalNumber("freePropCount") }; this.propAdUsed = { freeze: false, clear: false, cash: false };
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
    this.toastText = this.level.mode === "challenge" ? text("challenge.enter") : this.level.id <= 3 ? text("ui.GameRoot.036") : text("ui.GameRoot.037", this.level.id, this.level.title); this.toastTime = 4;
    this.tutorial.reset(this.level.id, !this.gmSessionActive && !this.mapReview && this.level.mode === "adventure" && this.readUnlockedLevel() <= this.level.id);
    this.guideCue = null; this.guidePulse = 0;
    if (this.tutorial.firstWaveDelay !== null) { this.nextWaveTimer = this.tutorial.firstWaveDelay; this.toastTime = 0; }
    this.defeated = 0; this.earned = 0;
    this.impacts = []; this.bossCue = null; this.newEncounterKinds = []; this.newStaffKinds = []; this.resultNextLevel = 0;
    this.damageFlash = 0; this.battleFeedbackTime = 0; this.battleFeedbackText = "";
  }

  private updateGame(dt: number): void {
    this.toastTime = Math.max(0, this.toastTime - dt);
    this.frozenTime = Math.max(0, this.frozenTime - dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt);
    this.battleFeedbackTime = Math.max(0, this.battleFeedbackTime - dt);
    this.towers.forEach((tower) => { tower.recoil = Math.max(0, tower.recoil - dt); });
    // 准备倒计时由update按真实时间推进，不在倍速子步内重复扣减。
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
      for (const [key,effect] of Object.entries(enemy.slows ?? {})) { effect.remaining-=dt; if(effect.remaining<=0)delete enemy.slows![key]; }
      const slowRatio=Math.min(enemy.slow>0?globalNumber("slowSpeedRatio"):1,...Object.values(enemy.slows??{}).map(effect=>effect.ratio));
      enemy.sinceHit = (enemy.sinceHit ?? 0) + dt;
      enemy.markedTime = Math.max(0, (enemy.markedTime ?? 0) - dt);
      if (enemy.burnTime > 0) {
        enemy.hp -= enemy.burnDamage * Math.min(dt, enemy.burnTime);
        enemy.burnTime = Math.max(0, enemy.burnTime - dt); enemy.sinceHit = 0;
        if (enemy.burnTime === 0) enemy.burnDamage = 0;

      }
      if (enemy.hp <= 0) { this.defeatEnemyAt(i); continue; }
      enemy.distance += enemy.speed * (this.frozenTime > 0 ? 0 : slowRatio) * dt;
      const pos = this.pathPosition(enemy.distance); enemy.x = pos.x; enemy.y = pos.y;
      if (pos.done || enemy.distance >= this.pathLength) {
        this.lives -= enemy.damage; this.damageFlash = 0.28; this.audio.play("leak", 0.62);
        this.showBattleFeedback(text("ui.GameRoot.038", enemy.damage), W - 78, 92);
        this.burst(enemy.x, enemy.y, "#eb685d", 14); this.enemies.splice(i, 1);
        if (this.lives <= 0) {
          this.lives = 0; this.screen = "lose"; this.cancelPendingAttacks();
          this.audio.play("lose", 0.82);
          if (!this.gmSessionActive && this.level.mode === "adventure") PlatformService.setMaximumInteger("night_store_best_level", this.level.id, GAME_CONFIG.maxLevels);
          return;
        }
      }
    }

    for (const tower of this.towers) {
      tower.cooldown -= dt;
      if ((tower.burstRemaining ?? 0) > 0) {
        tower.burstTimer = (tower.burstTimer ?? 0) - dt;
        while (tower.burstRemaining! > 0 && tower.burstTimer <= 0) {
          this.fireTower(tower); tower.burstRemaining!--;
          tower.burstTimer += attackProfile(tower.kind,tower.level,tower.evolutionKey).burstGap;
        }
      }
      if (tower.cooldown <= 0 && this.fireTower(tower)) {
        const profile=attackProfile(tower.kind,tower.level,tower.evolutionKey);
        tower.cooldown=profile.rate; tower.burstRemaining=profile.burstCount-1; tower.burstTimer=profile.burstGap;
      }
    }

    for (let i = this.shots.length - 1; i >= 0; i -= 1) {
      const shot = this.shots[i]; shot.age += dt;
      if (!this.targetExists(shot.target)) { this.shots.splice(i, 1); continue; }
      const dx = shot.target.x - shot.x; const dy = shot.target.y - shot.y; const distance = Math.hypot(dx, dy);
      if (distance < shot.target.radius + 6) { this.hit(shot, shot.target); this.shots.splice(i, 1); }
      else { const step=Math.min(distance,shot.speed*dt); shot.x += dx / distance * step; shot.y += dy / distance * step; }
    }

    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 35 * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    if (this.inWave && this.queue.length === 0 && this.enemies.length === 0) {
      this.inWave = false; const bonus = globalNumber("waveBonusBase") + this.wave * globalNumber("waveBonusStep"); this.coins += bonus; this.earned += bonus;
      if (this.wave >= this.level.waves.length) {
        this.screen = "win"; this.cancelPendingAttacks();
        this.audio.play("win", 0.8);
        // GM 选关用于隔离测试，通关不能污染玩家的正式解锁进度。
        if (!this.gmSessionActive && this.level.mode === "adventure") {
          const previous = this.readUnlockedLevel();
          this.collection?.refresh(previous);
          const knownStaff = this.collection?.readState().staff ?? [];
          PlatformService.setMaximumInteger("night_store_unlocked_level", this.currentLevelId + 1, GAME_CONFIG.maxLevels);
          const unlocked = this.readUnlockedLevel();
          this.collection?.refresh(unlocked);
          this.resultNextLevel = unlocked > previous ? unlocked : 0;
          this.newStaffKinds = (this.collection?.readState().staff ?? []).filter(kind => !knownStaff.includes(kind));
        }
      } else {
        // 下一波保留配置的真实秒数，玩家可点击气泡提前开波。
        this.nextWaveTimer = globalNumber("nextWaveDelay");this.previewOpen=true;
        this.showToast(text("ui.GameRoot.039", bonus));
      }
    }
  }

  /** 胜负已确定或复活重开波次时，不能把旧轮次尚未发出的子弹带入下一阶段。 */
  private cancelPendingAttacks(): void {
    for (const tower of this.towers) { tower.burstRemaining = 0; tower.burstTimer = 0; }
  }

  private startWave(): void {
    this.previewOpen=false;
    if (this.inWave || this.wave >= this.level.waves.length) return;
    const config = this.level.waves[this.wave]; this.wave += 1;
    this.queue = [...config.enemies]; this.spawnInterval = config.spawnInterval;
    this.spawnTimer = 0; this.inWave = true; this.showToast(config.announcement ?? text("ui.GameRoot.040", this.wave));
    this.audio.play("wave", 0.58);
  }

  private spawnEnemy(kind: EnemyKind): void {
    // 只记录正式遭遇；GM和地图评审不写图鉴存档。
    if (!this.gmSessionActive && !this.mapReview && this.collection?.encounter(kind)) this.newEncounterKinds.push(kind);
    const base = ENEMY_CONFIG[kind];
    if (base.boss && !this.enemies.some(e => e.kind === kind)) this.bossCue = {kind, defeated:false, time:globalNumber("bossEntranceSeconds")};
    const hp = Math.round(base.hp * this.level.enemyHealthScale * (this.level.waves[Math.max(0, this.wave - 1)]?.healthScale ?? 1) * (1 + (this.wave - 1) * globalNumber("waveHealthGrowth")));
    const start = this.level.pathPoints[0];
    this.enemies.push({ kind, hp, maxHp: hp, speed: base.speed, reward: base.reward, radius: base.radius, color: base.color, damage: base.damage, distance: 0, x: start[0], y: start[1], age: 0, slow: 0, hitFlash: 0, burnTime: 0, burnDamage: 0, markedTime: 0, sinceHit: 0 });
  }

  /** 每次子弹发射重新索敌，连发不会向已死亡目标补伤害。 */
  private fireTower(tower: Tower): boolean {
    const cfg=attackProfile(tower.kind,tower.level,tower.evolutionKey),range=cfg.range;
    const candidates=this.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-tower.x,e.y-tower.y)<=range).sort((a,b)=>b.distance-a.distance);
    const obstacle=this.selectedObstacle && this.obstacles.includes(this.selectedObstacle) && Math.hypot(this.selectedObstacle.x-tower.x,this.selectedObstacle.y-tower.y)<=range ? this.selectedObstacle : null;
    const target:AttackTarget|null=candidates[0]??obstacle;if(!target)return false;
    tower.angle=Math.atan2(target.y-tower.y,target.x-tower.x);
    const targets:AttackTarget[]=this.isEnemy(target)?candidates.slice(0,cfg.targets??1):[target];
    for(const [lane,chosen]of targets.entries())this.shots.push({x:tower.x+(Math.cos(tower.angle)<0?-12:12),y:tower.y-5,target:chosen,kind:tower.kind,level:tower.level,evolutionKey:tower.evolutionKey,speed:cfg.shotSpeed,originX:tower.x,originY:tower.y-5,age:0,lane});
    tower.recoil=0.11;this.audio.play(tower.kind==="frost"?"frost":tower.kind==="bloom"||tower.kind==="ember"?"bloom":"sprout",tower.kind==="bloom"?0.24:0.18);return true;
  }

  private hit(shot: Shot, target: AttackTarget): void {
    const cfg = attackProfile(shot.kind,shot.level,shot.evolutionKey); const damage = cfg.damage;
    if (!this.isEnemy(target)) {
      target.hp -= damage; target.hitFlash = globalNumber("hitFeedbackSeconds");
      this.addImpact(target, shot.kind);
      this.burst(target.x, target.y, cfg.shotColor, shot.kind === "bloom" ? 10 : 5);
      if (target.hp <= 0) this.clearObstacle(target);
      return;
    }
    if (cfg.splash) {
      const splash = cfg.splash; this.tutorial.record("area", shot.kind, this.enemies.filter(enemy => Math.hypot(enemy.x - target.x, enemy.y - target.y) <= splash).length);
      for (const enemy of this.enemies) if (Math.hypot(enemy.x - target.x, enemy.y - target.y) <= cfg.splash) {
        this.damageEnemy(enemy, damage * (enemy === target ? 1 : cfg.splashOuterRatio), shot.kind, shot.level, shot.evolutionKey);
      }
      this.burst(target.x, target.y, cfg.shotColor, 12);
    } else {
      this.damageEnemy(target, damage, shot.kind, shot.level, shot.evolutionKey);
      if (cfg.pierce) {
        const dx = target.x - (shot.originX ?? shot.x), dy = target.y - (shot.originY ?? shot.y);
        const length = Math.max(1, Math.hypot(dx, dy));
        for (const enemy of this.enemies) {
          if (enemy === target) continue;
          const ex = enemy.x - target.x, ey = enemy.y - target.y;
          const forward = (ex * dx + ey * dy) / length;
          if (forward > 0 && forward <= cfg.pierceLength && Math.abs(ex * dy - ey * dx) / length <= enemy.radius + cfg.pierceWidth) {
            this.damageEnemy(enemy, damage * cfg.pierceRatio, shot.kind, shot.level); this.burst(enemy.x, enemy.y, cfg.shotColor, 3);
          }
        }
      }
      if (cfg.chain) {
        const visited = new Set<Enemy>([target]); let last = target;
        for (let hop = 1; hop < cfg.chain; hop++) {
          const next = this.enemies.filter(enemy => !visited.has(enemy) && enemy.hp > 0 && Math.hypot(enemy.x - last.x, enemy.y - last.y) <= cfg.chainRadius)
            .sort((a, b) => Math.hypot(a.x - last.x, a.y - last.y) - Math.hypot(b.x - last.x, b.y - last.y))[0];
          if (!next) break;
          visited.add(next); this.damageEnemy(next, damage * Math.pow(cfg.chainRatio, hop), shot.kind, shot.level);
          this.addImpact(next, shot.kind, last);
          this.burst(next.x, next.y, cfg.shotColor, 4); last = next;
        }
      }
      this.burst(target.x, target.y, cfg.shotColor, 4);
    }
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i]; if (enemy.hp > 0) continue;
      this.defeatEnemyAt(i);
    }
  }

  /** 标记使全队伤害提高25%；灼烧不叠层，只刷新并保留较强伤害。 */
  private damageEnemy(enemy: Enemy, damage: number, kind: TowerKind, level: number, evolutionKey?: string): void {
    const cfg = attackProfile(kind,level,evolutionKey);
    if (cfg.shred) enemy.markedTime = cfg.markSeconds;
    enemy.hp -= damage * (enemy.markedTime > 0 ? globalNumber("markDamageRatio") : 1);
    enemy.hitFlash = globalNumber("hitFeedbackSeconds"); enemy.sinceHit = 0;
    this.addImpact(enemy, kind);
    if (cfg.slow) {
      if (evolutionKey) {
        enemy.slows ??= {}; const old=enemy.slows[evolutionKey];
        enemy.slows[evolutionKey]={ratio:cfg.slowRatio,remaining:Math.max(old?.remaining??0,cfg.slowSeconds)};
      } else enemy.slow = Math.max(enemy.slow, cfg.slowSeconds);
      const partners = this.towers.filter(tower => tower.kind !== kind && Math.hypot(tower.x - enemy.x, tower.y - enemy.y) <= attackProfile(tower.kind,tower.level,tower.evolutionKey).range).map(tower => tower.kind);
      this.tutorial.record("combo", kind, 1, partners);
    }
    if (cfg.burn) {
      // 只在旧效果仍有效时保留较强灼烧；到期后的旧强度不能被新命中重新激活。
      const activeDamage = enemy.burnTime > 0 ? enemy.burnDamage : 0;
      enemy.burnTime = cfg.burnSeconds;
      enemy.burnDamage = Math.max(activeDamage, cfg.burn * (1 + (level - 1) * globalNumber("upgradeDamage")));
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
    this.tutorial.record("clear");
    this.coins += obstacle.reward; this.earned += obstacle.reward;
    this.audio.play("defeat", 0.2); this.burst(obstacle.x, obstacle.y, "#ffc34d", 16);
    this.showBattleFeedback(text("ui.GameRoot.041", obstacle.reward), obstacle.x, obstacle.y - 24);
    if (this.selectedObstacle === obstacle) {
      this.selectedObstacle = null; this.selectedSpot = obstacle.spot;
    }
  }

  private defeatEnemyAt(index: number): void {
    const enemy = this.enemies[index]; if (!enemy) return;
    this.coins += enemy.reward; this.earned += enemy.reward; this.defeated += 1;
    this.audio.play("defeat", 0.26);
    this.burst(enemy.x, enemy.y, "#ffc34d", 14); this.enemies.splice(index, 1);
    if (ENEMY_CONFIG[enemy.kind].boss && !this.enemies.some(e => e.kind === enemy.kind)) this.bossCue = {kind:enemy.kind, defeated:true, time:globalNumber("bossDefeatSeconds")};
  }

  private updateFeedback(dt: number): void {
    for (const target of [...this.enemies, ...this.obstacles]) target.hitFlash = Math.max(0, target.hitFlash - dt);
    for (const impact of this.impacts) impact.life -= dt;
    this.impacts = this.impacts.filter(impact => impact.life > 0);
    if (this.bossCue && (this.bossCue.time -= dt) <= 0) this.bossCue = null;
  }

  private addImpact(target: {x:number;y:number;radius:number}, kind: TowerKind, from?: {x:number;y:number}): void {
    const limit = globalNumber("impactLimit");
    if (this.impacts.length >= limit) this.impacts.splice(0, this.impacts.length - limit + 1);
    this.impacts.push({x:target.x,y:target.y,kind,life:globalNumber("impactSeconds"),radius:target.radius,
      ...(from ? {fromX:from.x,fromY:from.y} : {})});
  }

  private drawImpacts(g: Graphics): void {
    for (const impact of this.impacts) {
      const cfg = TOWER_CONFIG[impact.kind], alpha = Math.max(0, impact.life / globalNumber("impactSeconds"));
      const radius = impact.radius * (1 - alpha / 2), x = impact.x, y = impact.y;
      g.strokeColor = this.color(cfg.shotColor, Math.round(255 * alpha)); g.lineWidth = 2;
      if (impact.fromX !== undefined && impact.fromY !== undefined) {
        // 连锁轨迹连到实际受击目标，不生成额外伤害或改变索敌。
        g.moveTo(impact.fromX, impact.fromY); g.lineTo((impact.fromX+x)/2+4, (impact.fromY+y)/2-4); g.lineTo(x,y); g.stroke();
      } else if (cfg.projectile === "bloom" || cfg.projectile === "ember" || cfg.projectile === "mint") {
        this.ring(g,x,y,radius,cfg.shotColor,alpha,2);
        if (cfg.projectile === "ember") this.disc(g,x,y-4,3,cfg.shotColor,alpha);
        if (cfg.projectile === "mint") { g.moveTo(x-radius,y);g.lineTo(x+radius,y);g.moveTo(x,y-radius);g.lineTo(x,y+radius);g.stroke(); }
      } else {
        const rays = cfg.projectile === "frost" ? 6 : cfg.projectile === "fan" ? 3 : 4;
        for (let i=0;i<rays;i++) { const angle=i*Math.PI*2/rays; g.moveTo(x+Math.cos(angle)*radius/2,y+Math.sin(angle)*radius/2);g.lineTo(x+Math.cos(angle)*radius,y+Math.sin(angle)*radius); }
        g.stroke();
        if (cfg.projectile === "scope") this.ring(g,x,y,radius/2,cfg.shotColor,alpha,1);
      }
    }
  }

  private buildTower(spot: Spot, kind: TowerKind): void {
    if (spot.tower || spot.obstacle) return;
    if (!this.level.availableTowers.includes(kind)) { this.showToast(text("ui.GameRoot.042")); return; }
    const cfg = TOWER_CONFIG[kind];
    if (this.coins < cfg.cost) { this.showToast(text("ui.GameRoot.043")); return; }
    this.coins -= cfg.cost;
    const tower: Tower = { x: spot.x, y: spot.y, kind, level: 1, cooldown: 0, angle: 0, spent: cfg.cost, spot, recoil: 0 };
    spot.tower = tower; this.towers.push(tower); this.burst(spot.x, spot.y, cfg.color, 12);
    this.audio.play("build", 0.64); this.showBattleFeedback(text("ui.GameRoot.044", cfg.name), spot.x, spot.y - 28);
    this.selectedTower = tower; this.selectedSpot = spot; this.selectedObstacle = null;
    this.tutorial.record("deploy", kind);
  }

  private canEvolve(tower: Tower): boolean {
    return !tower.evolutionKey && this.unlockedLevel>=globalNumber("branchUnlockProgress") && (this.level.mode!=="adventure"||this.level.id>=globalNumber("branchAdventureStartLevel"))
      && evolutionChoices(tower.kind).some(e=>e.fromLevel===tower.level);
  }
  private evolutionMenuItems(): Array<{evolution:StaffEvolution;x:number;y:number}> {
    const tower=this.evolutionTower;if(!tower||tower!==this.selectedTower||!this.towers.includes(tower)||!this.canEvolve(tower))return [];
    const choices=evolutionChoices(tower.kind),size=this.battleUi.evolutionSize(),gap=6,total=choices.length*size.width+(choices.length-1)*gap;
    const left=Math.max(gap,Math.min(W-gap-total,tower.x-total/2));
    const topLimit=this.layoutTop+BATTLE_UI.headerHeight+gap,bottom=Math.min(PANEL_Y-gap,this.layoutBottom-82);
    const above=tower.y-BATTLE_UI.minimumHit/2-gap-size.height;
    const top=Math.max(topLimit,Math.min(bottom-size.height,above>=topLimit?above:tower.y+BATTLE_UI.minimumHit/2+gap));
    return choices.map((evolution,i)=>({evolution,x:left+size.width/2+i*(size.width+gap),y:top+size.height/2}));
  }
  private evolveSelected(key: string): void {
    const tower=this.selectedTower,evolution=evolutionByKey(key);
    if(!tower||this.evolutionTower!==tower||!this.towers.includes(tower)||!this.canEvolve(tower)||!evolution||evolution.staffKind!==tower.kind||evolution.fromLevel!==tower.level)return;
    if(this.coins<evolution.cost){this.showToast(text("ui.GameRoot.047"));return;}
    const old=attackProfile(tower.kind,tower.level),fraction=Math.max(0,Math.min(1,tower.cooldown/old.rate));
    this.coins-=evolution.cost;tower.spent+=evolution.cost;tower.level=evolution.toLevel;tower.evolutionKey=key;tower.cooldown=fraction*evolution.rate;
    tower.burstRemaining=0;this.evolutionTower=null;
    if(!this.gmSessionActive&&!this.mapReview&&this.collection?.recordEvolution(key))this.newEvolutionKeys.push(key);
    this.tutorial.record("upgrade",tower.kind,tower.level);this.audio.play("upgrade",0.68);this.burst(tower.x,tower.y,"#ffc34d",18);
    this.showBattleFeedback(text("ui.evolution.name",TOWER_CONFIG[tower.kind].name,evolution.name),tower.x,tower.y-28);
  }

  private upgradeSelected(): void {
    const tower = this.selectedTower; if (!tower) { this.showToast(text("ui.GameRoot.045")); return; }
    if (this.canEvolve(tower)) { this.evolutionTower=tower; return; }
    if (tower.level >= globalNumber("maxStaffLevel")) { this.showToast(text("ui.GameRoot.046", TOWER_CONFIG[tower.kind].name)); return; }
    const cost = this.upgradeCost(tower); if (this.coins < cost) { this.showToast(text("ui.GameRoot.047")); return; }
    this.coins -= cost; tower.spent += cost; tower.level += 1;
    this.tutorial.record("upgrade", tower.kind, tower.level); this.burst(tower.x, tower.y, "#ffc34d", 18);
    this.audio.play("upgrade", 0.68); this.showBattleFeedback(`${TOWER_CONFIG[tower.kind].name} Lv.${tower.level}`, tower.x, tower.y - 28);
  }

  private upgradeCost(tower: Tower): number {
    // 二级为基础造价的 75%，三级为 100%；首关第一波收入刚好能支持一次升级。
    if(this.canEvolve(tower))return evolutionChoices(tower.kind)[0].cost;
    return Math.round(TOWER_CONFIG[tower.kind].cost * (globalNumber("upgradeCostBase") + tower.level * globalNumber("upgradeCostStep")));
  }

  private sellRefund(tower: Tower): number {
    // 出售返还 65% 累计投入，允许转移火力但避免无损反复搬塔成为固定最优解。
    return Math.floor(tower.spent * globalNumber("sellRatio"));
  }

  private sellSelected(): void {
    const tower = this.selectedTower; if (!tower) return;
    const refund = this.sellRefund(tower);
    tower.spot.tower = null; this.towers = this.towers.filter((item) => item !== tower);
    this.coins += refund; this.audio.play("upgrade", 0.45);
    this.burst(tower.x, tower.y, "#ffc34d", 12); this.showBattleFeedback(text("ui.GameRoot.048", refund), tower.x, tower.y - 24);
    this.evolutionTower=null; this.selectedTower = null; this.selectedSpot = tower.spot;
  }

  private useProp(kind: PropKind): void {
    if (this.screen !== "playing" || this.paused || this.adRequesting) return;
    if (this.propCounts[kind] > 0) {
      this.propCounts[kind] -= 1; this.applyProp(kind); return;
    }
    if (this.propAdUsed[kind]) { this.showToast(text("ui.GameRoot.049")); return; }
    void this.usePropWithAd(kind);
  }

  private applyProp(kind: PropKind): void {
    this.audio.play("prop", 0.62);
    if (kind === "freeze") {
      this.frozenTime = Math.max(this.frozenTime, globalNumber("freezeSeconds")); this.showToast(text("ui.GameRoot.050", globalNumber("freezeSeconds"))); return;
    }
    if (kind === "cash") {
      const amount = globalNumber("cashBase") + this.level.id * globalNumber("cashPerLevel"); this.coins += amount; this.earned += amount;
      this.showToast(text("ui.GameRoot.051", amount)); return;
    }
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      if (ENEMY_CONFIG[enemy.kind].clearRatio < 1) {
        enemy.hp -= enemy.maxHp * ENEMY_CONFIG[enemy.kind].clearRatio;
        this.burst(enemy.x, enemy.y, "#ffcf79", 8);
        if (enemy.hp <= 0) this.defeatEnemyAt(i);
      } else this.defeatEnemyAt(i);
    }
    this.showToast(text("ui.GameRoot.052"));
  }

  private async usePropWithAd(kind: PropKind): Promise<void> {
    if (this.adRequesting || this.propAdUsed[kind] || this.screen !== "playing" || this.disposed) return;
    const revision = this.battleRevision;
    this.adRequesting = true; this.showToast(text("ui.GameRoot.053"));
    try {
      const result = await PlatformService.showRewardedVideo(GAME_CONFIG.rewardAdUnitId);
      if (this.disposed || revision !== this.battleRevision || this.screen !== "playing") return;
      // 缺少广告位、模拟结果、取消和失败都不能发放正式道具。
      if (!result.rewarded || result.simulated) { this.showToast(text("ui.GameRoot.054")); return; }
      this.propAdUsed[kind] = true; this.applyProp(kind);
    } catch { if (!this.disposed && revision === this.battleRevision) this.showToast(text("ui.GameRoot.054")); }
    finally { if (revision === this.battleRevision) this.adRequesting = false; }
  }

  private touchPoint(event: EventTouch): { x: number; y: number } {
    const p = event.getUILocation();
    const local = this.contentRoot.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(p.x, p.y));
    return { x: local.x + W / 2, y: H / 2 - local.y };
  }

  private onTouchStart(event: EventTouch): void {
    if (this.mapReview) return;
    this.audio.unlock();
    this.activeTouchIds.add(event.getID());
    // 第二指即使仍留在屏幕上也会锁住后续点击，直到本组触点全部结束。
    if (this.activeTouchIds.size !== 1 || this.touchStart) { this.touchTravelCancelled = true; return; }
    const point = this.touchPoint(event);
    this.touchStart = { x: point.x, y: point.y };
    this.touchId = event.getID(); this.touchTravelCancelled = false;
  }

  private onTouchMove(event: EventTouch): void {
    if (!this.touchStart || event.getID() !== this.touchId) return;
    const point = this.touchPoint(event);
    if (Math.hypot(point.x - this.touchStart.x, point.y - this.touchStart.y) > globalNumber("touchTravelTolerance")) this.touchTravelCancelled = true;
  }

  private onTouchCancel(event?: EventTouch): void {
    if (event) this.activeTouchIds.delete(event.getID()); else this.activeTouchIds.clear();
    this.touchStart = null; this.touchId = null;
    this.touchTravelCancelled = this.activeTouchIds.size > 0;
  }

  private onTouchEnd(event: EventTouch): void {
    if (this.mapReview) return;
    this.activeTouchIds.delete(event.getID());
    if (event.getID() !== this.touchId) {
      if (!this.activeTouchIds.size) this.onTouchCancel();
      return;
    }
    const point = this.touchPoint(event);
    const start = this.touchStart;
    const cancelled = this.touchTravelCancelled || this.activeTouchIds.size > 0;
    this.touchStart = null; this.touchId = null;
    this.touchTravelCancelled = this.activeTouchIds.size > 0;
    if (!start || cancelled || Math.hypot(point.x - start.x, point.y - start.y) > globalNumber("touchTravelTolerance")) return;
    this.handlePress(point.x, point.y);
  }

  private handlePress(x: number, y: number): void {
    if (this.mapReview) return;
    if (x < 0 || x > W || y < this.layoutTop || y > this.layoutBottom || this.adRequesting) return;
    if (DEBUG && !this.gmPanelOpen && this.buttonHit(this.footerRect(GM_BUTTON), x, y)) {
      this.gmResetArmed = false; this.gmPanelOpen = true; return;
    }
    if (DEBUG && this.gmPanelOpen) {
      if (this.buttonHit(this.battleUi.gmRect("Reset"), x, y)) {
        if (this.gmResetArmed) this.resetGmProgress(); else this.gmResetArmed = true;
        return;
      }
      this.gmResetArmed = false;
      if (this.buttonHit(this.battleUi.gmRect("Close"), x, y)) { this.gmPanelOpen = false; return; }
      if (this.buttonHit(this.battleUi.gmRect("Home"), x, y)) {
        this.returnHome(); return;
      }
      const commands = ["enemies", "bosses", "staff", "all", "restore"] as const;
      const command = commands.find(key => this.buttonHit(this.battleUi.gmRect("Collection-" + key), x, y));
      if (command) {
        this.collection?.setGmPreview(command === "restore" ? null : command);
        this.returnHome();
        this.menu?.showCollection(this.unlockedLevel, command === "all" || command === "restore" ? "enemies" : command);
        return;
      }
      const levelButton = GM_LEVEL_BUTTONS.find((item) => this.buttonHit(this.battleUi.gmRect("Level" + item.levelId), x, y));
      if (levelButton) {
        this.gmSessionActive = true; this.gmPanelOpen = false; this.resetLevel(levelButton.levelId); return;
      }
      // 面板外点击仅关闭 GM，不把同一次点击传递给战斗，防止误建造或误用道具。
      if (!containsPoint(this.battleUi.gmRect("Panel"), x, y)) this.gmPanelOpen = false;
      return;
    }
    if (this.screen === "home") { this.menu?.press(x, y); return; }
    if ((this.paused || this.screen !== "playing") && this.buttonHit(this.overlayHomeButton(), x, y)) {
      this.returnHome(); return;
    }
    if (this.screen === "playing") {
      if (this.buttonHit(this.headerRect(BATTLE_UI.pause), x, y)) { this.paused = !this.paused; return; }
      if (this.buttonHit(this.headerRect(BATTLE_UI.speed), x, y)) { this.cycleGameSpeed(); return; }
    }
    if (this.paused && this.screen === "playing") {
      if (this.buttonHit(this.battleUi.overlayRect("Primary", "pause"), x, y)) this.paused = false;
      return;
    }
    if (this.screen === "lose") {
      if (!this.revived && this.buttonHit(this.battleUi.overlayRect("Primary", "lose"), x, y)) void this.reviveWithAd();
      else if (!this.revived && this.buttonHit(this.battleUi.overlayRect("Secondary", "lose"), x, y)) this.resetLevel();
      else if (this.revived && this.buttonHit(this.battleUi.overlayRect("Primary", "retry"), x, y)) this.resetLevel();
      return;
    }
    if (this.screen === "win") { if (this.buttonHit(this.battleUi.overlayRect("Primary", "win"), x, y)) this.advanceLevel(); return; }

    if(this.previewVisible()&&(containsPoint(this.battleUi.previewEntryRect(),x,y)||containsPoint(this.battleUi.waveLabelRect(),x,y))){this.previewOpen=!this.previewOpen;return;}
    if(this.previewOpen&&this.previewVisible()&&containsPoint(this.battleUi.previewRect(),x,y)){this.previewOpen=false;return;}
    this.previewOpen=false;
    if(this.evolutionTower){
      const choice=this.evolutionMenuItems().find(item=>containsPoint(this.battleUi.evolutionRect(item.evolution.key),x,y));
      if(choice){this.evolveSelected(choice.evolution.key);return;}
      this.evolutionTower=null;
      // 空白处关闭；仍允许本次点击切换到其他格位。
      this.selectedTower=null;this.selectedSpot=null;this.selectedObstacle=null;
    }
    // 先处理塔位旁的上下文按钮，避免点到按钮时被下方建造单元再次选中。
    if (this.selectedTower) {
      const item = this.towerMenuItems(this.selectedTower).find((candidate) => containsPoint(this.battleUi.contextRect(candidate.action), x, y));
      if (item) {
        if (item.action === "upgrade") this.upgradeSelected(); else this.sellSelected();
        return;
      }
    } else if (this.selectedSpot && !this.selectedSpot.tower && !this.selectedSpot.obstacle) {
      const buildItem = this.buildMenuItems().find((item) => containsPoint(this.battleUi.contextRect(item.kind), x, y));
      if (buildItem) { this.buildTower(this.selectedSpot, buildItem.kind); return; }
    }

    const button = PROP_BUTTONS.find((item) => this.buttonHit(this.footerRect(item), x, y));
    if (button) { this.useProp(button.kind); return; }

    if (this.shouldShowWaveCountdown()) {
      const bubble = this.waveCountdownPosition();
      if (containsPoint({x:bubble.x-56,y:bubble.y-40,width:112,height:84},x,y)) {
        this.startWave(); this.selectedSpot = null; this.selectedTower = null; this.selectedObstacle = null; return;
      }
    }
    // 边缘格位把方形热区夹在可视边界内，保证不因一半热区在屏幕外而难以点中。
    const spot = this.spots.filter((item) => containsPoint({
      x: Math.max(0, Math.min(W - this.hitSize, item.x - this.hitSize / 2)),
      y: item.y - this.hitSize / 2, width: this.hitSize, height: this.hitSize,
    }, x, y)).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
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
    const next = this.level.mode === "adventure" && this.currentLevelId < GAME_CONFIG.maxLevels ? this.currentLevelId + 1 : this.currentLevelId;
    if(this.gmSessionActive)this.resetLevel(next);else if(next===this.currentLevelId)this.resetLevel();else this.startOfficialLevel(next);
  }

  private async reviveWithAd(): Promise<void> {
    if (this.revived || this.adRequesting || this.screen !== "lose" || this.disposed) return;
    const revision = this.battleRevision;
    this.adRequesting = true; this.adFeedback = text("ui.GameRoot.055");
    try {
      const result = await PlatformService.showRewardedVideo(GAME_CONFIG.rewardAdUnitId);
      if (this.disposed || revision !== this.battleRevision || this.screen !== "lose") return;
      if (!result.rewarded || result.simulated) { this.adFeedback = text("ui.GameRoot.056"); return; }
      // 复活保留布阵，清除当前波对象并重打本波，迟到回调不能复活另一局。
      this.revived = true; this.lives = Math.max(globalNumber("reviveMinLives"), Math.ceil(this.level.initialLives * globalNumber("reviveLifeRatio")));
      this.screen = "playing"; this.enemies = []; this.shots = []; this.queue = [];
      this.cancelPendingAttacks(); this.bossCue = null; this.impacts = []; this.particles = [];
      this.damageFlash = 0; this.battleFeedbackTime = 0;
      this.inWave = false; this.wave = Math.max(0, this.wave - 1); this.nextWaveTimer = globalNumber("reviveWaveDelay");this.previewOpen=true;
      this.showToast(text("ui.GameRoot.057"));
    } catch { if (!this.disposed && revision === this.battleRevision) this.adFeedback = text("ui.GameRoot.056"); }
    finally { if (revision === this.battleRevision) this.adRequesting = false; }
  }

  private showToast(value: string): void { this.toastText = value; this.toastTime = globalNumber("toastSeconds"); }

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
