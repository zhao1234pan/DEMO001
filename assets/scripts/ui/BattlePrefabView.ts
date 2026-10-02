import { evolutionChoices, StaffEvolution } from "../gameplay/battle/StaffEvolution";
import { text } from "../config/ConfigTables";
import { Label, Node, UITransform, Vec3 } from "cc";
import { DEBUG } from "cc/env";
import { ENEMY_CONFIG, EnemyKind, GAME_CONFIG, TOWER_KINDS, TowerKind } from "../gameplay/battle/GameConfig";
import { UiPrefabs, uiNode, uiRect } from "./UiPrefabs";
import type { HitRect } from "../gameplay/battle/BattleLayout";

const W = GAME_CONFIG.prototypeLayoutWidth, H = GAME_CONFIG.prototypeLayoutHeight;
type PropKind = "freeze" | "clear" | "cash";
type Overlay = "pause" | "win" | "lose" | "retry";

/** 战斗固定UI与上下文控件；战斗算法只传状态，外观及热区来自预制体。 */
export class BattlePrefabView {
  readonly labels = new Map<string, Label>();
  readonly fixedLabels = new Set<string>();
  private readonly hud: Node;
  private readonly gmEntry: Node;
  private readonly gmEntryPosition: Vec3;
  private readonly overlays = new Map<Overlay, Node>();
  private readonly builds = new Map<TowerKind, Node>();
  private readonly evolutions = new Map<string,Node>();
  private readonly upgrade: Node;
  private readonly sell: Node;
  private readonly obstacle: Node;
  private readonly toast: Node;
  private readonly guide: Node;
  private readonly boss: Node;
  private readonly bossPosition: Vec3;
  private readonly guidePosition: Vec3;
  private readonly gm: Node | null;
  private readonly headerPosition: Vec3;
  private readonly footerPosition: Vec3;
  private overlay: Overlay = "pause";
  private readonly owned: Node[] = [];

  constructor(private readonly parent: Node, private readonly assets: UiPrefabs) {
    const create = (key: string, host = parent): Node => { const node = assets.create(key, host); this.owned.push(node); return node; };
    this.hud = create("battle_hud");
    this.boss = uiNode(this.hud, "Boss"); this.bossPosition = this.boss.position.clone();
    this.headerPosition = uiNode(this.hud, "Header").position.clone(); this.footerPosition = uiNode(this.hud, "Footer").position.clone();
    for (const name of ["title", "level", "wave", "coin", "lives"]) this.register(name, uiNode(this.hud, "Header/" + name));
    this.register("speed", uiNode(this.hud, "Header/Speed/Text")); this.register("pause", uiNode(this.hud, "Header/Pause/Text"));
    this.register("boss-status", uiNode(this.hud, "boss-status"));
    for (const kind of ["freeze", "clear", "cash"]) this.register("prop-" + kind, uiNode(this.hud, "Footer/Prop-" + kind + "/Text"));
    this.toast = create("toast", uiNode(this.hud, "ToastSlot")); this.register("toast", uiNode(this.toast, "Text"));
    this.guide = create("guide_hint", this.hud); this.guidePosition = this.guide.position.clone();
    this.upgrade = create("button"); this.sell = create("sell_button"); this.obstacle = create("obstacle_info");
    this.register("context-upgrade", uiNode(this.upgrade, "Text")); this.register("context-sell", uiNode(this.sell, "Text")); this.register("obstacle-info", uiNode(this.obstacle, "Text"));
    for (const kind of TOWER_KINDS) {
      const node = create("build_card"); this.builds.set(kind, node); assets.bindImage(uiNode(node, "Icon"), "ui:" + kind);
      this.register("build-" + kind, uiNode(node, "Title")); this.register("build-cost-" + kind, uiNode(node, "Cost"));
    }
    for(const kind of TOWER_KINDS)for(const evolution of evolutionChoices(kind)){
      const node=create("evolution_card");this.evolutions.set(evolution.key,node);assets.bindImage(uiNode(node,"Icon"),"ui:"+evolution.imageKey);
      uiNode(node,"Title").getComponent(Label)!.string=evolution.name;uiNode(node,"Summary").getComponent(Label)!.string=evolution.summary;
      uiNode(node,"Tradeoff").getComponent(Label)!.string=evolution.tradeoff;uiNode(node,"Cost").getComponent(Label)!.string=text("ui.evolution.costValue",evolution.cost);
    }
    for (const key of ["pause", "win", "lose", "retry"] as Overlay[]) this.overlays.set(key, create(key));
    this.registerOverlay("pause");
    // 原版 GM 入口在战斗弹窗上方；位置仍取自 HUD 预制体。
    this.gmEntry = uiNode(this.hud, "Footer/Gm");
    this.gmEntryPosition = this.gmEntry.position.clone().add(this.footerPosition);
    this.gmEntry.setParent(parent); this.gmEntry.setPosition(this.gmEntryPosition); this.owned.push(this.gmEntry);
    this.gm = DEBUG ? create("gm") : null;
    this.gmEntry.active = DEBUG;
    if (this.gm) {
      for (const key of ["gm-title", "gm-note", "gm-current"]) this.register(key, uiNode(this.gm, key));
      this.register("gm-entry", uiNode(this.gmEntry, "Text")); this.register("gm-close", uiNode(this.gm, "Close/Text")); this.register("gm-progress", uiNode(this.gm, "Home/Text"));
      for (let id = 1; id <= GAME_CONFIG.maxLevels; id++) this.register("gm-level-" + id, uiNode(this.gm, "Level" + id + "/Text"));
    }
    this.beginFrame(true);
  }
  private register(key: string, node: Node): void { this.labels.set(key, node.getComponent(Label)!); this.fixedLabels.add(key); }
  private registerOverlay(key: Overlay): void {
    const node = this.overlays.get(key)!;
    for (const name of ["overlayTitle", "overlayStats", "overlayNote"]) this.register(name, uiNode(node, name));
    this.register("overlayPrimary", uiNode(node, "Primary/overlayPrimary"));
    this.register("overlaySecondary", uiNode(node, "Secondary/overlaySecondary")); this.register("overlayHome", uiNode(node, "Home/overlayHome"));
  }
  beginFrame(home: boolean): void {
    this.guide.active = false; this.boss.active = false;
    this.hud.active = !home; this.gmEntry.active = DEBUG;
    // 菜单晚于战斗UI创建，入口与面板需保持在当前页面之上。
    if (DEBUG) { this.gmEntry.setSiblingIndex(this.parent.children.length - 1); this.gm?.setSiblingIndex(this.parent.children.length - 1); }
    this.upgrade.active = false; this.sell.active = false; this.obstacle.active = false;
    for (const node of this.builds.values()) node.active = false;
    for (const node of this.evolutions.values()) node.active = false;
    for (const node of this.overlays.values()) node.active = false;
    if (this.gm) this.gm.active = false;
  }
  layout(top: number, bottom: number): void {
    this.guide.setPosition(this.guidePosition.x, this.guidePosition.y - top);
    this.boss.setPosition(this.bossPosition.x, this.bossPosition.y - top);
    uiNode(this.hud, "Header").setPosition(this.headerPosition.x, this.headerPosition.y - top);
    uiNode(this.hud, "Footer").setPosition(this.footerPosition.x, this.footerPosition.y - (bottom - H));
    this.gmEntry.setPosition(this.gmEntryPosition.x, this.gmEntryPosition.y - (bottom - H));
    const headerHeight = uiNode(this.hud, "Header/Background").getComponent(UITransform)!.height;
    for (const node of Array.from(this.overlays.values()).concat(this.gm ? [this.gm] : [])) {
      const start = node === this.gm ? top : top + headerHeight;
      const dim = uiNode(node, "Dim"); dim.getComponent(UITransform)!.height = bottom - start;
      dim.setPosition(0, H / 2 - (start + bottom) / 2);
    }
  }
  hudState(counts: Record<PropKind, number>, adUsed: Record<PropKind, boolean>, active: boolean, gm: boolean, toast: boolean, mapReview: boolean): void {
    for (const kind of ["freeze", "clear", "cash"] as PropKind[]) {
      const node = uiNode(this.hud, "Footer/Prop-" + kind);
      uiNode(node, "Disabled").active = counts[kind] === 0 && adUsed[kind]; uiNode(node, "Icon").active = active;
    }
    this.toast.active = toast && !gm;
    uiNode(this.hud, "Header/CoinIcon").active = !gm;
    this.gmEntry.active = DEBUG && !mapReview;
    uiNode(this.hud, "Footer/Shop").active = true;
  }
  buildSize(): { width: number; height: number } {
    const node = this.builds.get(TOWER_KINDS[0])!, size = node.getComponent(UITransform)!.contentSize;
    return { width: size.width * node.scale.x, height: size.height * node.scale.y };
  }
  showBuild(kind: TowerKind, x: number, y: number, affordable: boolean): void {
    const node = this.builds.get(kind)!; node.active = true; node.setPosition(x - W / 2, H / 2 - y);
    const disabled = node.getChildByName("Disabled"); if (disabled) disabled.active = !affordable;
  }
  evolutionSize(): {width:number;height:number} { const size=this.evolutions.values().next().value!.getComponent(UITransform)!.contentSize;return {width:size.width,height:size.height}; }
  evolutionRect(key:string):HitRect{return uiRect(this.evolutions.get(key)!,this.parent,W,H);}
  showEvolutions(items:Array<{evolution:StaffEvolution;x:number;y:number}>,coins:number):void{
    for(const node of this.evolutions.values())node.active=false;
    for(const item of items){const node=this.evolutions.get(item.evolution.key)!;node.active=true;node.setPosition(item.x-W/2,H/2-item.y);uiNode(node,"Disabled").active=coins<item.evolution.cost;}
  }
  showAction(action: "upgrade" | "sell", x: number, y: number, enabled: boolean): void {
    const node = action === "upgrade" ? this.upgrade : this.sell; node.active = true; node.setPosition(x - W / 2, H / 2 - y);
    const disabled = node.getChildByName("Disabled"); if (disabled) disabled.active = !enabled;
  }
  showObstacle(x: number, y: number): void { this.obstacle.active = true; this.obstacle.setPosition(x - W / 2, H / 2 - y); }
  showOverlay(key: Overlay, labels: Map<string, Label>): void {
    this.overlay = key; this.overlays.get(key)!.active = true; this.registerOverlay(key);
    for (const [name, label] of this.labels) if (name.startsWith("overlay")) labels.set(name, label);
  }
  showBoss(enemy: {kind:EnemyKind;hp:number;maxHp:number} | null, cue: {kind:EnemyKind;defeated:boolean;time:number} | null): void {
    const kind = cue?.kind ?? enemy?.kind;
    this.boss.active = Boolean(kind);
    if (!kind) return;
    const config = ENEMY_CONFIG[kind];
    this.assets.bindImage(uiNode(this.boss,"Portrait"), "menu:enemy_"+kind);
    uiNode(this.boss,"Name").getComponent(Label)!.string = config.name!;
    const value = cue ? text(cue.defeated ? "feedback.boss.defeated" : config.boss === "major" ? "feedback.boss.major" : "feedback.boss.mini")
      : text("feedback.boss.health", Math.max(0,Math.ceil(enemy!.hp)),enemy!.maxHp);
    uiNode(this.boss,"State").getComponent(Label)!.string = value;
    // 提示可能对应刚退场的首领，不能把另一名首领的血量画到它名下。
    const health = enemy?.kind === kind ? Math.max(0,Math.min(1,enemy.hp/enemy.maxHp)) : 0;
    uiNode(this.boss,"Fill").setScale(health,1,1);
  }
  showResult(summary: string, entries: Array<{name:string;image:string}>): void {
    const root = this.overlays.get("win")!;
    uiNode(root,"Summary").getComponent(Label)!.string = summary;
    const group = uiNode(root,"Unlocks"), slots = group.children;
    group.active = entries.length > 0;
    slots.forEach((slot,i) => {
      const entry = entries[i]; slot.active = Boolean(entry);
      const width=slot.getComponent(UITransform)!.width, count=Math.min(entries.length,slots.length);
      slot.setPosition((i-(count-1)/2)*width,slot.position.y);
      if (entry) { this.assets.bindImage(uiNode(slot,"Portrait"),entry.image); uiNode(slot,"Name").getComponent(Label)!.string=entry.name; }
    });
    const shift = entries.length ? 0 : group.getComponent(UITransform)!.height;
    for (const key of ["Primary","Home"]) {
      const marker = uiNode(root,key+"Anchor"); uiNode(root,key).setPosition(marker.position.x,marker.position.y+shift);
    }
    const panel=uiNode(root,"Panel"), anchor=uiNode(root,"PanelAnchor"), h=anchor.getComponent(UITransform)!.height-shift;
    panel.setPosition(anchor.position.x,anchor.position.y+shift/2);panel.getComponent(UITransform)!.height=h;
    for (const name of ["Surface","Shadow","Outline"]) { const child=panel.getChildByName(name); if(child)child.getComponent(UITransform)!.height=h; }
  }
  showGm(open: boolean, current: number, resetArmed = false): void {
    if (!this.gm) return;
    this.gmEntry.active = !open;
    this.gm.active = open;
    uiNode(this.gm, "Reset/Text").getComponent(Label)!.string = text(resetArmed ? "ui.gm.resetConfirm" : "ui.gm.reset");
    if (open) for (let id = 1; id <= GAME_CONFIG.maxLevels; id++) uiNode(this.gm, "Level" + id + "/Selected").active = current === id;
  }
  showGuide(value: string): void { this.guide.active = Boolean(value); uiNode(this.guide, "Text").getComponent(Label)!.string = value; }
  guideRect(): HitRect { return uiRect(this.guide, this.parent, W, H); }
  toastRect(): HitRect { return uiRect(this.toast, this.parent, W, H); }
  headerRect(key: "Speed" | "Pause"): HitRect { return uiRect(uiNode(this.hud, "Header/" + key), this.parent, W, H); }
  propRect(kind: PropKind): HitRect { return uiRect(uiNode(this.hud, "Footer/Prop-" + kind), this.parent, W, H); }
  overlayRect(name: "Home" | "Primary" | "Secondary", key = this.overlay): HitRect { return uiRect(uiNode(this.overlays.get(key)!, name), this.parent, W, H); }
  gmRect(name: string): HitRect { return uiRect(name === "Entry" ? this.gmEntry : uiNode(this.gm!, name), this.parent, W, H); }
  contextRect(action: "upgrade" | "sell" | TowerKind): HitRect { return uiRect(action === "upgrade" ? this.upgrade : action === "sell" ? this.sell : this.builds.get(action)!, this.parent, W, H); }
  destroy(): void { for (const node of this.owned) node.destroy(); this.labels.clear(); }
}
