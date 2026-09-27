import { assetManager, AssetManager, Color, Layers, Node, Rect, Size, Sprite, SpriteFrame, Texture2D, UITransform, Vec2 } from "cc";

export interface TowerArtState {
  x: number; y: number; kind: string; level: number; angle: number; recoil: number;
}
export interface ObstacleArtState {
  x: number; y: number; kind: string; hitFlash: number;
}
interface SpriteEntry {
  node: Node; sprite: Sprite; transform: UITransform; frame: number; depth: number;
}
interface SpritePool {
  root: Node; active: Map<object, SpriteEntry>; free: SpriteEntry[];
}
const CELL_PIXELS = 192;
const CANVAS_DESIGN_PIXELS = 96;
const WARM_HIT = new Color(255, 216, 168, 255);
// 来自本轮导出清单；兔耳和工具更宽，升级时也要给相邻网格留出轮廓间隙。
const STAFF_DESIGN_WIDTH = { doubao: 73.5, mianmian: 80, buding: 62.5 };

/** 只负责精灵表现；输入为左上原点、向下为正的逻辑坐标，父节点统一缩放。 */
export class BattleArtView {
  private readonly root: Node;
  private readonly pads: SpritePool;
  private readonly units: SpritePool;
  private readonly frames = new Map<string, SpriteFrame>();
  private readonly visibleUnits: SpriteEntry[] = [];
  private textures: Texture2D[] = [];
  private loading: Promise<void> | null = null;
  private frameIndex = 0;
  private loaded = false;
  private disposed = false;
  private readonly logicalPerDesignPixel: number;

  constructor(parent: Node, private readonly width: number, private readonly height: number) {
    this.logicalPerDesignPixel = width / 750;
    this.root = new Node("BattleArtView");
    this.root.layer = Layers.Enum.UI_2D;
    this.root.addComponent(UITransform).setContentSize(width, height);
    parent.addChild(this.root);
    // 固定底座、单位两层，后绘制的空位不会盖住已建成店员。
    this.pads = this.makePool("BuildPads");
    this.units = this.makePool("StaffAndObstacles");
  }
  get ready(): boolean { return this.loaded && !this.disposed; }

  /** 加载失败不抛到战斗主循环；调用方根据 ready 保留原有程序图形。 */
  load(): Promise<void> {
    if (!this.loading && !this.disposed) this.loading = this.loadAssets();
    return this.loading ?? Promise.resolve();
  }
  beginFrame(): void {
    this.frameIndex += 1;
    this.visibleUnits.length = 0;
  }
  drawPad(key: object, x: number, y: number): void {
    if (!this.ready) return;
    const entry = this.acquire(this.pads, key, "pad", true);
    const size = CANVAS_DESIGN_PIXELS * this.logicalPerDesignPixel;
    entry.transform.setContentSize(size, size);
    entry.node.setPosition(x - this.width / 2, this.height / 2 - y - 2);
    entry.node.setScale(1, 1, 1);
    entry.sprite.color = Color.WHITE;
  }
  drawTower(key: object, state: TowerArtState): void {
    if (!this.ready) return;
    const kind = state.kind === "frost" ? "mianmian" : state.kind === "bloom" ? "buding" : "doubao";
    const entry = this.acquire(this.units, key, kind, false);
    // 升级仅小幅放大，最高级主体不超过约 88 设计像素。
    const levelScale = 1 + (Math.min(3, Math.max(1, state.level)) - 1) * 0.1;
    const scale = Math.min(levelScale, 88 / STAFF_DESIGN_WIDTH[kind]);
    const facing = Math.cos(state.angle) < 0 ? -1 : 1;
    const recoil = state.recoil > 0 ? 1 : 0;
    this.placeUnit(entry, state.x - facing * recoil * 1.1, state.y, 8, scale);
    // 合并图只水平镜像，不能按旧炮管角度整体旋转动物。
    entry.node.setScale(facing, recoil ? 0.97 : 1, 1);
    entry.sprite.color = Color.WHITE;
  }
  drawObstacle(key: object, state: ObstacleArtState): void {
    if (!this.ready) return;
    const kind = state.kind === "crate" || state.kind === "basket" ? state.kind : "plant";
    const entry = this.acquire(this.units, key, kind, false);
    this.placeUnit(entry, state.x, state.y, 9, 1);
    entry.node.setScale(1, 1, 1);
    entry.sprite.color = state.hitFlash > 0 ? WARM_HIT : Color.WHITE;
  }
  endFrame(): void {
    if (this.disposed) return;
    this.recycleUnused(this.pads);
    this.recycleUnused(this.units);
    // 复用排序数组，脚底靠下的单位在前景，避免棋盘穿插错层。
    this.visibleUnits.sort((a, b) => a.depth - b.depth);
    this.visibleUnits.forEach((entry, i) => {
      if (entry.node.getSiblingIndex() !== i) entry.node.setSiblingIndex(i);
    });
  }
  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.loaded = false;
    this.root.destroy();
    this.pads.active.clear(); this.pads.free.length = 0;
    this.units.active.clear(); this.units.free.length = 0;
    this.visibleUnits.length = 0;
    this.releaseAssets();
  }
  private makePool(name: string): SpritePool {
    const root = new Node(name);
    root.layer = Layers.Enum.UI_2D;
    root.addComponent(UITransform).setContentSize(this.width, this.height);
    this.root.addChild(root);
    return { root, active: new Map<object, SpriteEntry>(), free: [] };
  }
  private acquire(pool: SpritePool, key: object, name: string, centered: boolean): SpriteEntry {
    let entry = pool.active.get(key);
    if (!entry) {
      entry = pool.free.pop();
      if (!entry) {
        const node = new Node(centered ? "BuildPad" : "BattleUnit");
        node.layer = Layers.Enum.UI_2D;
        const transform = node.addComponent(UITransform);
        // 导出画布底部留 8 设计像素，单位锚点统一在脚底。
        transform.setAnchorPoint(0.5, centered ? 0.5 : 8 / CANVAS_DESIGN_PIXELS);
        const sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        pool.root.addChild(node);
        entry = { node, sprite, transform, frame: -1, depth: 0 };
      }
      pool.active.set(key, entry);
    }
    entry.node.active = true;
    entry.sprite.spriteFrame = this.frames.get(name)!;
    entry.frame = this.frameIndex;
    return entry;
  }
  private placeUnit(entry: SpriteEntry, x: number, y: number, footOffset: number, scale: number): void {
    const size = CANVAS_DESIGN_PIXELS * this.logicalPerDesignPixel * scale;
    entry.transform.setContentSize(size, size);
    entry.node.setPosition(x - this.width / 2, this.height / 2 - y - footOffset);
    entry.depth = y;
    this.visibleUnits.push(entry);
  }
  private recycleUnused(pool: SpritePool): void {
    for (const [key, entry] of pool.active) {
      if (entry.frame === this.frameIndex) continue;
      entry.node.active = false;
      pool.active.delete(key);
      pool.free.push(entry);
    }
  }
  private async loadAssets(): Promise<void> {
    try {
      const bundle = assetManager.getBundle("battle_art") ?? await new Promise<AssetManager.Bundle | null>((resolve) => {
        assetManager.loadBundle("battle_art", (error, result) => resolve(error ? null : result));
      });
      if (!bundle || this.disposed) return;
      // 全部请求结束后统一处理；单项失败也不会遗失晚到纹理的引用。
      const loaded = await Promise.all([
        this.loadTexture(bundle, "gameplay/towers/atlas_staff_idle/texture"),
        this.loadTexture(bundle, "gameplay/maps/atlas_battle_props/texture"),
      ]);
      this.textures = loaded.filter((texture): texture is Texture2D => texture !== null);
      if (this.disposed || loaded.some((texture) => !texture)) {
        this.releaseAssets();
        if (!this.disposed) console.warn("战斗美术未完整加载，继续使用程序图形。");
        return;
      }
      this.addFrames(loaded[0]!, ["doubao", "mianmian", "buding"]);
      this.addFrames(loaded[1]!, ["pad", "crate", "basket", "plant"]);
      this.loaded = true;
    } catch (error) {
      this.releaseAssets();
      console.warn("战斗美术加载失败，继续使用程序图形。", error);
    }
  }
  private loadTexture(bundle: AssetManager.Bundle, path: string): Promise<Texture2D | null> {
    return new Promise((resolve) => {
      try {
        bundle.load(path, Texture2D, (error, texture) => {
          if (error || !texture) { resolve(null); return; }
          texture.addRef();
          resolve(texture);
        });
      } catch { resolve(null); }
    });
  }
  private addFrames(texture: Texture2D, names: string[]): void {
    names.forEach((name, index) => {
      const frame = new SpriteFrame();
      // 图集导入必须 flipVertical=false，切片坐标与PNG一致为左上原点。
      // 翻转整张图集会把另一行的素材读入当前帧，不能仅靠翻转帧UV补救。
      frame.reset({
        texture,
        rect: new Rect(8 + (index % 2) * 208, 8 + Math.floor(index / 2) * 208, CELL_PIXELS, CELL_PIXELS),
        originalSize: new Size(CELL_PIXELS, CELL_PIXELS),
        offset: new Vec2(0, 0),
        isRotate: false,
        isFlipUv: false,
      }, true);
      frame.packable = false;
      this.frames.set(name, frame);
    });
  }
  private releaseAssets(): void {
    for (const frame of this.frames.values()) frame.destroy();
    this.frames.clear();
    for (const texture of this.textures) texture.decRef();
    this.textures = [];
  }
}
