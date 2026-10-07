import { UiSkin } from "./UiSkin";
import { UiRoute } from "./UiRoute";
import { PngSurface } from "./PngSurface";
import { loadoutRule, loadoutCandidates, requiredLoadoutSize, readLoadout, validLoadout, defaultLoadout, staffRole, levelPreview, bossWaveText } from "../gameplay/battle/LevelLoadout";
import { TOWER_CONFIG, TowerKind } from "../gameplay/battle/GameConfig";
import { evolutionChoices } from "../gameplay/battle/StaffEvolution";
import { Color, Label, Node, UITransform } from "cc";
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
  private readonly collectionSlotPositions=new Map<Node,{x:number;y:number}>();
  private page: MenuPage = "home";
  get isLandingPage():boolean{return this.page==="home"&&!this.dialog;}
  private tab: CollectionTab = "staff";
  private levelPage = 0;
  private detailLevel = 1;
  private detailBaseLevel = 1;
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
    private readonly collection: CollectionProgress, private readonly startLevel: (id: number, roster?: TowerKind[]) => void) {
    this.root = assets.create("menu_shell", parent);
    for (const key of ["home", "levels", "collection", "settings", "loadout", "challenge_loadout"] as MenuPage[]) {
      const node = assets.create(key, uiNode(this.root, "Pages")); this.pages.set(key, node); node.active = false;
    }
    for (const key of ["notice", "detail"]) { const node = assets.create(key, uiNode(this.root, "Dialogs")); this.dialogs.set(key, node); node.active = false; }
    for (const slot of uiNode(this.pages.get("levels")!, "Cards").children) this.levelCards.push(assets.create("level_card", slot));
    for (const slot of uiNode(this.pages.get("collection")!, "Cards").children){this.collectionCards.push(assets.create("collection_card",slot));this.collectionSlotPositions.set(slot,{x:slot.position.x,y:slot.position.y});}
    for(const slot of uiNode(this.pages.get("loadout")!, "Candidates").children)this.loadoutCards.push(assets.create("loadout_card",slot));
    for(const slot of uiNode(this.pages.get("challenge_loadout")!,"Candidates").children)this.challengeLoadoutCards.push(assets.create("challenge_staff_card",slot));
    void this.platform.refresh().then(() => { if (!this.disposed) this.dirty = true; });
    this.root.active = false;
  }
  show(unlocked: number, page: MenuPage = "home", focusLevel = unlocked): void {
    this.navigationRevision++; this.unlocked = getLevelConfig(unlocked).id; this.collection.refresh(this.unlocked);
    this.page = page; this.levelPage = Math.floor((getLevelConfig(focusLevel).id - 1) / this.levelCards.length);
    this.dialog = null; this.active = true; this.root.active = true; this.dirty = true;
  }
  showPreparation(unlocked:number,id:number):void {
    this.show(unlocked,getLevelConfig(id).mode==="challenge"?"challenge_loadout":"loadout",id);this.preparationId=id;this.selection=readLoadout(id,unlocked);this.replacementSlot=-1;this.selectionHint="";
  }
  showCollection(unlocked: number, tab: CollectionTab): void {
    this.tab = tab==="bosses"?"enemies":tab; this.collectionPage = tab==="bosses"?1:0; this.show(unlocked, "collection");
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
      for (const n of [uiNode(this.pages.get("settings")!,"Dim"),uiNode(this.pages.get("collection")!,"Dim"),uiNode(this.pages.get("challenge_loadout")!,"BattleDim"), ...Array.from(this.dialogs.values()).map(n => uiNode(n, "Dim"))]) {
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
    uiText(page, "Brand", text("ui.redesign.homeTitle"));
    uiText(page,"Progress",text("ui.redesign.progress",this.unlocked,GAME_CONFIG.maxLevels));uiText(page,"CollectionCount",text("ui.redesign.collection",COLLECTION_ENTRIES.filter(e=>this.collection.isUnlocked(e)).length));
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
    const project=([x,y]:readonly number[])=>[projection.position.x+x*projection.scale.x,projection.position.y+y*projection.scale.y];
    layer.clear();for(let i=1;i<level.pathPoints.length;i++){const [x,y]=project(level.pathPoints[i-1]),[bx,by]=project(level.pathPoints[i]);layer.line(x,y,bx,by,road,lineWidth,true);}
    for(const point of level.towerSpots){const [x,y]=project(point);layer.disc(x,y,lineWidth*.22,spots);}layer.end();
    const [x,y]=project(level.pathPoints[level.pathPoints.length-1]);const marker=uiNode(route,"ShopMarker");marker.setPosition(x,y);marker.setSiblingIndex(route.children.length-1);
  }

  private collectionPageView(page: Node): void {
    for (const tab of COLLECTION_TABS) {
      const name = "Tab-" + tab.id, selected = this.tab === tab.id;
      uiNode(page, name + "/Selected").active = selected; uiNode(page, name + "/Normal").active = !selected;
      uiText(page, name + "/Text", tab.label);
      this.bind(page, name, () => { this.tab = tab.id; this.collectionPage = 0; });
    }
    const entries = COLLECTION_ENTRIES.filter(item => item.tab === this.tab || this.tab==="enemies"&&item.tab==="bosses"), firstBoss=entries.findIndex(e=>e.tab==="bosses"),count=this.tab==="enemies"&&firstBoss>0?Math.min(firstBoss,this.collectionCards.length):this.collectionCards.length;
    const pages = Math.max(1, Math.ceil(entries.length / count)); this.collectionPage = Math.max(0, Math.min(this.collectionPage, pages - 1));
    this.collectionCards.forEach((card, i) => {
      const original=this.collectionSlotPositions.get(card.parent!)!;card.parent!.setPosition(original.x,original.y);
      const entry = i<count?entries[this.collectionPage * count + i]:undefined; card.active = Boolean(entry); if (!entry) return;
      const unlocked = this.collection.isUnlocked(entry);
      uiNode(card, "Unlocked").active = unlocked; uiNode(card, "Locked").active = !unlocked;
      uiNode(card, "LockedPortraitBackground").active = !unlocked;
      this.assets.bindImage(uiNode(card, "Portrait"), "menu:" + entry.imageKey, !unlocked);
      uiText(card, "Name", unlocked ? entry.name : text("ui.unknown"));
      this.bind(card, "", () => { this.detailLevel = 1; this.detailBaseLevel = 1; this.dialog = { kind: "entry", entry }; });
    });
    // 未填满的一行按预制体列位置居中，不在代码重复保存美术坐标。
    const grouped=new Map<number,Node[]>();for(const card of this.collectionCards){const y=this.collectionSlotPositions.get(card.parent!)!.y;const group=grouped.get(y)??[];group.push(card);grouped.set(y,group);}
    for(const group of Array.from(grouped.values())){const active=group.filter(n=>n.active);if(!active.length)continue;const shift=(group[0].parent!.position.x+group[group.length-1].parent!.position.x-active[0].parent!.position.x-active[active.length-1].parent!.position.x)/2;for(const card of active)card.parent!.setPosition(card.parent!.position.x+shift,card.parent!.position.y);}
    uiText(page, "Count", text("ui.GameMenuView.026", entries.filter(e => this.collection.isUnlocked(e)).length, entries.length));
    this.pagination(page, this.collectionPage, pages, () => { this.collectionPage--; }, () => { this.collectionPage++; });
  }
  private preparation(page:Node):void {
    if(this.page==="challenge_loadout"){this.challengePreparation(page);return;}
    const id=this.preparationId,level=getLevelConfig(id),pool=loadoutCandidates(id,this.unlocked),count=requiredLoadoutSize(id,this.unlocked);
    this.bind(page,"Back",()=>this.navigate(level.mode==="challenge"?"home":"levels"));uiText(page,"Title",text(level.mode==="challenge"?"challenge.loadout":"ui.loadout.title"));
    uiText(page,"LevelTitle",level.title);uiText(page,"Stats",text("ui.loadout.stats",level.initialCoins,level.waves.length));uiText(page,"Boss",bossWaveText(level));
    const map=uiNode(page,"Map");uiColor(map,"Thumbnail",levelTheme(level).ground);this.routePreview(map,level,true);
    uiText(page,"EnemyTitle",text("ui.loadout.enemies"));const enemies=levelPreview(level).filter(e=>level.mode!=="challenge"||!e.boss),enemySlots=uiNode(page,"Enemies").children;
    enemySlots.forEach((slot,i)=>{const e=enemies[i];slot.active=Boolean(e);if(!e)return;this.assets.bindImage(uiNode(slot,"Icon"),"menu:"+e.imageKey);uiText(slot,"Name",e.name);});
    uiText(page,"SelectedTitle",text("ui.loadout.selected",this.selection.length,count));uiText(page,"Default/Text",text("ui.loadout.default"));
    this.bind(page,"Default",()=>{this.selection=defaultLoadout(id).filter(k=>pool.includes(k));this.replacementSlot=-1;this.selectionHint="";});
    const full=this.selection.length===count;
    uiNode(page,"Selected").children.forEach((slot,i)=>{slot.active=i<count;const kind=this.selection[i];uiNode(slot,"Icon").active=Boolean(kind);if(kind)this.assets.bindImage(uiNode(slot,"Icon"),"menu:"+kind);uiText(slot,"Name",kind?TOWER_CONFIG[kind].name:text("ui.loadout.empty"));uiColor(slot,"Surface",this.replacementSlot===i?"#edc87c":"#e0e7ca");this.bind(slot,"",()=>{if(!kind)return;if(this.replacementSlot===i){this.selection.splice(i,1);this.replacementSlot=-1;}else this.replacementSlot=i;this.selectionHint="";});});
    uiText(page,"Hint",this.selectionHint||(this.replacementSlot>=0?text("ui.loadout.choose"):""));
    this.loadoutCards.forEach((card,i)=>{const kind=pool[i];card.active=Boolean(kind);if(!kind)return;const entry=COLLECTION_ENTRIES.find(e=>e.staffKind===kind)!;
      this.assets.bindImage(uiNode(card,"Icon"),"menu:"+entry.imageKey);uiText(card,"Name",text("ui.evolution.costValue",TOWER_CONFIG[kind].cost)+" "+TOWER_CONFIG[kind].name);uiText(card,"Role",staffRole(kind));uiNode(card,"Selected").active=this.selection.includes(kind);
      // 小详情按钮先于整卡响应；查看不会改变阵容或图鉴收录。
      this.bind(card,"Info",()=>{this.detailLevel=1;this.detailBaseLevel=1;this.dialog={kind:"entry",entry};});
      this.bind(card,"",()=>{const ix=this.selection.indexOf(kind);if(ix>=0){this.selection.splice(ix,1);this.replacementSlot=-1;}else if(this.replacementSlot>=0){this.selection[this.replacementSlot]=kind;this.replacementSlot=-1;}else if(!full)this.selection.push(kind);else{this.selectionHint=text("ui.loadout.replace");return;}this.selectionHint="";});
    });
    uiText(page,"Start/Text",full?text("ui.loadout.start"):text("ui.loadout.need",count-this.selection.length));this.buttonEnabled(page,"Start",full);
    if(validLoadout(id,this.unlocked,this.selection))this.bind(page,"Start",()=>this.startLevel(id,[...this.selection]));
  }
  /** 八选四直接切换勾选；满员后必须先取消，不自动替换玩家刚选定的店员。 */
  private challengePreparation(page:Node):void {
    const id=this.preparationId,pool=loadoutCandidates(id,this.unlocked),count=requiredLoadoutSize(id,this.unlocked),full=this.selection.length===count;
    this.bind(page,"Back",()=>this.navigate("home"));uiText(page,"Title",text("challenge.loadout"));uiText(page,"SelectedTitle",text("ui.loadout.selected",this.selection.length,count));
    uiText(page,"Default/Text",text("ui.loadout.default"));this.bind(page,"Default",()=>{this.selection=defaultLoadout(id).filter(k=>pool.includes(k));this.selectionHint="";});
    uiText(page,"Hint",this.selectionHint||text("ui.redesign.pickHint"));
    this.challengeLoadoutCards.forEach((card,i)=>{const kind=pool[i];card.active=Boolean(kind);if(!kind)return;this.assets.bindImage(uiNode(card,"Icon"),"menu:"+kind);uiText(card,"Name",TOWER_CONFIG[kind].name);uiText(card,"Role",staffRole(kind));uiNode(card,"Selected").active=this.selection.includes(kind);
      this.bind(card,"",()=>{const index=this.selection.indexOf(kind);if(index>=0)this.selection.splice(index,1);else if(!full)this.selection.push(kind);else{this.selectionHint=text("ui.redesign.pickFull");return;}this.selectionHint="";});
    });
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
    this.assets.bindImage(uiNode(page,"Portrait"),"menu:"+(evolution?.imageKey??entry.imageKey),!unlocked);
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
