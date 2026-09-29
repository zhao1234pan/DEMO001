import { assetManager, AssetManager, Color, instantiate, Label, Node, Prefab, Rect, resources, Size, Sprite, SpriteFrame, Texture2D, UITransform, Vec2, Vec3 } from "cc";
import { numeric, rows } from "../config/ConfigTables";
import { UiImage } from "./UiImage";
import { UiShape } from "./UiShape";
import { UiText } from "./UiText";
import type { HitRect } from "../gameplay/battle/BattleLayout";

/** 一次启动持有一组UI资源；预制体实例销毁后归还，加载失败可重试。 */
export class UiPrefabs {
  private readonly prefabs = new Map<string, Prefab>();
  private readonly frames = new Map<string, SpriteFrame>();
  private readonly textures: Texture2D[] = [];
  private disposed = false;
  private readonly sprites = new Set<Sprite>();
  private constructor() {}

  static async load(): Promise<UiPrefabs> {
    const result = new UiPrefabs();
    try {
      const bundle = assetManager.getBundle("battle_art") ?? await new Promise<AssetManager.Bundle>((resolve, reject) => {
        assetManager.loadBundle("battle_art", (error, value) => error ? reject(error) : resolve(value));
      });

      // 等待全部回调落定，再统一释放失败批次，避免晚到回调泄漏资源引用。
      const loaded = await Promise.all(rows("UiPrefab").map(row => new Promise<Prefab>((resolve, reject) => {
        resources.load(row.path, Prefab, (error, asset) => {
          if (error || !asset) { reject(error || new Error(`Missing prefab: ${row.key}`)); return; }
          asset.addRef(); result.prefabs.set(row.key, asset); resolve(asset);
        });
      }).then(() => null, error => error)));
      if (loaded.some(error => error)) throw loaded.find(error => error);
      const atlases = rows("ArtAtlas");
      const textures = await Promise.all(atlases.map(row => new Promise<Texture2D>((resolve, reject) => {
        bundle.load(row.path, Texture2D, (error, value) => {
          if (error || !value) { reject(error || new Error(row.path)); return; }
          value.addRef(); result.textures.push(value); resolve(value);
        });
      }).then(value => ({ value, error: null }), error => ({ value: null, error }))));
      if (textures.some(item => item.error)) throw textures.find(item => item.error)!.error;
      for (const row of rows("ArtFrame")) {
        const i = atlases.findIndex(a => a.key === row.atlas), texture = textures[i].value!;
        if (texture.width !== numeric(atlases[i], "width") || texture.height !== numeric(atlases[i], "height")) throw new Error(`Atlas size mismatch: ${row.atlas}`);
        const frame = new SpriteFrame(), width = numeric(row, "width"), height = numeric(row, "height");
        frame.reset({ texture, rect: new Rect(numeric(row, "x"), numeric(row, "y"), width, height), originalSize: new Size(width, height), offset: new Vec2(), isRotate: false, isFlipUv: false }, true);
        frame.packable = false; result.frames.set(`frame:${row.id}`, frame);
        for (const domain of ["menu", "ui", "battle", "scenery"]) if (row[domain]) result.frames.set(`${domain}:${row[domain]}`, frame);
      }
      return result;
    } catch (error) { result.destroy(); throw error; }
  }

  create(key: string, parent?: Node): Node {
    if (this.disposed) throw new Error("UI assets already released");
    const asset = this.prefabs.get(key);
    if (!asset) throw new Error(`Unknown UI prefab: ${key}`);
    const node = instantiate(asset);
    if (parent) parent.addChild(node);
    for (const binding of node.getComponentsInChildren(UiText)) binding.refresh();
    for (const image of node.getComponentsInChildren(UiImage)) if (image.frameKey) this.bindImage(image.node, image.frameKey);
    return node;
  }
  bindImage(node: Node, key: string, silhouette = false): void {
    const frame = this.frames.get(key);
    if (!frame) throw new Error(`Unknown UI image: ${key}`);
    const sprite = node.getComponent(Sprite)!;
    this.sprites.add(sprite); sprite.spriteFrame = frame; sprite.color = silhouette ? Color.BLACK : Color.WHITE;
  }
  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    // Node.destroy 延迟到帧末，先解除 Sprite 引用再释放共享图集。
    for (const sprite of this.sprites) if (sprite.isValid) sprite.spriteFrame = null;
    this.sprites.clear();
    for (const frame of new Set(this.frames.values())) frame.destroy();
    this.frames.clear();
    for (const texture of this.textures) texture.decRef();
    this.textures.length = 0;
    for (const asset of this.prefabs.values()) asset.decRef();
    this.prefabs.clear();
  }
}

/** 固定节点查找失败立即报错，避免悄悄退回代码搭建而掩盖预制体绑定遗漏。 */
export function uiNode(root: Node, path: string): Node {
  let node: Node | null = root;
  for (const name of path.split("/")) node = node?.getChildByName(name) ?? null;
  if (!node) throw new Error(`Missing UI node: ${root.name}/${path}`);
  return node;
}
export function uiText(root: Node, path: string, value: string): void { uiNode(root, path).getComponent(Label)!.string = value; }
export function uiColor(root: Node, path: string, value: string): void {
  const node = uiNode(root, path), color = new Color(); Color.fromHEX(color, value);
  const shape = node.getComponent(UiShape);
  if (shape) { shape.fill = color; shape.redraw(); }
  else { const visual = node.getComponent(Label) ?? node.getComponent(Sprite); if (visual) visual.color = color; }
}
/** 从节点实际变换反算命中区域；调整预制体后显示和命中一同更新。 */
export function uiRect(node: Node, coordinateRoot: Node, width: number, height: number): HitRect {
  const t = node.getComponent(UITransform)!, root = coordinateRoot.getComponent(UITransform)!;
  const corners = [new Vec3(-t.width * t.anchorX, -t.height * t.anchorY), new Vec3(t.width * (1 - t.anchorX), -t.height * t.anchorY), new Vec3(t.width * (1 - t.anchorX), t.height * (1 - t.anchorY)), new Vec3(-t.width * t.anchorX, t.height * (1 - t.anchorY))]
    .map(p => root.convertToNodeSpaceAR(t.convertToWorldSpaceAR(p)));
  const xs = corners.map(p => p.x + width / 2), ys = corners.map(p => height / 2 - p.y);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}
