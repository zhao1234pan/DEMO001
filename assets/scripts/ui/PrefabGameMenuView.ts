import { CollectionScrollState } from "./CollectionScrollState";
import { readWalletCoins } from "../services/PlayerWallet";
import { UiSkin } from "./UiSkin";
import { UiRoute } from "./UiRoute";
import { PngSurface } from "./PngSurface";
import { loadoutRule, loadoutCandidates, requiredLoadoutSize, readLoadout, validLoadout, defaultLoadout, staffRole, levelPreview, bossWaveText } from "../gameplay/battle/LevelLoadout";
import { TOWER_CONFIG, TowerKind } from "../gameplay/battle/GameConfig";
import { evolutionChoices, staffVisual } from "../gameplay/battle/StaffEvolution";
import { Color, instantiate, Label, Node, Sprite, UITransform } from "cc";
import { globalString, globalNumber, text } from "../config/ConfigTables";
import { GAME_CONFIG } from "../gameplay/battle/GameConfig";
import { getLevelConfig } from "../gameplay/battle/LevelConfig";
import { levelTheme } from "../gameplay/battle/LevelTheme";
import { COLLECTION_ENTRIES, COLLECTION_TABS, CollectionEntry, CollectionProgress, CollectionTab, staffStats, evolutionStats, evolutionTraits } from "../gameplay/battle/CollectionData";
import { AudioService } from "../services/AudioService";
import { PlatformSettings } from "../services/PlatformSettings";
import { UiPrefabs, uiNode, uiText, uiRect, uiColor } from "./UiPrefabs";

type MenuPage = "home" | "levels" | "collection" | "settings" | "loadout" | "challenge_loadout";
type Dialog = { kind: "entry"; entry: CollectionEntry } | { kind: "notice"; title: string; text: string };
const W = GAME_CONFIG.prototypeLayoutWidth, H = GAME_CONFIG.prototypeLayoutHeight;

/** 固定布局属于 prefab；本类只负责状态、数据绑定和既有触控入口的分派。 */
export class PrefabGameMenuView {
  private readonly root: Node;
  private readonly pages = new Map<MenuPage, Node>();
  private readonly dialogs = new Map<string, Node>();
  private readonly loadoutCards: Node[] = [];
  private preparationId = 1;
  private selection: TowerKind[] = [];
  private replacementSlot = -1;
  private selectionHint = "";
  private readonly challengeLoadoutCards: Node[] = [];
  private readonly levelCards: Node[] = [];
  private readonly collectionCards: Node[] = [];
  private readonly actions = new Map<Node, () => void>();
  private readonly modalActions = new Map<Node, () => void>();
  private readonly routes = new WeakMap<Node,PngSurface>();
  private readonly platform = new PlatformSettings();
  private readonly preparationSlots=new Map<Node,{x:number;y:number}>();
  private readonly preparationGeometry=new Map<Node,{y:number;height:number}>();
  private readonly collectionRows: Node[] = [];
  private readonly collectionScroll = new CollectionScrollState();
  private focusBoss = false;
  private page: MenuPage = "home";
  get isLandingPage():boolean{return this.page==="home"&&!this.dialog;}
  private tab: CollectionTab = "staff";
  private levelPage = 0;
  private detailLevel = 1;
  private detailBaseLevel = 1;
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
    private readonly collection: CollectionProgress, private readonly startLevel: (id: number, roster?: TowerKind[]) => void) {
    this.root = assets.create("menu_shell", parent);
    for (const key of ["home", "levels", "collection", "settings", "loadout", "challenge_loadout"] as MenuPage[]) {
      const node = assets.create(key, uiNode(this.root, "Pages")); this.pages.set(key, node); node.active = false;
    }
    for (const key of ["notice", "detail"]) { const node = assets.create(key, uiNode(this.root, "Dialogs")); this.dialogs.set(key, node); node.active = false; }
    for (const slot of uiNode(this.pages.get("levels")!, "Cards").children) this.levelCards.push(assets.create("level_card", slot));
    for(const slot of uiNode(this.pages.get("loadout")!, "Candidates").children)this.loadoutCards.push(assets.create("loadout_card",slot));
    for(const slot of uiNode(this.pages.get("challenge_loadout")!,"Candidates").children)this.challengeLoadoutCards.push(assets.create("challenge_staff_card",slot));
    for(const key of ['loadout','challenge_loadout'] as MenuPage[]){const page=this.pages.get(key)!;for(const slot of uiNode(page,'Candidates').children)this.preparationSlots.set(slot,{x:slot.position.x,y:slot.position.y});for(const nodePath of ['Panel','Panel/Surface','Hint','Start']){const n=uiNode(page,nodePath);this.preparationGeometry.set(n,{y:n.position.y,height:n.getComponent(UITransform)!.height});}}
    void this.platform.refresh().then(() => { if (!this.disposed) this.dirty = true; });
    this.root.active = false;
  }
  show(unlocked: number, page: MenuPage = "home", focusLevel = unlocked): void {
    this.navigationRevision++; this.unlocked = getLevelConfig(unlocked).id; this.collection.refresh(this.unlocked);
    this.page = page; this.levelPage = Math.floor((getLevelConfig(focusLevel).id - 1) / this.levelCards.length);
    this.dialog = null; this.collectionScroll.end(); this.active = true; this.root.active = true; this.dirty = true;
  }
  showPreparation(unlocked:number,id:number):void {
    this.show(unlocked,getLevelConfig(id).mode==="challenge"?"challenge_loadout":"loadout",id);this.preparationId=id;this.selection=readLoadout(id,unlocked);this.replacementSlot=-1;this.selectionHint="";
  }
  showCollection(unlocked: number, tab: CollectionTab): void {
    this.tab = tab==="bosses"?"enemies":tab; this.focusBoss = tab === "bosses"; this.collectionScroll.set(0); this.show(unlocked, "collection");
  }
  hide(): void { if (!this.active) return; this.navigationRevision++; this.active = false; this.root.active = false; this.dialog = null; this.collectionScroll.end(); }
  render(unlocked: number, top: number, bottom: number): void {
    if (!this.active || this.disposed) return;
    if (this.top !== top || this.bottom !== bottom) {
      this.top = top; this.bottom = bottom;
      const scale = Math.min(1, Math.max(0.5, (bottom - top) / H));
      const offset = top + ((bottom - top) - H * scale) / 2;
      this.root.setScale(scale, scale, 1); this.root.setPosition(0, H / 2 - offset - H * scale / 2);
      // 只有全屏遮罩随视口拉伸，页面内容保持预制体中的比例与位置。
      const visibleTop = (top - offset) / scale, visibleBottom = (bottom - offset) / scale;
      for (const n of [uiNode(this.pages.get("settings")!,"Dim"),uiNode(this.pages.get("collection")!,"Dim"),uiNode(this.pages.get("challenge_loadout")!,"BattleDim"),uiNode(this.pages.get("loadout")!,"BattleDim"), ...Array.from(this.dialogs.values()).map(n => uiNode(n, "Dim"))]) {
        n.getComponent(UITransform)!.height = visibleBottom - visibleTop;
        n.setPosition(n.position.x, H / 2 - (visibleTop + visibleBottom) / 2);
      }
      const background=uiNode(this.root,"Backdrop"),skin=this.assets.skin(background.getComponent(UiSkin)!.key),height=visibleBottom-visibleTop,ratio=Number(skin.width)/Number(skin.height),width=Math.max(W,height*ratio);
      background.getComponent(UITransform)!.setContentSize(width,width/ratio);background.setPosition(0,H/2-(visibleTop+visibleBottom)/2);
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
    else if(this.page === "loadout" || this.page === "challenge_loadout") this.preparation(page);
    else this.settings(page);
    this.renderDialog();
  }
  press(x: number, y: number): void {
    if (!this.active || this.disposed) return;
    // 共用游戏的主指/移动取消逻辑，预制体按钮不另注册第二条触摸处理链。
    const actions = this.dialog ? this.modalActions : this.actions;
    for (const [node, action] of actions) {
      if (!node.activeInHierarchy) continue;
      if (this.page === "collection" && !this.dialog && this.collectionCards.includes(node) && !this.inCollectionViewport(x, y)) continue;
      const rect = uiRect(node, this.parent, W, H);
      if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
        this.audio.play("build", 0.24); action(); this.dirty = true; return;
      }
    }
  }
  destroy(): void { this.disposed = true; this.active = false; this.actions.clear(); this.modalActions.clear(); this.root.destroy(); }
  private bind(root: Node, path: string, action: () => void, modal = false): void { (modal ? this.modalActions : this.actions).set(path ? uiNode(root, path) : root, action); }
  private navigate(page: MenuPage): void { this.navigationRevision++; this.page = page; this.dialog = null; this.collectionScroll.end(); if(page==="collection")this.collectionScroll.set(0); this.dirty = true; }
  private notice(title: string, content: string): void { this.dialog = { kind: "notice", title, text: content }; this.dirty = true; }
  private home(page: Node): void {
    uiText(page, "Brand", text("ui.redesign.homeTitle"));
    uiText(page,"Progress",text("ui.redesign.progress",this.unlocked,GAME_CONFIG.maxLevels));uiText(page,"CollectionCount",text("ui.homeGold",readWalletCoins()));
    this.bind(page,"Store",()=>this.notice(text("ui.redesign.shop"),text("ui.redesign.unavailable")));this.bind(page,"Ranking",()=>this.notice(text("ui.redesign.rank"),text("ui.redesign.unavailable")));
    uiText(page, "Adventure/Note", text("ui.GameMenuView.004", this.unlocked, GAME_CONFIG.maxLevels));
    this.bind(page, "Settings", () => this.navigate("settings"));
    this.bind(page, "Adventure", () => this.navigate("levels"));
    this.bind(page, "Challenge", () => this.startLevel(globalNumber("challengeLevelId")));
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
      uiNode(card, "Theme").active = false; uiText(card, "Number", String(id).padStart(2, "0")); uiText(card, "Title", level.title);
      uiText(card, "State", unlocked ? text("ui.GameMenuView.017", level.waves.length) : text("ui.GameMenuView.018", id - 1));
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
    const route=uiNode(card,"Route"),projection=uiNode(route,"Projection");
    let layer=this.routes.get(route);if(!layer){layer=new PngSurface(route,this.assets,false);this.routes.set(route,layer);}
    const style=route.getComponent(UiRoute)!;const lineWidth=style.lineWidth,road=style.lineColor.clone(),spots=style.spotColor;
    if(unlocked)Color.fromHEX(road,levelTheme(level).road);
    // 路线和塔位统一适配投影内框；不能按主地图固定倍率溢出缩略图。
    const bounds=projection.getComponent(UITransform)!,points=[...level.pathPoints,...level.towerSpots],xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const scale=Math.min(bounds.width/Math.max(1,maxX-minX),bounds.height/Math.max(1,maxY-minY));
    const project=([x,y]:readonly number[])=>[projection.position.x+(x-(minX+maxX)/2)*scale,projection.position.y-(y-(minY+maxY)/2)*scale];
    layer.clear();for(let i=1;i<level.pathPoints.length;i++){const [x,y]=project(level.pathPoints[i-1]),[bx,by]=project(level.pathPoints[i]);layer.line(x,y,bx,by,road,lineWidth,true);}
    for(const point of level.towerSpots){const [x,y]=project(point);layer.disc(x,y,lineWidth*.22,spots);}layer.end();
    const [x,y]=project(level.pathPoints[level.pathPoints.length-1]);const marker=uiNode(route,"ShopMarker");marker.setPosition(x,y);marker.setSiblingIndex(route.children.length-1);
  }

  private inCollectionViewport(x: number, y: number): boolean {
    if (!this.active || this.disposed || this.page !== "collection" || this.dialog) return false;
    const rect = uiRect(uiNode(this.pages.get("collection")!, "ScrollViewport"), this.parent, W, H);
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }
  private collectionViewportScale(): number {
    const viewport = uiNode(this.pages.get("collection")!, "ScrollViewport");
    return uiRect(viewport, this.parent, W, H).height / viewport.getComponent(UITransform)!.height;
  }
  beginScroll(x: number, y: number): void {
    this.collectionScroll.end();
    if (this.inCollectionViewport(x, y)) this.collectionScroll.begin(y / this.collectionViewportScale());
  }
  moveScroll(x: number, y: number): void {
    if (!this.active || this.page !== "collection" || this.dialog) return;
    this.collectionScroll.move(y / this.collectionViewportScale(), globalNumber("touchTravelTolerance") / this.collectionViewportScale());
    this.positionCollectionContent();
  }
  endScroll(): void { this.collectionScroll.end(); }
  wheelScroll(x: number, y: number, amount: number): void {
    if (!this.inCollectionViewport(x, y)) return;
    this.collectionScroll.end();
    this.collectionScroll.set(this.collectionScroll.offset - amount * globalNumber("collectionWheelScale"));
    this.positionCollectionContent();
  }
  private positionCollectionContent(): void {
    const page = this.pages.get("collection")!, viewport = uiNode(page, "ScrollViewport");
    const content = uiNode(viewport, "Content");
    content.setPosition(content.position.x, viewport.getComponent(UITransform)!.height / 2 + this.collectionScroll.offset);
  }
  private collectionPageView(page: Node): void {
    for (const tab of COLLECTION_TABS) {
      const name = "Tab-" + tab.id, selected = this.tab === tab.id;
      uiNode(page, name + "/Selected").active = selected; uiNode(page, name + "/Normal").active = !selected;
      uiText(page, name + "/Text", tab.label);
      this.bind(page, name, () => { this.tab = tab.id; this.focusBoss = false; this.collectionScroll.end(); this.collectionScroll.set(0); });
    }
    const entries = COLLECTION_ENTRIES.filter(item => item.tab === this.tab || this.tab === "enemies" && item.tab === "bosses");
    const viewport = uiNode(page, "ScrollViewport"), content = uiNode(viewport, "Content"), template = uiNode(content, "RowTemplate");
    const slots = uiNode(template, "Cards").children, columns = slots.length, pitch = template.getComponent(UITransform)!.height;
    const needed = Math.ceil(entries.length / columns), viewportHeight = viewport.getComponent(UITransform)!.height;
    while (this.collectionRows.length < needed) {
      const row = instantiate(template); row.name = "Row" + this.collectionRows.length; content.addChild(row);
      this.assets.bindTree(row); this.collectionRows.push(row);
      for (const slot of uiNode(row, "Cards").children) this.collectionCards.push(this.assets.create("collection_card", slot));
    }
    this.collectionRows.forEach((row, index) => {
      row.active = index < needed;
      row.setPosition(template.position.x, template.position.y - pitch * index);
      const rowSlots = uiNode(row, "Cards").children, count = Math.min(columns, entries.length - index * columns);
      const center = count > 0 ? (slots[0].position.x + slots[count - 1].position.x) / 2 : 0;
      const shelf = uiNode(row, "Shelf"), full = uiNode(template, "Shelf").getComponent(UITransform)!.width;
      // 两人行稍收短，单人行只保留本人的台面；姓名牌始终在立绘前方。
      shelf.getComponent(UITransform)!.width = count === 1 ? rowSlots[0].getComponent(UITransform)!.width : full - (columns - count) * (slots[1].position.x - slots[0].position.x) / columns;
      rowSlots.forEach((slot, column) => {
        slot.setPosition(slots[column].position.x - center, slots[column].position.y);
        const card = this.collectionCards[index * columns + column], entry = entries[index * columns + column];
        card.active = index < needed && column < count; if (!card.active) return;
        const unlocked = this.collection.isUnlocked(entry);
        uiNode(card, "Unlocked").active = unlocked; uiNode(card, "Locked").active = !unlocked;
        uiNode(card, "LockedPortraitBackground").active = !unlocked;
        this.assets.bindImage(uiNode(card, "Portrait"), "menu:" + entry.imageKey, !unlocked);
        uiText(card, "Name", unlocked ? entry.name : text("ui.unknown"));
        this.bind(card, "", () => { this.collectionScroll.end(); this.detailLevel = 1; this.detailBaseLevel = 1; this.dialog = { kind: "entry", entry }; });
      });
    });
    const contentHeight = Math.max(viewportHeight, needed * pitch + globalNumber("collectionScrollPadding"));
    content.getComponent(UITransform)!.height = contentHeight;
    this.collectionScroll.resize(contentHeight, viewportHeight);
    if (this.focusBoss) {
      const index = entries.findIndex(entry => entry.tab === "bosses");
      this.collectionScroll.set(Math.max(0, Math.floor(index / columns)) * pitch); this.focusBoss = false;
    }
    this.positionCollectionContent();
  }
  /** 冒险和挑战共用勾选式店员选择；候选范围与人数仍由关卡表决定。 */
  private preparation(page:Node):void {
    const id=this.preparationId,challenge=this.page==="challenge_loadout",pool=loadoutCandidates(id,this.unlocked),count=requiredLoadoutSize(id,this.unlocked),full=this.selection.length===count;
    const cards=challenge?this.challengeLoadoutCards:this.loadoutCards;
    this.assets.bindSkin(uiNode(page,"BattleRoad/Artwork").getComponent(Sprite)!,"map_"+id);
    this.bind(page,"Back",()=>this.navigate(challenge?"home":"levels"));uiText(page,"Title",text(challenge?"challenge.loadout":"ui.loadout.title"));uiText(page,"SelectedTitle",text("ui.loadout.selected",this.selection.length,count));
    uiText(page,"Default/Text",text("ui.loadout.default"));this.bind(page,"Default",()=>{this.selection=defaultLoadout(id).filter(k=>pool.includes(k));this.selectionHint="";});
    uiText(page,"Hint",this.selectionHint||text("ui.redesign.pickHint"));
    cards.forEach((card,i)=>{const kind=pool[i];card.active=Boolean(kind);if(!kind)return;this.assets.bindImage(uiNode(card,"Icon/Portrait"),"menu:"+kind);uiText(card,"Name",TOWER_CONFIG[kind].name);uiText(card,"Role",staffRole(kind));const selected=this.selection.includes(kind);uiNode(card,"Selected").active=selected;uiNode(card,"SelectedRing").active=selected;
      this.bind(card,"",()=>{const index=this.selection.indexOf(kind);if(index>=0)this.selection.splice(index,1);else if(!full)this.selection.push(kind);else{this.selectionHint=text("ui.redesign.pickFull");return;}this.selectionHint="";});
    });
    // 按配置中已有行距收紧短名单，未满的一行居中；八选四保持参考图原布局。
    const rows=new Map<number,Node[]>();for(const card of cards){const pos=this.preparationSlots.get(card.parent!)!;card.parent!.setPosition(pos.x,pos.y);const list=rows.get(pos.y)??[];list.push(card);rows.set(pos.y,list);}
    let last=Infinity;for(const [y,list]of rows){const shown=list.filter(n=>n.active);if(!shown.length)continue;last=Math.min(last,y);const dx=(list[0].parent!.position.x+list[list.length-1].parent!.position.x-shown[0].parent!.position.x-shown[shown.length-1].parent!.position.x)/2;for(const card of shown)card.parent!.setPosition(card.parent!.position.x+dx,y);}
    const gap=Number.isFinite(last)?last-Math.min(...Array.from(rows.keys())):0;for(const nodePath of ['Panel','Panel/Surface','Hint','Start']){const n=uiNode(page,nodePath),base=this.preparationGeometry.get(n)!;if(nodePath==='Panel'){n.setPosition(n.position.x,base.y+gap/2);n.getComponent(UITransform)!.height=base.height-gap;}else if(nodePath==='Panel/Surface'){n.getComponent(UITransform)!.height=base.height-gap;}else n.setPosition(n.position.x,base.y+gap);}
    uiText(page,"Start/Text",full?text("ui.loadout.start"):text("ui.loadout.need",count-this.selection.length));this.buttonEnabled(page,"Start",full);if(validLoadout(id,this.unlocked,this.selection))this.bind(page,"Start",()=>this.startLevel(id,[...this.selection]));
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
    const entry=dialog.entry,trial=(this.page==="loadout"||this.page==="challenge_loadout")&&getLevelConfig(this.preparationId).mode==="challenge"&&Boolean(entry.staffKind),ownerKnown=trial||this.collection.isUnlocked(entry),choices=entry.staffKind?evolutionChoices(entry.staffKind):[];
    const evolution=choices.length&&this.detailLevel>1?choices[this.detailLevel-2]:undefined;
    const unlocked=ownerKnown&&(trial||!evolution||this.collection.isEvolutionUnlocked(evolution.key));
    uiText(page,"Title",unlocked?(evolution?text("ui.evolution.name",entry.name,evolution.name):entry.name):text("ui.evolution.locked"));
    const portrait = entry.staffKind ? staffVisual(entry.staffKind, evolution ? evolution.toLevel : this.detailBaseLevel, evolution?.key).portraitImageKey : entry.imageKey;
    this.assets.bindImage(uiNode(page,"Portrait"),"menu:"+portrait,!unlocked);
    uiNode(page,"Known").active=unlocked;uiNode(page,"Unknown").active=!unlocked;
    uiText(page,"Unknown/Hint",evolution?text("ui.evolution.lockedHint"):entry.unlockHint);
    for(const level of [1,2,3]){
      const key="Level"+level,button=uiNode(page,key);button.active=ownerKnown&&Boolean(entry.staffKind);
      if(!button.active)continue;
      const e=choices[level-2],known=trial||!e||this.collection.isEvolutionUnlocked(e.key);
      const title=choices.length?(level===1?text("ui.evolution.base"):known?e.name:text("ui.evolution.locked")):text(["ui.opt.staffLevel1","ui.opt.staffLevel2","ui.opt.staffLevel3"][level-1]);
      uiText(button,"Text",title);this.assets.bindImage(uiNode(button,"Icon"),"menu:"+(e?.imageKey??entry.imageKey),!known);
      uiColor(button,"Surface",this.detailLevel===level?"#96bb77":"#efe7c8");this.bind(page,key,()=>{this.detailLevel=level;},true);
    }
    for(const level of [1,2]){
      const button=uiNode(page,"Base"+level);button.active=ownerKnown&&choices.length>0&&this.detailLevel===1;
      if(button.active){uiText(button,"Text",text("ui.evolution.base"+level));uiColor(button,"Surface",this.detailBaseLevel===level?"#96bb77":"#efe7c8");this.bind(page,"Base"+level,()=>{this.detailBaseLevel=level;},true);}
    }
    if(unlocked){
      uiText(page,"Known/Category",evolution?text("ui.evolution.profile"):entry.category);
      uiText(page,"Known/Traits",evolution?evolutionTraits(evolution):entry.traits);
      const stats=evolution?evolutionStats(evolution):entry.staffKind?staffStats(entry.staffKind,choices.length?this.detailBaseLevel:this.detailLevel):entry.stats;
      uiNode(page,"Known/Stats").active=false;for(let i=0;i<4;i++)uiNode(page,"Known/Stat"+i).active=i<stats.length;stats.forEach((item,index)=>uiText(page,"Known/Stat"+index,item.label+"\n"+item.value));
      uiNode(page,"Known/Note").active=false;uiText(page,"Known/Story",evolution?evolution.story:entry.story);
    }
    this.layoutDetail(page,unlocked,ownerKnown&&Boolean(entry.staffKind));
  }
  /** 按实际行高排列内容；无等级切换的怪物详情不占用店员按钮的位置。 */
  private layoutDetail(page: Node, unlocked: boolean, staff: boolean): void {
    const spacing = uiNode(page, "LayoutSpacing").getComponent(UITransform)!;
    const gap = spacing.height, padding = spacing.width;
    const rows: Node[][] = [[uiNode(page, "Title"), uiNode(page, "Close")], [uiNode(page, "Portrait"), uiNode(page, "PictureBackground")]];
    const measured = (path: string): Node => {
      const node = uiNode(page, path), label = node.getComponent(Label)!;
      label.overflow = Label.Overflow.RESIZE_HEIGHT; label.updateRenderData(true);
      return node;
    };
    if(staff){rows.push([1,2,3].map(level=>uiNode(page,"Level"+level)));if(uiNode(page,"Base1").active)rows.push([uiNode(page,"Base1"),uiNode(page,"Base2")]);}
    if (unlocked) {
      rows.push([measured("Known/Category")], [measured("Known/Traits")]);
      for(const paths of [["Known/Stat0","Known/Stat1"],["Known/Stat2","Known/Stat3"]]){const nodes=paths.map(p=>uiNode(page,p)).filter(n=>n.active);if(nodes.length)rows.push(nodes);}
      rows.push([uiNode(page,"Known/Rule")],[measured("Known/Story")]);
    } else rows.push([uiNode(page, "Unknown/Title")], [measured("Unknown/Hint")]);
    const heights = rows.map(row => Math.max(...row.map(node => node.getComponent(UITransform)!.height)));
    const height = padding * 2 + heights.reduce((sum, value) => sum + value, 0) + gap * (rows.length - 1);
    page.setScale(Math.min(1,(H-24)/height),Math.min(1,(H-24)/height),1);
    let y = height / 2 - padding;
    rows.forEach((row, index) => { for (const node of row) node.setPosition(node.position.x, y - heights[index] / 2); y -= heights[index] + gap; });
    const panel = uiNode(page, "Panel"); panel.setPosition(panel.position.x, 0);
    for (const node of [panel, ...panel.children]) node.getComponent(UITransform)!.height = height;
  }

}
