import { assetManager, AssetManager, Color, Layers, Node, Rect, Size, Sprite, SpriteFrame, Texture2D, UITransform, Vec2 } from "cc";
import type { MapPoint } from "./LevelConfig";
import type { MapSkin } from "./BattleMapSkin";

type SceneryKind = "entry" | "goal" | "foliage";
interface ScenerySprite { node: Node; sprite: Sprite; transform: UITransform; }
interface SceneSnapshot { entry: MapPoint; goal: MapPoint; foliage: readonly MapPoint[]; }

const ATLAS_PIXELS = 512;
// 纹理按逻辑画布的4倍导出；切片内部自带透明边距，不把大源图直接载入游戏。
const FRAME_RECTS: Record<SceneryKind, readonly [number, number, number, number]> = {
  entry: [0, 0, 256, 224],
  goal: [256, 0, 256, 224],
  foliage: [0, 224, 192, 160],
};

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
  private reviewTexture: Texture2D | null = null;
  private loading: Promise<void> | null = null;
  private loaded = false;
  private disposed = false;

  constructor(parent: Node, private readonly width: number, private readonly height: number, private readonly skin: MapSkin = "classic") {
    this.root = this.createLayer("BattleSceneryView", parent);
    // 草丛固定在地标下方，重用节点或切关时也不会颠倒静态层级。
    this.foliageRoot = this.createLayer("SceneryFoliage", this.root);
    this.landmarkRoot = this.createLayer("SceneryLandmarks", this.root);
  }

  get ready(): boolean { return this.loaded && !this.disposed; }
  get reviewReady(): boolean { return this.ready && (this.skin === "classic" || this.frames.has(`foliage-${this.skin}`)); }

  load(): Promise<void> {
    if (this.disposed) return Promise.resolve();
    if (!this.loading) this.loading = this.loadAssets();
    return this.loading;
  }

  /** 坐标沿用地图左上原点、Y向下；复制快照，异步完成时只重画最新一关。 */
  setScene(entry: MapPoint, goal: MapPoint, foliage: readonly MapPoint[]): void {
    if (this.disposed) return;
    this.latestScene = {
      entry: [entry[0], entry[1]],
      goal: [goal[0], goal[1]],
      foliage: foliage.filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]))
        .map((point): MapPoint => [point[0], point[1]]),
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
    sprite.spriteFrame = (kind === "foliage" ? this.frames.get(`foliage-${this.skin}`) : null) ?? this.frames.get(kind)!;
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
    scene.foliage.forEach((point, index) => {
      const item = this.foliageSprites[index] ?? this.createSprite("foliage", this.foliageRoot);
      this.foliageSprites[index] = item;
      this.place(item, point, 48, 40, 0);
    });
    // 切换装饰较少的关卡时只停用多余节点，随后切关继续复用。
    for (let i = scene.foliage.length; i < this.foliageSprites.length; i += 1) this.foliageSprites[i].node.active = false;
  }

  private async loadAssets(): Promise<void> {
    try {
      const bundle = assetManager.getBundle("battle_art") ?? await new Promise<AssetManager.Bundle | null>((resolve) => {
        assetManager.loadBundle("battle_art", (error, value) => resolve(error ? null : value));
      });
      if (!bundle || this.disposed) return;
      const texture = await this.loadTexture(bundle);
      if (!texture || this.disposed) return;
      if (texture.width !== ATLAS_PIXELS || texture.height !== ATLAS_PIXELS) throw new Error("场景图集必须为512×512。");
      (Object.keys(FRAME_RECTS) as SceneryKind[]).forEach((kind) => {
        const [x, y, width, height] = FRAME_RECTS[kind];
        const frame = new SpriteFrame();
        this.frames.set(kind, frame);
        // 与PNG左上原点一致；导入meta必须flipVertical=false，不能翻转整幅图集。
        frame.reset({ texture, rect: new Rect(x, y, width, height), originalSize: new Size(width, height),
          offset: new Vec2(0, 0), isRotate: false, isFlipUv: false }, true);
        frame.packable = false;
      });
      if (this.skin !== "classic") {
        // 候选资源只在独立评审请求下加载；默认版本仍只依赖原有场景图集。
        const review = await this.loadTexture(bundle, true);
        if (this.disposed) return;
        if (review && review.width === ATLAS_PIXELS && review.height === ATLAS_PIXELS) {
          ["meadow", "courtyard", "storybook"].forEach((skin, index) => {
            const frame = new SpriteFrame(); this.frames.set(`foliage-${skin}`, frame);
            frame.reset({ texture: review, rect: new Rect(index * 128, 0, 128, 128), originalSize: new Size(128, 128),
              offset: new Vec2(0, 0), isRotate: false, isFlipUv: false }, true);
            frame.packable = false;
          });
        } else console.warn("候选灌木未就绪，保留原有资源；评审截图暂不可导出。");
      }
      this.loaded = true;
      this.redraw();
    } catch (error) {
      this.loaded = false;
      this.releaseAssets();
      if (!this.disposed) console.warn("场景美术加载失败，保留地图和程序地标。", error);
    }
  }

  private loadTexture(bundle: AssetManager.Bundle, review = false): Promise<Texture2D | null> {
    return new Promise((resolve) => {
      let settled = false;
      try {
        bundle.load(review ? "gameplay/maps/atlas_map_review_foliage/texture" : "gameplay/maps/atlas_battle_scenery/texture", Texture2D, (error, texture) => {
          if (settled) return;
          settled = true;
          if (error || !texture) { resolve(null); return; }
          texture.addRef();
          // 销毁先于异步回调时立即归还晚到纹理，不在已销毁场景下创建节点。
          if (this.disposed) { texture.decRef(); resolve(null); return; }
          if (review) this.reviewTexture = texture;
          else this.texture = texture;
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
    this.reviewTexture?.decRef();
    this.reviewTexture = null;
  }
}
