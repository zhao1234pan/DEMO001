import { text, rows, numeric } from "../../config/ConfigTables";
import type { TowerKind, EnemyKind } from "./GameConfig";
import { assetManager, AssetManager, Color, Layers, Node, Rect, Size, Sprite, SpriteFrame, Texture2D, UITransform, Vec2 } from "cc";

export type BattleIconKind = "freeze" | "clear" | "cash" | TowerKind;

interface IconEntry {
  node: Node;
  sprite: Sprite;
  transform: UITransform;
  frame: number;
}


/**
 * 战斗菜单与道具图标层，不处理输入、价格或奖励规则。
 * 在动态图形之后、文字之前创建本层；调用方只提交当前可见图标，弹窗下的旧图标会自动回收。
 */
export class BattleUiView {
  private readonly root: Node;
  private readonly active = new Map<string, IconEntry>();
  private readonly free: IconEntry[] = [];
  private readonly frames = new Map<BattleIconKind, SpriteFrame>();
  private readonly textures: Texture2D[] = [];
  private loading: Promise<void> | null = null;
  private frameIndex = 0;
  private loaded = false;
  private disposed = false;

  constructor(parent: Node, private readonly width: number, private readonly height: number) {
    this.root = new Node("BattleUiView");
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
  drawIcon(key: string, kind: BattleIconKind, x: number, y: number, size: number): void {
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
    entry.sprite.color = Color.WHITE;
    entry.transform.setContentSize(size, size);
    entry.node.setPosition(x - this.width / 2, this.height / 2 - y);
    // 本层没有Graphics的负Y缩放，UI图标始终居中、正向显示，不随店员攻击方向镜像。
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
    const node = new Node("BattleUiIcon");
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
      // 所有回调落定后才启用图标层，避免出现只加载一半的道具菜单。
      const frameRows=rows("ArtFrame").filter(row=>row.ui);
      const atlasRows=rows("ArtAtlas").filter(row=>frameRows.some(frame=>frame.atlas===row.key));
      const loaded=await Promise.all(atlasRows.map(row=>this.loadTexture(bundle,row.path)));
      if (this.disposed || loaded.some((texture) => !texture)) {
        this.releaseAssets();
        if (!this.disposed) console.warn(text("ui.BattleUiView.001"));
        return;
      }
      if (loaded.some((texture,i) => texture!.width !== numeric(atlasRows[i],"width") || texture!.height !== numeric(atlasRows[i],"height"))) {
        throw new Error(text("ui.BattleUiView.002"));
      }
      for(const row of frameRows) {
        const texture=loaded[atlasRows.findIndex(atlas=>atlas.key===row.atlas)]!;
        const frame=new SpriteFrame(),width=numeric(row,"width"),height=numeric(row,"height");
        frame.reset({texture,rect:new Rect(numeric(row,"x"),numeric(row,"y"),width,height),originalSize:new Size(width,height),offset:new Vec2(0,0),isRotate:false,isFlipUv:false},true); frame.packable=false;
        this.frames.set(row.ui as BattleIconKind,frame);
      }
      this.loaded = true;
    } catch (error) {
      this.releaseAssets();
      if (!this.disposed) console.warn(text("ui.BattleUiView.003"), error);
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

  private releaseAssets(): void {
    for (const frame of this.frames.values()) frame.destroy();
    this.frames.clear();
    // 与战场店员共用纹理时只归还本实例addRef，不释放整个Bundle或其他表现层的资源。
    for (const texture of this.textures) texture.decRef();
    this.textures.length = 0;
  }
}
