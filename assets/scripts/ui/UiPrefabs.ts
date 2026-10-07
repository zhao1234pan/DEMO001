import { DEBUG } from "cc/env";
import { assetManager, AssetManager, Color, instantiate, Label, Node, Prefab, resources, Sprite, SpriteFrame, UITransform, Vec3 } from "cc";
import { numeric, rows } from "../config/ConfigTables";
import { UiImage } from "./UiImage";
import { UiSkin } from "./UiSkin";
import { UiText } from "./UiText";
import type { HitRect } from "../gameplay/battle/BattleLayout";

/** 一次启动持有一组UI资源；预制体实例销毁后归还，加载失败可重试。 */
export class UiPrefabs {
  private readonly prefabs = new Map<string, Prefab>();
  private readonly frames = new Map<string, SpriteFrame>();
  private disposed = false;
  private readonly nativeFrames: SpriteFrame[] = [];
  private readonly skinRows = new Map(rows("VisualSkin").map(row=>[row.key,row]));
  private readonly sprites = new Set<Sprite>();
  private readonly imageBounds=new Map<Node,{width:number;height:number}>();
  private readonly roundedRows=Array.from(this.skinRows.keys()).filter(key=>key.startsWith("round_")).map(key=>({key,radius:Number(key.slice(6).replace("p","."))}));
  private constructor() {}

  static async load(progress?: (loaded:number,total:number)=>void): Promise<UiPrefabs> {
    const result = new UiPrefabs();
    try {
      const bundle = assetManager.getBundle("battle_art") ?? await new Promise<AssetManager.Bundle>((resolve, reject) => {
        assetManager.loadBundle("battle_art", (error, value) => error ? reject(error) : resolve(value));
      });

      const total=rows("UiPrefab").filter(row=>DEBUG||row.key!=="gm").length+rows("ArtFrame").length+rows("VisualSkin").length;let completed=0;const advanced=()=>progress?.(++completed,total);
      // 等待全部回调落定，再统一释放失败批次，避免晚到回调泄漏资源引用。
      const loaded = await Promise.all(rows("UiPrefab").filter(row => DEBUG || row.key !== "gm").map(row => new Promise<Prefab>((resolve, reject) => {
        resources.load(row.path, Prefab, (error, asset) => {
          if (error || !asset) { reject(error || new Error(`Missing prefab: ${row.key}`)); return; }
          asset.addRef(); result.prefabs.set(row.key, asset); advanced(); resolve(asset);
        });
      }).then(() => null, error => error)));
      if (loaded.some(error => error)) throw loaded.find(error => error);
      const art=await Promise.all(rows("ArtFrame").map(row=>new Promise<void>((resolve,reject)=>{
        bundle.load(row.assetPath,SpriteFrame,(error,frame)=>{if(error||!frame){reject(error||new Error(row.assetPath));return;}
          frame.addRef();result.nativeFrames.push(frame);result.frames.set("frame:"+row.id,frame);
          for(const domain of ["menu","ui","battle","scenery"])if(row[domain])result.frames.set(domain+":"+row[domain],frame);advanced();resolve();
        });
      }).then(()=>null,error=>error)));
      if(art.some(error=>error))throw art.find(error=>error);
      const skins=await Promise.all(rows("VisualSkin").map(row=>new Promise<void>((resolve,reject)=>{
        bundle.load(row.path,SpriteFrame,(error,frame)=>{if(error||!frame){reject(error||new Error(row.path));return;}frame.addRef();result.nativeFrames.push(frame);result.frames.set("skin:"+row.key,frame);if(row.group==="ui/icons/goods")result.frames.set("menu:"+row.key,frame);advanced();resolve();});
      }).then(()=>null,error=>error)));
      if(skins.some(error=>error))throw skins.find(error=>error);
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
    for(const skin of node.getComponentsInChildren(UiSkin)){this.bindSkin(skin.image!.getComponent(Sprite)!,skin.key);skin.sync();}
    return node;
  }
  bindImage(node: Node, key: string, silhouette = false): void {
    const frame = this.frames.get(key);
    if (!frame) throw new Error(`Unknown UI image: ${key}`);
    const sprite = node.getComponent(Sprite)!;
    this.sprites.add(sprite); sprite.spriteFrame = frame; sprite.color = silhouette ? Color.BLACK : Color.WHITE;
    // 固定图标只在预制体给定的框内等比缩放，换画像时不累积缩小。
    const transform=node.getComponent(UITransform)!;let bounds=this.imageBounds.get(node);if(!bounds){bounds={width:transform.width,height:transform.height};this.imageBounds.set(node,bounds);}
    const scale=Math.min(bounds.width/frame.rect.width,bounds.height/frame.rect.height);transform.setContentSize(frame.rect.width*scale,frame.rect.height*scale);
  }
  rounded(radius:number):string {
    // 半径由现有界面/效果几何决定；从资源表中的共享圆角皮肤选取最近尺寸。
    let best=this.roundedRows[0];for(const row of this.roundedRows)if(Math.abs(row.radius-radius)<Math.abs(best.radius-radius))best=row;return best.key;
  }
  frame(key:string):SpriteFrame {const frame=this.frames.get(key);if(!frame)throw new Error("Missing PNG image: "+key);return frame;}
  skin(key:string) {const row=this.skinRows.get(key);if(!row)throw new Error("Missing PNG skin: "+key);return row;}
  bindSkin(sprite:Sprite,key:string):void {
    const frame=this.frames.get("skin:"+key);if(!frame)throw new Error("Missing PNG frame: "+key);
    this.sprites.add(sprite);if(sprite.spriteFrame!==frame)sprite.spriteFrame=frame;
    const binding=sprite.node.parent?.getComponent(UiSkin);if(binding)binding.resizeMode=this.skin(key).resizeMode;
    sprite.type=this.skin(key).mode==="sliced"?Sprite.Type.SLICED:Sprite.Type.SIMPLE;
  }
  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    // Node.destroy 延迟到帧末，先解除 Sprite 引用再释放共享图集。
    for (const sprite of this.sprites) if (sprite.isValid) sprite.spriteFrame = null;
    this.sprites.clear();this.imageBounds.clear();
    for(const frame of this.nativeFrames)frame.decRef();this.nativeFrames.length=0;
    this.frames.clear();

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
  const skin = node.getComponent(UiSkin);
  if (skin) { skin.image!.getComponent(Sprite)!.color=color; }
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
