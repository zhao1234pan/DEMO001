import { UiPrefabs } from "../../ui/UiPrefabs";
import { text, rows, numeric } from "../../config/ConfigTables";
import type { TowerKind, EnemyKind } from "./GameConfig";
import { Color, Layers, Node, Sprite, SpriteFrame, UITransform } from "cc";

export type MenuIconKind = TowerKind | `enemy_${EnemyKind}` | "shop" | "entry" | "tree";

interface IconEntry {
  node: Node;
  sprite: Sprite;
  transform: UITransform;
  frame: number;
}


/**
 * 主界面和图鉴的共享精灵层，不处理解锁和输入。
 * 在动态图形之后、文字之前创建本层；调用方只提交当前可见图标，弹窗下的旧图标会自动回收。
 */
export class MenuArtView {
  private readonly root: Node;
  private readonly active = new Map<string, IconEntry>();
  private readonly free: IconEntry[] = [];
  private readonly frames = new Map<MenuIconKind, SpriteFrame>();
  private loading: Promise<void> | null = null;
  private frameIndex = 0;
  private loaded = false;
  private disposed = false;

  constructor(parent: Node, private readonly width: number, private readonly height: number, private readonly assets:UiPrefabs) {
    this.root = new Node("MenuArtView");
    this.root.layer = Layers.Enum.UI_2D;
    this.root.addComponent(UITransform).setContentSize(width, height);
    parent.addChild(this.root);
    for(const row of rows("ArtFrame").filter(r=>r.menu))this.frames.set(row.menu as MenuIconKind,assets.frame("menu:"+row.menu));this.loaded=true;

  }

  get ready(): boolean { return this.loaded && !this.disposed; }

  /** 资源由启动阶段统一准备，本层复用已导入的PNG切片。 */
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
    // 本层没有负Y缩放，UI图标始终居中、正向显示；未解锁时只保留原图Alpha剪影。
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

  private async loadAssets():Promise<void> {}
  // 共享切片由UiPrefabs统一持有，本层仅归还节点引用。
  private releaseAssets():void {this.frames.clear();}
}
