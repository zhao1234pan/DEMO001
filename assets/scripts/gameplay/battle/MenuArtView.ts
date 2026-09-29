import { assetManager, AssetManager, Color, Layers, Node, Rect, Size, Sprite, SpriteFrame, Texture2D, UITransform, Vec2 } from "cc";

export type MenuIconKind = "sprout" | "frost" | "bloom" | "enemy_normal" | "enemy_swift" | "enemy_tank" | "shop" | "entry" | "tree";

interface IconEntry {
  node: Node;
  sprite: Sprite;
  transform: UITransform;
  frame: number;
}

const ATLAS_PIXELS = 512;
const FRAME_PIXELS = 192;
const FRAME_ORIGINS: readonly (readonly [number, number])[] = [[8, 8], [216, 8], [8, 216]];

/**
 * 主界面和图鉴的共享精灵层，不处理解锁和输入。
 * 在动态图形之后、文字之前创建本层；调用方只提交当前可见图标，弹窗下的旧图标会自动回收。
 */
export class MenuArtView {
  private readonly root: Node;
  private readonly active = new Map<string, IconEntry>();
  private readonly free: IconEntry[] = [];
  private readonly frames = new Map<MenuIconKind, SpriteFrame>();
  private readonly textures: Texture2D[] = [];
  private loading: Promise<void> | null = null;
  private frameIndex = 0;
  private loaded = false;
  private disposed = false;

  constructor(parent: Node, private readonly width: number, private readonly height: number) {
    this.root = new Node("MenuArtView");
    this.root.layer = Layers.Enum.UI_2D;
    this.root.addComponent(UITransform).setContentSize(width, height);
    parent.addChild(this.root);
  }

  get ready(): boolean { return this.loaded && !this.disposed; }

  /** 同一实例只发起一组加载；失败保留文字和程序底板，不阻断战斗。 */
  load(): Promise<void> {
    if (this.disposed) return Promise.resolve();
    if (!this.loading) this.loading = this.loadAssets();
    return this.loading;
  }

  beginFrame(): void {
    if (!this.disposed) this.frameIndex += 1;
  }

  /** x/y为左上原点、向下为正的逻辑坐标；size是逻辑边长，不再乘设计分辨率比例。 */
  drawIcon(key: string, kind: MenuIconKind, x: number, y: number, size: number, silhouette = false): void {
    if (!this.ready || !Number.isFinite(size) || size <= 0 || !Number.isFinite(x) || !Number.isFinite(y)) return;
    const frame = this.frames.get(kind);
    if (!frame) return;
    let entry = this.active.get(key);
    if (!entry) {
      entry = this.free.pop() ?? this.createEntry();
      this.active.set(key, entry);
    }
    entry.frame = this.frameIndex;
    entry.node.active = true;
    entry.sprite.spriteFrame = frame;
    entry.sprite.color = silhouette ? new Color(0, 0, 0, 255) : Color.WHITE;
    entry.transform.setContentSize(size, size);
    entry.node.setPosition(x - this.width / 2, this.height / 2 - y);
    // 本层没有Graphics的负Y缩放，UI图标始终居中、正向显示；未解锁时只保留原图Alpha剪影。
    entry.node.setScale(1, 1, 1);
  }

  endFrame(): void {
    if (this.disposed) return;
    for (const [key, entry] of this.active) {
      if (entry.frame === this.frameIndex) continue;
      entry.node.active = false;
      this.active.delete(key);
      this.free.push(entry);
    }
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.loaded = false;
    // 节点销毁在引擎帧末生效，先解绑图标，避免已释放的帧仍被本层Sprite引用。
    for (const entry of this.active.values()) entry.sprite.spriteFrame = null;
    for (const entry of this.free) entry.sprite.spriteFrame = null;
    this.root.destroy();
    this.active.clear();
    this.free.length = 0;
    this.releaseAssets();
  }

  private createEntry(): IconEntry {
    const node = new Node("MenuIcon");
    node.layer = Layers.Enum.UI_2D;
    const transform = node.addComponent(UITransform);
    transform.setAnchorPoint(0.5, 0.5);
    const sprite = node.addComponent(Sprite);
    sprite.type = Sprite.Type.SIMPLE;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    this.root.addChild(node);
    return { node, sprite, transform, frame: -1 };
  }

  private async loadAssets(): Promise<void> {
    try {
      const bundle = assetManager.getBundle("battle_art") ?? await new Promise<AssetManager.Bundle | null>((resolve) => {
        assetManager.loadBundle("battle_art", (error, result) => resolve(error ? null : result));
      });
      if (!bundle || this.disposed) return;
      // 所有回调落定后才启用图标层，避免出现只加载一半的图鉴。
      const loaded = await Promise.all([
        this.loadTexture(bundle, "gameplay/towers/atlas_staff_idle/texture"),
        this.loadTexture(bundle, "gameplay/enemies/atlas_enemies/texture"),
        this.loadTexture(bundle, "gameplay/maps/atlas_battle_scenery/texture"),
      ]);
      if (this.disposed || loaded.some((texture) => !texture)) {
        this.releaseAssets();
        if (!this.disposed) console.warn("主界面图标未完整加载，继续使用文字按钮。");
        return;
      }
      if (loaded.some((texture) => texture!.width !== ATLAS_PIXELS || texture!.height !== ATLAS_PIXELS)) {
        throw new Error("主界面图集尺寸应为512×512，请核对运行资源导出。");
      }
      this.addFrames(loaded[0]!, ["sprout", "frost", "bloom"]);
      this.addFrames(loaded[1]!, ["enemy_normal", "enemy_swift", "enemy_tank"], 168, [[4, 4], [172, 4], [340, 4]]);
      this.addFrames(loaded[2]!, ["entry", "shop"], 224, [[16, 0], [272, 0]]);
      this.addFrames(loaded[2]!, ["tree"], 224, [[192, 224]]);
      this.loaded = true;
    } catch (error) {
      this.releaseAssets();
      if (!this.disposed) console.warn("主界面图标加载失败，继续使用文字按钮。", error);
    }
  }

  private loadTexture(bundle: AssetManager.Bundle, assetPath: string): Promise<Texture2D | null> {
    return new Promise((resolve) => {
      let settled = false;
      try {
        bundle.load(assetPath, Texture2D, (error, texture) => {
          if (settled) return;
          settled = true;
          if (error || !texture) { resolve(null); return; }
          texture.addRef();
          // 每张图到达即记录所有权；提前销毁时释放已到图，晚到图也立即归还引用。
          if (this.disposed) { texture.decRef(); resolve(null); return; }
          this.textures.push(texture);
          resolve(texture);
        });
      } catch {
        settled = true;
        resolve(null);
      }
    });
  }

  private addFrames(texture: Texture2D, kinds: readonly MenuIconKind[], pixels = FRAME_PIXELS, origins: readonly (readonly [number, number])[] = FRAME_ORIGINS): void {
    kinds.forEach((kind, index) => {
      const [x, y] = origins[index];
      const frame = new SpriteFrame();
      this.frames.set(kind, frame);
      // PNG均按左上原点导出且导入flipVertical=false，不能用整体Y翻转代替正确切片。
      frame.reset({
        texture,
        rect: new Rect(x, y, pixels, pixels),
        originalSize: new Size(pixels, pixels),
        offset: new Vec2(0, 0),
        isRotate: false,
        isFlipUv: false,
      }, true);
      frame.packable = false;
    });
  }

  private releaseAssets(): void {
    for (const frame of this.frames.values()) frame.destroy();
    this.frames.clear();
    // 与战场店员共用纹理时只归还本实例addRef，不释放整个Bundle或其他表现层的资源。
    for (const texture of this.textures) texture.decRef();
    this.textures.length = 0;
  }
}
