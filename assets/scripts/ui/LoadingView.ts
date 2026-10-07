import { assetManager, AssetManager, instantiate, Label, Node, Prefab, resources, Sprite, UITransform, view } from "cc";
import { configsReady, text } from "../config/ConfigTables";
/** 启动预制体直接引用导入PNG；在配置加载前也能显示，不依赖业务资源管理器。 */
export class LoadingView {
  private disposed=false;private readonly label:Label;private readonly fill:Sprite;private readonly resize=()=>this.layout();
  private constructor(private readonly root:Node,private readonly prefab:Prefab){
    this.label=root.getChildByName("Text")!.getComponent(Label)!;this.fill=root.getChildByName("Fill")!.getChildByName("Artwork")!.getComponent(Sprite)!;
    this.fill.type=Sprite.Type.FILLED;this.fill.fillType=Sprite.FillType.HORIZONTAL;this.fill.fillStart=0;this.fill.fillRange=0;
    this.progress(0);this.layout();view.on("canvas-resize",this.resize,this);
  }
  static async load(parent:Node):Promise<LoadingView>{
    // 启动预制体引用独立美术包，先登记包元数据才能解析原生SpriteFrame依赖。
    if(!assetManager.getBundle("battle_art"))await new Promise<AssetManager.Bundle>((resolve,reject)=>assetManager.loadBundle("battle_art",(error,bundle)=>error?reject(error):resolve(bundle)));
    const prefab=await new Promise<Prefab>((resolve,reject)=>resources.load("ui/loading",Prefab,(error,asset)=>error||!asset?reject(error):resolve(asset)));if(!parent.isValid)throw new Error("启动节点已销毁");prefab.addRef();const node=instantiate(prefab);parent.addChild(node);return new LoadingView(node,prefab);}
  private layout():void{const visible=view.getVisibleSize(),size=this.root.getComponent(UITransform)!;const scale=Math.min(visible.width/size.width,visible.height/size.height);this.root.setScale(scale,scale,1);}
  progress(value:number):void{if(this.disposed)return;const amount=Math.max(0,Math.min(1,value));this.fill.fillRange=amount;this.label.string=configsReady()?text("ui.redesign.loading",Math.floor(amount*100)):this.label.string.replace(/\{p0\}/g,"0");}
  failed():void{if(this.disposed)return;this.label.string=configsReady()?text("ui.redesign.loadingFailed"):this.root.getChildByName("Error")!.getComponent(Label)!.string;}
  onRetry(action:()=>void):void{this.root.on(Node.EventType.TOUCH_END,action);}
  destroy():void{if(this.disposed)return;this.disposed=true;view.off("canvas-resize",this.resize,this);this.root.destroy();this.prefab.decRef();}
}
