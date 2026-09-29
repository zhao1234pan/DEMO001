import { Color, Graphics, HorizontalTextAlignment, Label, Layers, Node, UITransform, VerticalTextAlignment } from "cc";
import { GAME_CONFIG } from "./GameConfig";
import { getLevelConfig } from "./LevelConfig";
import { COLLECTION_ENTRIES, COLLECTION_TABS, CollectionEntry, CollectionProgress, CollectionTab } from "./CollectionData";
import { MenuArtView, MenuIconKind } from "./MenuArtView";
import { AudioService } from "../../services/AudioService";
import { PlatformSettings } from "../../services/PlatformSettings";

export type MenuPage = "home" | "levels" | "collection" | "settings";
interface Rect { x: number; y: number; width: number; height: number; }
interface MenuButton extends Rect { id: string; action: () => void; }
interface TextLayer { root: Node; labels: Map<string, Label>; used: Set<string>; }
type Dialog = { kind: "entry"; entry: CollectionEntry } | { kind: "notice"; title: string; text: string };
const W = GAME_CONFIG.prototypeLayoutWidth;
const H = GAME_CONFIG.prototypeLayoutHeight;
const C = { ink: "#294e43", paper: "#fff7df", muted: "#75836d", orange: "#ed9659", green: "#416d53", pale: "#e5ebce" };

/** 菜单拥有独立绘制、文本和命中层；只有状态变化时重画，弹窗独占输入。 */
export class GameMenuView {
  private readonly root: Node;
  private readonly background: Graphics;
  private readonly art: MenuArtView;
  private readonly textLayer: TextLayer;
  private readonly modalRoot: Node;
  private readonly modal: Graphics;
  private readonly modalArt: MenuArtView;
  private readonly modalText: TextLayer;
  private readonly platform = new PlatformSettings();
  private readonly buttons: MenuButton[] = [];
  private readonly modalButtons: MenuButton[] = [];
  private page: MenuPage = "home";
  private tab: CollectionTab = "enemies";
  private levelPage = 0;
  private unlocked = 1;
  private dialog: Dialog | null = null;
  private dirty = true;
  private disposed = false;
  private scale = 1;
  private offsetY = 0;
  private visibleTop = 0;
  private visibleBottom = H;
  private active = false;
  private platformBusy = false;
  private navigationRevision = 0;

  constructor(parent: Node, private readonly audio: AudioService, private readonly collection: CollectionProgress,
    private readonly startLevel: (id: number) => void) {
    this.root = this.node("GameMenu", parent);
    this.background = this.graphics("MenuBackground", this.root);
    this.art = new MenuArtView(this.root, W, H);
    this.textLayer = this.textRoot("MenuLabels", this.root);
    this.modalRoot = this.node("MenuModal", this.root);
    this.modal = this.graphics("ModalBackground", this.modalRoot);
    this.modalArt = new MenuArtView(this.modalRoot, W, H);
    this.modalText = this.textRoot("ModalLabels", this.modalRoot);
    const redraw = (): void => { if (!this.disposed) this.dirty = true; };
    void this.art.load().then(redraw);
    void this.modalArt.load().then(redraw);
    void this.platform.refresh().then(redraw);
    this.root.active = false;
  }

  show(unlocked: number, page: MenuPage = "home"): void {
    this.navigationRevision++;
    this.unlocked = getLevelConfig(unlocked).id;
    this.collection.refresh(this.unlocked);
    this.page = page;
    this.levelPage = Math.floor((this.unlocked - 1) / 4);
    this.dialog = null;
    this.active = true;
    this.root.active = true;
    this.dirty = true;
  }

  hide(): void { this.navigationRevision++; this.active = false; this.root.active = false; this.dialog = null; }

  render(unlocked: number, top: number, bottom: number): void {
    if (!this.active || this.disposed) return;
    const scale = Math.min(1, Math.max(0.5, (bottom - top) / H));
    const offset = top + ((bottom - top) - H * scale) / 2;
    const visibleTop = (top - offset) / scale;
    const visibleBottom = (bottom - offset) / scale;
    if (visibleTop !== this.visibleTop || visibleBottom !== this.visibleBottom) {
      this.visibleTop = visibleTop; this.visibleBottom = visibleBottom; this.dirty = true;
    }
    if (scale !== this.scale || offset !== this.offsetY) {
      this.scale = scale; this.offsetY = offset;
      this.root.setScale(scale, scale, 1);
      this.root.setPosition(0, H / 2 - offset - H * scale / 2);
      this.dirty = true;
    }
    if (unlocked !== this.unlocked) { this.unlocked = getLevelConfig(unlocked).id; this.collection.refresh(this.unlocked); this.dirty = true; }
    if (!this.dirty) return;
    this.dirty = false;
    this.buttons.length = 0; this.modalButtons.length = 0;
    this.background.clear(); this.modal.clear();
    this.textLayer.used.clear(); this.modalText.used.clear();
    this.art.beginFrame(); this.modalArt.beginFrame();
    this.drawBackground();
    if (this.page === "home") this.drawHome();
    else if (this.page === "levels") this.drawLevels();
    else if (this.page === "collection") this.drawCollection();
    else this.drawSettings();
    this.modalRoot.active = Boolean(this.dialog);
    if (this.dialog) this.drawDialog(this.dialog);
    this.art.endFrame(); this.modalArt.endFrame();
    for (const layer of [this.textLayer, this.modalText]) for (const [key, label] of layer.labels) label.node.active = layer.used.has(key);
  }

  press(x: number, y: number): void {
    if (!this.active || this.disposed) return;
    x = (x - W / 2) / this.scale + W / 2;
    y = (y - this.offsetY) / this.scale;
    // 不扩大相邻卡片的热区；显示与点击使用同一矩形，弹窗开启时整页被拦截。
    const buttons = this.dialog ? this.modalButtons : this.buttons;
    const hit = buttons.find(rect => x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height);
    if (hit) { this.audio.play("build", 0.24); hit.action(); this.dirty = true; }
  }

  destroy(): void {
    this.disposed = true; this.active = false;
    this.art.destroy(); this.modalArt.destroy(); this.root.destroy();
    this.buttons.length = 0; this.modalButtons.length = 0;
  }

  private navigate(page: MenuPage): void { this.navigationRevision++; this.page = page; this.dialog = null; this.dirty = true; }
  private notice(title: string, text: string): void { this.dialog = { kind: "notice", title, text }; this.dirty = true; }

  private drawBackground(): void {
    const g = this.background;
    this.box(g, 0, this.visibleTop, W, this.visibleBottom - this.visibleTop, 0, "#244d43");
    this.disc(g, 336, 93, 48, "#395d4a"); this.disc(g, 325, 79, 18, "#f5df9d");
    [[26, 111], [62, 48], [276, 45], [350, 186], [39, 245]].forEach(([x, y]) => this.disc(g, x, y, 2, "#b2bf80"));
    for (let i = 0; i < 7; i++) this.disc(g, i * 72 - 20, H - 18, 64, i % 2 ? "#34593f" : "#2d573f");
    if (this.page !== "home") this.box(g, 14, 88, 362, 540, 25, C.paper);
  }

  private drawHome(): void {
    const g = this.background;
    this.label("brand-small", "森林便利店", 13, 195, 48, 160, 26, "#e3d6a7");
    this.label("brand", GAME_CONFIG.gameName, 30, 195, 91, 326, 48, "#fff4ce");
    this.label("brand-note", "灯亮着，夜班就开始了", 14, 195, 130, 290, 30, "#c9d4ab");
    this.button("settings", { x: 330, y: 16, width: 48, height: 48 }, () => this.navigate("settings"));
    this.disc(g, 354, 40, 24, "#406453"); this.gear(g, 354, 40);
    this.disc(g, 195, 283, 118, "#385f4d");
    this.box(g, 65, 295, 260, 49, 25, "#7e9470");
    this.art.drawIcon("hero-tree-l", "tree", 52, 264, 115);
    this.art.drawIcon("hero-tree-r", "tree", 342, 264, 115);
    this.art.drawIcon("hero-shop", "shop", 193, 244, 230);
    this.art.drawIcon("hero-frost", "frost", 108, 315, 83);
    this.art.drawIcon("hero-bloom", "bloom", 279, 315, 83);
    this.art.drawIcon("hero-sprout", "sprout", 192, 326, 94);
    this.homeButton("adventure", 382, "冒险模式", `已解锁 ${this.unlocked} / ${GAME_CONFIG.maxLevels} 关`, C.orange, () => this.navigate("levels"));
    this.homeButton("challenge", 463, "挑战模式", "暂未开放", "#91aa8c", () => this.notice("挑战模式", "挑战模式暂未开放。"));
    this.homeButton("collection", 544, "游戏图鉴", "怪物 · BOSS · 店员", "#edcf84", () => { this.collection.refresh(this.unlocked); this.navigate("collection"); });
    const side = this.platform.capabilities.sidebar;
    if (side) {
      this.label("sidebar", "侧边栏再玩", 13, 195, 657, 200, 36, "#efe6bd");
      this.button("sidebar", { x: 95, y: 632, width: 200, height: 48 }, () => {
        if (this.platformBusy) return;
        this.platformBusy = true;
        const revision = this.navigationRevision;
        void this.platform.openSidebar().then(result => {
          this.platformBusy = false;
          if (!this.disposed && this.active && this.page === "home" && revision === this.navigationRevision && !this.dialog && !result.ok) this.notice("侧边栏再玩", result.message);
        });
      });
    } else this.label("home-footer", "欢迎回来，店长", 13, 195, 657, 260, 28, "#bdcea8");
  }

  private homeButton(id: string, y: number, title: string, subtitle: string, color: string, action: () => void): void {
    this.card(this.background, 42, y, 306, 68, color, 18);
    this.label(`${id}-title`, title, 23, 195, y + 25, 250, 32, C.ink);
    this.label(`${id}-note`, subtitle, 13, 195, y + 51, 262, 24, C.ink);
    this.button(id, { x: 42, y, width: 306, height: 68 }, action);
  }

  private header(title: string, note: string): void {
    this.card(this.background, 15, 22, 52, 48, "#456957", 13);
    this.label("back", "返回", 15, 41, 46, 50, 42, C.paper);
    this.button("back", { x: 15, y: 22, width: 52, height: 48 }, () => this.navigate("home"));
    this.label("page-title", title, 25, 210, 47, 240, 44, C.paper);
    if (note) this.label("page-note", note, 13, 195, 110, 334, 30, C.muted);
  }

  private drawLevels(): void {
    this.header("冒险模式", `已解锁 ${this.unlocked} / ${GAME_CONFIG.maxLevels} 关 · 通关开启下一班`);
    const g = this.background;
    for (let i = 0; i < 4; i++) {
      const id = this.levelPage * 4 + i + 1;
      if (id > GAME_CONFIG.maxLevels) continue;
      const level = getLevelConfig(id); const unlocked = id <= this.unlocked;
      const x = 28 + (i % 2) * 172; const y = 142 + Math.floor(i / 2) * 211;
      this.card(g, x, y, 162, 196, unlocked ? "#fffef2" : "#e8e7d6", 15);
      this.box(g, x + 9, y + 10, 144, 112, 10, unlocked ? "#cad7b0" : "#bdc8b1");
      // 缩略图使用实际关卡路线，横纵同倍率缩放，不重复摆一张无关场景图。
      const factor = 0.205; const ox = x + 40; const oy = y - 8;
      g.lineWidth = 10; g.lineCap = Graphics.LineCap.ROUND; g.lineJoin = Graphics.LineJoin.ROUND;
      g.strokeColor = this.color(unlocked ? "#f4dcad" : "#d6d7c2");
      level.pathPoints.forEach(([px, py], index) => { if (!index) g.moveTo(ox + px * factor, oy + py * factor); else g.lineTo(ox + px * factor, oy + py * factor); }); g.stroke();
      level.towerSpots.forEach(([px, py]) => this.disc(g, ox + px * factor, oy + py * factor, 2.2, "#94a27f"));
      const end = level.pathPoints[level.pathPoints.length - 1];
      this.art.drawIcon(`level-shop-${id}`, "shop", ox + end[0] * factor, oy + end[1] * factor - 4, 32);
      this.label(`level-num-${id}`, String(id).padStart(2, "0"), 17, x + 25, y + 29, 40, 30, C.ink);
      this.label(`level-title-${id}`, level.title, 16, x + 81, y + 145, 151, 31, C.ink);
      this.label(`level-state-${id}`, unlocked ? `可挑战 · ${level.waves.length} 波` : `通关第 ${id - 1} 关解锁`, 13, x + 81, y + 174, 154, 27, unlocked ? "#52835a" : C.muted);
      if (!unlocked) { this.lock(g, x + 81, y + 62, 1.15); }
      this.button(`level-${id}`, { x, y, width: 162, height: 196 }, () => {
        if (id > this.unlocked) this.notice("关卡未解锁", `通关第 ${id - 1} 关后解锁。`);
        else this.startLevel(id);
      });
    }
    const pages = Math.ceil(GAME_CONFIG.maxLevels / 4);
    this.pageButton("level-prev", "上一页", 31, this.levelPage > 0, () => { this.levelPage--; });
    this.pageButton("level-next", "下一页", 259, this.levelPage < pages - 1, () => { this.levelPage++; });
    this.label("level-pagination", `${this.levelPage + 1} / ${pages}`, 16, 195, 602, 90, 40, C.ink);
    this.label("levels-footer", "点击关卡图片，从开局开始挑战", 13, 195, 657, 315, 30, "#c9d4ab");
  }

  private pageButton(id: string, text: string, x: number, enabled: boolean, action: () => void): void {
    this.card(this.background, x, 578, 100, 48, enabled ? "#d6e3b9" : "#e8e8da", 12);
    this.label(id, text, 15, x + 50, 602, 96, 44, enabled ? C.ink : "#a1aa96");
    if (enabled) this.button(id, { x, y: 578, width: 100, height: 48 }, action);
  }

  private drawCollection(): void {
    this.header("游戏图鉴", "");
    COLLECTION_TABS.forEach((item, index) => {
      const x = 26 + index * 114; const selected = this.tab === item.id;
      this.card(this.background, x, 136, 110, 48, selected ? "#edc87c" : "#e2e6ce", 12);
      this.label(`tab-${item.id}`, `${item.label}图鉴`, 15, x + 55, 159, 106, 43, C.ink);
      this.button(`tab-${item.id}`, { x, y: 136, width: 110, height: 48 }, () => { this.tab = item.id; });
    });
    const entries = COLLECTION_ENTRIES.filter(item => item.tab === this.tab);
    entries.forEach((entry, index) => {
      const x = 27 + index % 2 * 173; const y = 202 + Math.floor(index / 2) * 179;
      const unlocked = this.collection.isUnlocked(entry);
      this.card(this.background, x, y, 163, 163, unlocked ? "#fffdf0" : "#e2e7d6", 14);
      this.box(this.background, x + 8, y + 8, 147, 115, 10, unlocked ? "#e7edcf" : "#c6d1bb");
      this.entryPicture(entry, this.art, this.background, `${entry.id}-card`, x + 82, y + 66, 115, !unlocked);
      this.label(`${entry.id}-name`, unlocked ? entry.name : "???", 17, x + 82, y + 139, 150, 34, C.ink);
      this.button(`entry-${entry.id}`, { x, y, width: 163, height: 163 }, () => { this.dialog = { kind: "entry", entry }; });
    });
    const visible = entries.filter(entry => this.collection.isUnlocked(entry)).length;
    this.label("collection-count", `${visible} / ${entries.length} 已收录`, 14, 195, 599, 300, 36, C.muted);
    this.label("collection-footer", this.tab === "bosses" ? "BOSS 尚未开放" : "点击图片，查看特点与夜班故事", 13, 195, 657, 340, 32, "#c9d4ab");
  }

  private drawSettings(): void {
    this.header("设置", "");
    this.settingRow("music", 149, "音乐", this.audio.musicEnabled, () => this.audio.setMusicEnabled(!this.audio.musicEnabled));
    this.settingRow("effects", 264, "音效", this.audio.effectsEnabled, () => this.audio.setEffectsEnabled(!this.audio.effectsEnabled));
    this.label("settings-version", "叮咚夜班开始  ·  v0.6.0", 13, 195, 596, 300, 30, C.muted);
  }

  private settingRow(id: string, y: number, title: string, enabled: boolean, action: () => void): void {
    this.card(this.background, 31, y, 328, 96, "#fffdf1", 15);
    this.label(`${id}-title`, title, 21, 102, y + 47, 100, 40, C.ink);
    this.box(this.background, 252, y + 24, 83, 46, 23, enabled ? "#5b865e" : "#a5ae99");
    this.disc(this.background, enabled ? 313 : 274, y + 47, 18, "#fff8df");
    this.label(`${id}-state`, enabled ? "开" : "关", 13, enabled ? 274 : 314, y + 47, 33, 30, "#fffdf1");
    this.button(id, { x: 31, y, width: 328, height: 96 }, action);
  }

  private drawDialog(dialog: Dialog): void {
    const g = this.modal;
    this.box(g, 0, this.visibleTop, W, this.visibleBottom - this.visibleTop, 0, "#102b24", 221);
    if (dialog.kind === "notice") {
      this.card(g, 25, 213, 340, 270, C.paper, 24);
      this.card(g, 307, 226, 48, 48, "#de9866", 12);
      this.label("dialog-close", "×", 26, 331, 250, 48, 48, C.ink, true);
      this.button("dialog-close", { x: 307, y: 226, width: 48, height: 48 }, () => { this.dialog = null; }, true);
      this.label("dialog-title", dialog.title, 23, 175, 261, 240, 50, C.ink, true);
      this.label("dialog-body", dialog.text, 16, 195, 376, 277, 148, C.ink, true);
      return;
    }
    this.card(g, 25, 78, 340, 548, C.paper, 24);
    this.card(g, 309, 89, 44, 44, "#de9866", 12);
    this.label("dialog-close", "×", 26, 331, 111, 44, 44, C.ink, true);
    this.button("dialog-close", { x: 307, y: 87, width: 48, height: 48 }, () => { this.dialog = null; }, true);
    if (dialog.kind === "entry") {
      const entry = dialog.entry; const unlocked = this.collection.isUnlocked(entry);
      this.label("dialog-title", unlocked ? entry.name : "未知档案", 23, 177, 119, 244, 44, C.ink, true);
      this.box(g, 91, 153, 208, 158, 20, "#e0e9c7");
      this.entryPicture(entry, this.modalArt, g, "detail", 195, 228, 163, !unlocked);
      if (!unlocked) {
        this.label("dialog-unknown", "???", 23, 195, 340, 260, 42, C.ink, true);
        this.label("dialog-hint", entry.unlockHint, 16, 195, 405, 270, 90, C.muted, true);
      } else {
        this.label("dialog-category", entry.category, 15, 195, 333, 280, 30, "#678056", true);
        this.label("dialog-traits", entry.traits, 14, 195, 378, 278, 57, C.ink, true);
        const stats = entry.stats.map((item, index) => `${index === 2 ? "\n" : index ? "   " : ""}${item.label} ${item.value}`).join("");
        this.label("dialog-stats", stats, 13, 195, 430, 278, 50, "#486645", true);
        this.label("dialog-stat-note", entry.statNote, 13, 195, 475, 285, 38, C.muted, true);
        this.box(g, 54, 501, 282, 1, 0, "#d8ddbd");
        this.label("dialog-story", entry.story, 14, 195, 555, 278, 86, C.ink, true);
      }
    }
  }

  private entryPicture(entry: CollectionEntry, art: MenuArtView, g: Graphics, key: string, x: number, y: number, size: number, locked: boolean): void {
    if (entry.imageKey === "boss_silhouette") {
      const r = size * 0.27;
      if (entry.id === "boss-fog-guest") {
        this.box(g, x - r * 0.64, y - r * 0.75, r * 1.28, r * 1.7, r * 0.5, "#3e554b");
        this.box(g, x - r, y - r * 0.95, r * 2, r * 0.35, 4, "#3e554b");
        this.box(g, x - r * 0.4, y - r * 1.35, r * 0.8, r * 0.6, 4, "#3e554b");
        return;
      }
      this.disc(g, x, y + 5, r, "#3e554b");
      this.disc(g, x - r * 0.8, y + 15, r * 0.43, "#3e554b"); this.disc(g, x + r * 0.8, y + 15, r * 0.43, "#3e554b");
      this.box(g, x - r * 0.8, y - r * 0.9, r * 0.45, r, 5, "#3e554b");
      this.box(g, x + r * 0.35, y - r * 0.9, r * 0.45, r, 5, "#3e554b");
    } else art.drawIcon(key, entry.imageKey as MenuIconKind, x, y, size, locked);
  }

  private button(id: string, rect: Rect, action: () => void, modal = false): void { (modal ? this.modalButtons : this.buttons).push({ id, ...rect, action }); }
  private node(name: string, parent: Node): Node {
    const node = new Node(name); node.layer = Layers.Enum.UI_2D;
    node.addComponent(UITransform).setContentSize(W, H); parent.addChild(node); return node;
  }
  private graphics(name: string, parent: Node): Graphics {
    const node = this.node(name, parent); node.setPosition(-W / 2, H / 2); node.setScale(1, -1, 1); return node.addComponent(Graphics);
  }
  private textRoot(name: string, parent: Node): TextLayer { return { root: this.node(name, parent), labels: new Map(), used: new Set() }; }
  private label(key: string, text: string, size: number, x: number, y: number, width: number, height: number, color: string, modal = false): void {
    const layer = modal ? this.modalText : this.textLayer; layer.used.add(key);
    let label = layer.labels.get(key);
    if (!label) { const node = this.node(key, layer.root); label = node.addComponent(Label); label.horizontalAlign = HorizontalTextAlignment.CENTER; label.verticalAlign = VerticalTextAlignment.CENTER; label.enableWrapText = true; label.overflow = Label.Overflow.SHRINK; layer.labels.set(key, label); }
    label.node.active = true; label.node.setPosition(x - W / 2, H / 2 - y);
    label.node.getComponent(UITransform)!.setContentSize(width, height);
    label.string = text; label.fontSize = size; label.lineHeight = size + 6; label.color = this.color(color);
  }
  private color(hex: string, alpha = 255): Color { const color = new Color(); Color.fromHEX(color, hex); color.a = alpha; return color; }
  private box(g: Graphics, x: number, y: number, w: number, h: number, r: number, hex: string, alpha = 255): void { g.fillColor = this.color(hex, alpha); if (r) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); }
  private disc(g: Graphics, x: number, y: number, r: number, hex: string): void { g.fillColor = this.color(hex); g.circle(x, y, r); g.fill(); }
  private card(g: Graphics, x: number, y: number, w: number, h: number, color: string, radius: number): void { this.box(g, x, y + 4, w, h, radius, "#213e31", 95); this.box(g, x, y, w, h, radius, color); }
  private lock(g: Graphics, x: number, y: number, scale = 1): void {
    g.strokeColor = this.color("#596d5b"); g.lineWidth = 3 * scale; g.circle(x, y - 5 * scale, 7 * scale); g.stroke();
    this.box(g, x - 12 * scale, y - 3 * scale, 24 * scale, 20 * scale, 4 * scale, "#596d5b"); this.disc(g, x, y + 5 * scale, 2 * scale, "#e2e7cc");
  }
  private gear(g: Graphics, x: number, y: number): void {
    g.strokeColor = this.color("#f5e7bc"); g.lineWidth = 4;
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.moveTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8); g.lineTo(x + Math.cos(a) * 13, y + Math.sin(a) * 13); g.stroke(); }
    g.circle(x, y, 8); g.stroke(); this.disc(g, x, y, 3, "#f5e7bc");
  }
}
