import { Color, Graphics, Node, UITransform } from "cc";
import { globalString, text } from "../config/ConfigTables";
import { GAME_CONFIG, ENEMY_CONFIG } from "../gameplay/battle/GameConfig";
import { getLevelConfig } from "../gameplay/battle/LevelConfig";
import { levelTheme } from "../gameplay/battle/LevelTheme";
import { COLLECTION_ENTRIES, COLLECTION_TABS, CollectionEntry, CollectionProgress, CollectionTab } from "../gameplay/battle/CollectionData";
import { AudioService } from "../services/AudioService";
import { PlatformSettings } from "../services/PlatformSettings";
import { UiPrefabs, uiNode, uiText, uiRect, uiColor } from "./UiPrefabs";

type MenuPage = "home" | "levels" | "collection" | "settings";
type Dialog = { kind: "entry"; entry: CollectionEntry } | { kind: "notice"; title: string; text: string };
const W = GAME_CONFIG.prototypeLayoutWidth, H = GAME_CONFIG.prototypeLayoutHeight;

/** 固定布局属于 prefab；本类只负责状态、数据绑定和既有触控入口的分派。 */
export class PrefabGameMenuView {
  private readonly root: Node;
  private readonly pages = new Map<MenuPage, Node>();
  private readonly dialogs = new Map<string, Node>();
  private readonly levelCards: Node[] = [];
  private readonly collectionCards: Node[] = [];
  private readonly actions = new Map<Node, () => void>();
  private readonly modalActions = new Map<Node, () => void>();
  private readonly routeColors = new WeakMap<Node, Color>();
  private readonly platform = new PlatformSettings();
  private page: MenuPage = "home";
  private tab: CollectionTab = "enemies";
  private levelPage = 0;
  private collectionPage = 0;
  private unlocked = 1;
  private dialog: Dialog | null = null;
  private dirty = true;
  private disposed = false;
  private active = false;
  private platformBusy = false;
  private navigationRevision = 0;
  private top = 0;
  private bottom = H;

  constructor(private readonly parent: Node, private readonly assets: UiPrefabs, private readonly audio: AudioService,
    private readonly collection: CollectionProgress, private readonly startLevel: (id: number) => void) {
    this.root = assets.create("menu_shell", parent);
    for (const key of ["home", "levels", "collection", "settings"] as MenuPage[]) {
      const node = assets.create(key, uiNode(this.root, "Pages")); this.pages.set(key, node); node.active = false;
    }
    for (const key of ["notice", "detail"]) { const node = assets.create(key, uiNode(this.root, "Dialogs")); this.dialogs.set(key, node); node.active = false; }
    for (const slot of uiNode(this.pages.get("levels")!, "Cards").children) this.levelCards.push(assets.create("level_card", slot));
    for (const slot of uiNode(this.pages.get("collection")!, "Cards").children) this.collectionCards.push(assets.create("collection_card", slot));
    void this.platform.refresh().then(() => { if (!this.disposed) this.dirty = true; });
    this.root.active = false;
  }
  show(unlocked: number, page: MenuPage = "home"): void {
    this.navigationRevision++; this.unlocked = getLevelConfig(unlocked).id; this.collection.refresh(this.unlocked);
    this.page = page; this.levelPage = Math.floor((this.unlocked - 1) / this.levelCards.length);
    this.dialog = null; this.active = true; this.root.active = true; this.dirty = true;
  }
  hide(): void { if (!this.active) return; this.navigationRevision++; this.active = false; this.root.active = false; this.dialog = null; }
  render(unlocked: number, top: number, bottom: number): void {
    if (!this.active || this.disposed) return;
    if (this.top !== top || this.bottom !== bottom) {
      this.top = top; this.bottom = bottom;
      const scale = Math.min(1, Math.max(0.5, (bottom - top) / H));
      const offset = top + ((bottom - top) - H * scale) / 2;
      this.root.setScale(scale, scale, 1); this.root.setPosition(0, H / 2 - offset - H * scale / 2);
      // 只有全屏遮罩随视口拉伸，页面内容保持预制体中的比例与位置。
      const visibleTop = (top - offset) / scale, visibleBottom = (bottom - offset) / scale;
      for (const n of [uiNode(this.root, "Backdrop"), ...Array.from(this.dialogs.values()).map(n => uiNode(n, "Dim"))]) {
        n.getComponent(UITransform)!.height = visibleBottom - visibleTop;
        n.setPosition(n.position.x, H / 2 - (visibleTop + visibleBottom) / 2);
      }
      this.dirty = true;
    }
    if (unlocked !== this.unlocked) { this.unlocked = getLevelConfig(unlocked).id; this.collection.refresh(this.unlocked); this.dirty = true; }
    if (!this.dirty) return;
    this.dirty = false; this.actions.clear(); this.modalActions.clear();
    for (const [key, node] of this.pages) node.active = key === this.page;
    const page = this.pages.get(this.page)!;
    if (this.page !== "home") this.bind(page, "Back", () => this.navigate("home"));
    if (this.page === "home") this.home(page);
    else if (this.page === "levels") this.levels(page);
    else if (this.page === "collection") this.collectionPageView(page);
    else this.settings(page);
    this.renderDialog();
  }
  press(x: number, y: number): void {
    if (!this.active || this.disposed) return;
    // 共用游戏的主指/移动取消逻辑，预制体按钮不另注册第二条触摸处理链。
    const actions = this.dialog ? this.modalActions : this.actions;
    for (const [node, action] of actions) {
      if (!node.activeInHierarchy) continue;
      const rect = uiRect(node, this.parent, W, H);
      if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
        this.audio.play("build", 0.24); action(); this.dirty = true; return;
      }
    }
  }
  destroy(): void { this.disposed = true; this.active = false; this.actions.clear(); this.modalActions.clear(); this.root.destroy(); }
  private bind(root: Node, path: string, action: () => void, modal = false): void { (modal ? this.modalActions : this.actions).set(path ? uiNode(root, path) : root, action); }
  private navigate(page: MenuPage): void { this.navigationRevision++; this.page = page; this.dialog = null; this.dirty = true; }
  private notice(title: string, content: string): void { this.dialog = { kind: "notice", title, text: content }; this.dirty = true; }
  private home(page: Node): void {
    uiText(page, "Brand", GAME_CONFIG.gameName);
    uiText(page, "Adventure/Note", text("ui.GameMenuView.004", this.unlocked, GAME_CONFIG.maxLevels));
    this.bind(page, "Settings", () => this.navigate("settings"));
    this.bind(page, "Adventure", () => this.navigate("levels"));
    this.bind(page, "Challenge", () => this.notice(text("ui.GameMenuView.007"), text("ui.GameMenuView.008")));
    this.bind(page, "Collection", () => { this.collection.refresh(this.unlocked); this.navigate("collection"); });
    const side = this.platform.capabilities.sidebar;
    uiNode(page, "Sidebar").active = side; uiNode(page, "Footer").active = !side;
    if (side) this.bind(page, "Sidebar", () => {
      if (this.platformBusy) return;
      this.platformBusy = true; const revision = this.navigationRevision;
      void this.platform.openSidebar().then(result => {
        this.platformBusy = false;
        if (!this.disposed && this.active && this.page === "home" && revision === this.navigationRevision && !this.dialog && !result.ok) this.notice(text("ui.GameMenuView.012"), result.message);
      });
    });
  }
  private pagination(page: Node, index: number, total: number, previous: () => void, next: () => void): void {
    uiText(page, "Pagination", `${index + 1} / ${total}`);
    // 禁用态保留位置与文字，用预制体的禁用外观呈现。
    this.buttonEnabled(page, "Previous", index > 0); this.buttonEnabled(page, "Next", index < total - 1);
    if (index > 0) this.bind(page, "Previous", previous);
    if (index < total - 1) this.bind(page, "Next", next);
  }
  private buttonEnabled(page: Node, name: string, enabled: boolean): void {
    const node = uiNode(page, name), disabled = node.getChildByName("Disabled");
    if (disabled) disabled.active = !enabled;
    const disabledText = node.getChildByName("DisabledText");
    if (disabledText) { disabledText.active = !enabled; uiNode(node, "Text").active = enabled; }
  }
  private levels(page: Node): void {
    uiText(page, "Note", text("ui.GameMenuView.016", this.unlocked, GAME_CONFIG.maxLevels));
    const count = this.levelCards.length;
    for (let i = 0; i < count; i++) {
      const card = this.levelCards[i], id = this.levelPage * count + i + 1;
      card.active = id <= GAME_CONFIG.maxLevels; if (!card.active) continue;
      const level = getLevelConfig(id), unlocked = id <= this.unlocked, theme = levelTheme(level);
      uiNode(card, "Unlocked").active = unlocked; uiNode(card, "Locked").active = !unlocked; uiNode(card, "Lock").active = !unlocked;
      uiText(card, "Theme", theme.name); uiText(card, "Number", String(id).padStart(2, "0")); uiText(card, "Title", level.title);
      const kinds = level.waves.flatMap(w => w.enemies);
      const category = kinds.some(k => ENEMY_CONFIG[k].boss === "major") ? text("ui.GameMenuView.extra0") : kinds.some(k => ENEMY_CONFIG[k].boss === "mini") ? text("ui.GameMenuView.extra1") : text("ui.GameMenuView.extra2");
      uiText(card, "State", unlocked ? text("ui.GameMenuView.017", category, level.waves.length) : text("ui.GameMenuView.018", id - 1));
      uiText(card, "LockedState", text("ui.GameMenuView.018", id - 1));
      uiNode(card, "LockedState").active = !unlocked; uiNode(card, "State").active = unlocked;
      uiColor(card, "Thumbnail", theme.ground);
      uiNode(card, "LockedThumbnail").active = !unlocked;
      this.routePreview(card, level, unlocked);
      this.bind(card, "", () => {
        if (id > this.unlocked) this.notice(text("ui.GameMenuView.019"), text("ui.GameMenuView.020", id - 1));
        else this.startLevel(id);
      });
    }
    this.pagination(page, this.levelPage, Math.ceil(GAME_CONFIG.maxLevels / count), () => { this.levelPage--; }, () => { this.levelPage++; });
  }
  private routePreview(card: Node, level: ReturnType<typeof getLevelConfig>, unlocked: boolean): void {
    const route = uiNode(card, "Route"), t = route.getComponent(UITransform)!, g = route.getComponent(Graphics)!;
    const projection = uiNode(route, "Projection");
    const project = ([x, y]: readonly number[]) => [projection.position.x + x * projection.scale.x, projection.position.y + y * projection.scale.y];
    if (!this.routeColors.has(route)) this.routeColors.set(route, g.strokeColor.clone());
    g.clear(); if (unlocked) Color.fromHEX(g.strokeColor, levelTheme(level).road); else g.strokeColor = this.routeColors.get(route)!.clone(); g.lineCap = Graphics.LineCap.ROUND; g.lineJoin = Graphics.LineJoin.ROUND;
    level.pathPoints.forEach((point, i) => { const [x, y] = project(point); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke();
    for (const point of level.towerSpots) { const [x, y] = project(point); g.circle(x, y, g.lineWidth * 0.22); g.fill(); }
    const [x, y] = project(level.pathPoints[level.pathPoints.length - 1]); uiNode(route, "ShopMarker").setPosition(x, y);
  }
  private collectionPageView(page: Node): void {
    for (const tab of COLLECTION_TABS) {
      const name = "Tab-" + tab.id, selected = this.tab === tab.id;
      uiNode(page, name + "/Selected").active = selected; uiNode(page, name + "/Normal").active = !selected;
      uiText(page, name + "/Text", text("ui.GameMenuView.025", tab.label));
      this.bind(page, name, () => { this.tab = tab.id; this.collectionPage = 0; });
    }
    const entries = COLLECTION_ENTRIES.filter(item => item.tab === this.tab), count = this.collectionCards.length;
    const pages = Math.max(1, Math.ceil(entries.length / count)); this.collectionPage = Math.max(0, Math.min(this.collectionPage, pages - 1));
    this.collectionCards.forEach((card, i) => {
      const entry = entries[this.collectionPage * count + i]; card.active = Boolean(entry); if (!entry) return;
      const unlocked = this.collection.isUnlocked(entry);
      uiNode(card, "Unlocked").active = unlocked; uiNode(card, "Locked").active = !unlocked;
      uiNode(card, "LockedPortraitBackground").active = !unlocked;
      this.assets.bindImage(uiNode(card, "Portrait"), "menu:" + entry.imageKey, !unlocked);
      uiText(card, "Name", unlocked ? entry.name : text("ui.unknown"));
      this.bind(card, "", () => { this.dialog = { kind: "entry", entry }; });
    });
    uiText(page, "Count", text("ui.GameMenuView.026", entries.filter(e => this.collection.isUnlocked(e)).length, entries.length));
    this.pagination(page, this.collectionPage, pages, () => { this.collectionPage--; }, () => { this.collectionPage++; });
  }
  private settings(page: Node): void {
    for (const [name, enabled, action] of [
      ["Music", this.audio.musicEnabled, () => this.audio.setMusicEnabled(!this.audio.musicEnabled)],
      ["Effects", this.audio.effectsEnabled, () => this.audio.setEffectsEnabled(!this.audio.effectsEnabled)],
    ] as Array<[string, boolean, () => void]>) {
      uiNode(page, name + "/On").active = enabled; uiNode(page, name + "/Off").active = !enabled; this.bind(page, name, action);
    }
    uiText(page, "Version", text("ui.GameMenuView.033", GAME_CONFIG.gameName, globalString("version")));
  }
  private renderDialog(): void {
    for (const node of this.dialogs.values()) node.active = false;
    const dialog = this.dialog; if (!dialog) return;
    const page = this.dialogs.get(dialog.kind === "notice" ? "notice" : "detail")!; page.active = true;
    this.bind(page, "Close", () => { this.dialog = null; }, true);
    if (dialog.kind === "notice") { uiText(page, "Title", dialog.title); uiText(page, "Body", dialog.text); return; }
    const entry = dialog.entry, unlocked = this.collection.isUnlocked(entry);
    uiText(page, "Title", unlocked ? entry.name : text("ui.GameMenuView.036"));
    this.assets.bindImage(uiNode(page, "Portrait"), "menu:" + entry.imageKey, !unlocked);
    uiNode(page, "Known").active = unlocked; uiNode(page, "Unknown").active = !unlocked;
    uiText(page, "Unknown/Hint", entry.unlockHint);
    if (unlocked) {
      uiText(page, "Known/Category", entry.category); uiText(page, "Known/Traits", entry.traits);
      uiText(page, "Known/Stats", entry.stats.map((item, i) => `${i === 2 ? "\n" : i ? "   " : ""}${item.label} ${item.value}`).join(""));
      uiText(page, "Known/Note", entry.statNote); uiText(page, "Known/Story", entry.story);
    }
  }
}
