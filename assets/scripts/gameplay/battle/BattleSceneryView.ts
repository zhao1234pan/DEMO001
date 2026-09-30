import { text, rows, numeric } from "../../config/ConfigTables";
import { assetManager, AssetManager, Color, Layers, Node, Rect, Size, Sprite, SpriteFrame, Texture2D, UITransform, Vec2 } from "cc";
import type { MapPoint } from "./LevelConfig";
import type { SceneDecoration } from "./BattleSceneryLayout";

type SceneryKind = "entry" | "goal" | "planter" | "tree";
interface ScenerySprite { node: Node; sprite: Sprite; transform: UITransform; }
interface SceneSnapshot { entry: MapPoint; goal: MapPoint; decorations: readonly SceneDecoration[]; }

/** 静态场景表现层：父节点由调用方放在道路之上、战斗单位之下，不处理碰撞与寻路。 */
export class BattleSceneryView {
  private readonly root: Node;
  private readonly foliageRoot: Node;
  private readonly landmarkRoot: Node;
  private readonly foliageSprites: ScenerySprite[] = [];
  private readonly frames = new Map<string, SpriteFrame>();
  private entrySprite: ScenerySprite | null = null;
  private goalSprite: ScenerySprite | null = null;
  private latestScene: SceneSnapshot | null = null;
  private texture: Texture2D | null = null;
  private loading: Promise<void> | null = null;
  private loaded = false;
  private disposed = false;

  constructor(parent: Node, private readonly width: number, private readonly height: number) {
    this.root = this.createLayer("BattleSceneryView", parent);
    // 非交互绿化固定在地标下方，重用节点或切关时也不会颠倒静态层级。
    this.foliageRoot = this.createLayer("SceneryFoliage", this.root);
    this.landmarkRoot = this.createLayer("SceneryLandmarks", this.root);
  }

  get ready(): boolean { return this.loaded && !this.disposed; }

  load(): Promise<void> {
    if (this.disposed) return Promise.resolve();
    if (!this.loading) this.loading = this.loadAssets();
    return this.loading;
  }

  /** 坐标沿用地图左上原点、Y向下；复制快照，异步完成时只重画最新一关。 */
  setScene(entry: MapPoint, goal: MapPoint, decorations: readonly SceneDecoration[]): void {
    if (this.disposed) return;
    this.latestScene = {
      entry: [entry[0], entry[1]],
      goal: [goal[0], goal[1]],
      // 保存独立快照，避免加载期间外部切关或复用数组改变旧请求的数据。
      decorations: decorations.filter((item) => ["planter", "tree"].includes(item.kind)
        && item.position.every(Number.isFinite) && Number.isFinite(item.width) && Number.isFinite(item.height)
        && item.width > 0 && item.height > 0)
        .map((item) => ({ ...item, position: [item.position[0], item.position[1]] as MapPoint })),
    };
    this.redraw();
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.loaded = false;
    this.latestScene = null;
    // Node销毁延迟到帧尾，先解绑Sprite，避免纹理归还后仍被本层渲染组件引用。
    if (this.entrySprite) this.entrySprite.sprite.spriteFrame = null;
    if (this.goalSprite) this.goalSprite.sprite.spriteFrame = null;
    for (const item of this.foliageSprites) item.sprite.spriteFrame = null;
    this.root.destroy();
    this.entrySprite = null;
    this.goalSprite = null;
    this.foliageSprites.length = 0;
    this.releaseAssets();
  }

  private createLayer(name: string, parent: Node): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.addComponent(UITransform).setContentSize(this.width, this.height);
    parent.addChild(node);
    return node;
  }

  private createSprite(kind: SceneryKind, parent: Node): ScenerySprite {
    const node = new Node(`Scenery_${kind}`);
    node.layer = Layers.Enum.UI_2D;
    const transform = node.addComponent(UITransform);
    transform.setAnchorPoint(0.5, 0.5);
    const sprite = node.addComponent(Sprite);
    sprite.type = Sprite.Type.SIMPLE;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.color = Color.WHITE;
    sprite.spriteFrame = this.frames.get(kind)!;
    parent.addChild(node);
    return { node, sprite, transform };
  }

  private place(item: ScenerySprite, point: MapPoint, width: number, height: number, offsetY: number): void {
    const valid = Number.isFinite(point[0]) && Number.isFinite(point[1]);
    item.node.active = valid;
    if (!valid) return;
    item.transform.setContentSize(width, height);
    item.node.setPosition(point[0] - this.width / 2, this.height / 2 - point[1] - offsetY);
    item.node.setScale(1, 1, 1);
  }

  private redraw(): void {
    const scene = this.latestScene;
    if (!this.ready || !scene) return;
    this.entrySprite ??= this.createSprite("entry", this.landmarkRoot);
    this.goalSprite ??= this.createSprite("goal", this.landmarkRoot);
    // 入口、终点画布中心下移6逻辑像素，让短门槛接上路线而非把主体顶到HUD。
    this.place(this.entrySprite, scene.entry, 64, 56, 6);
    this.place(this.goalSprite, scene.goal, 64, 56, 6);
    scene.decorations.forEach((decoration, index) => {
      const item = this.foliageSprites[index] ?? this.createSprite(decoration.kind, this.foliageRoot);
      this.foliageSprites[index] = item;
      // 同一个池节点切关后可能由花池变为树，必须同时换帧与尺寸，不能把高树压扁。
      item.sprite.spriteFrame = this.frames.get(decoration.kind)!;
      this.place(item, decoration.position, decoration.width, decoration.height, 0);
    });
    // 切换装饰较少的关卡时只停用多余节点，随后切关继续复用。
    for (let i = scene.decorations.length; i < this.foliageSprites.length; i += 1) this.foliageSprites[i].node.active = false;
  }

  private async loadAssets(): Promise<void> {
    try {
      const bundle = assetManager.getBundle("battle_art") ?? await new Promise<AssetManager.Bundle | null>((resolve) => {
        assetManager.loadBundle("battle_art", (error, value) => resolve(error ? null : value));
      });
      if (!bundle || this.disposed) return;
      const texture = await this.loadTexture(bundle);
      if (!texture || this.disposed) return;
      if (texture.width !== numeric(rows("ArtAtlas").find(r=>r.key==="scenery")!,"width") || texture.height !== numeric(rows("ArtAtlas").find(r=>r.key==="scenery")!,"height")) throw new Error(text("ui.BattleSceneryView.001"));
      rows("ArtFrame").filter(row=>row.scenery).forEach(row => {
        const kind=row.scenery; const x=numeric(row,"x"),y=numeric(row,"y"),width=numeric(row,"width"),height=numeric(row,"height");
        const frame = new SpriteFrame();
        this.frames.set(kind, frame);
        // 与PNG左上原点一致；导入meta必须flipVertical=false，不能翻转整幅图集。
        frame.reset({ texture, rect: new Rect(x, y, width, height), originalSize: new Size(width, height),
          offset: new Vec2(0, 0), isRotate: false, isFlipUv: false }, true);
        frame.packable = false;
      });
      this.loaded = true;
      this.redraw();
    } catch (error) {
      this.loaded = false;
      this.releaseAssets();
      if (!this.disposed) console.warn(text("ui.BattleSceneryView.002"), error);
    }
  }

  private loadTexture(bundle: AssetManager.Bundle): Promise<Texture2D | null> {
    return new Promise((resolve) => {
      let settled = false;
      try {
        bundle.load(rows("ArtAtlas").find(row=>row.key==="scenery")!.path, Texture2D, (error, texture) => {
          if (settled) return;
          settled = true;
          if (error || !texture) { resolve(null); return; }
          texture.addRef();
          // 销毁先于异步回调时立即归还晚到纹理，不在已销毁场景下创建节点。
          if (this.disposed) { texture.decRef(); resolve(null); return; }
          this.texture = texture;
          resolve(texture);
        });
      } catch { settled = true; resolve(null); }
    });
  }

  private releaseAssets(): void {
    for (const frame of this.frames.values()) frame.destroy();
    this.frames.clear();
    this.texture?.decRef();
    this.texture = null;
  }
}
