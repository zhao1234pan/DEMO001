import { assetManager, AssetManager, instantiate, Label, Node, Prefab, resources, Sprite, SpriteFrame, TextAsset, UITransform, view } from "cc";
import { configsReady, parseCsv, text } from "../config/ConfigTables";
import { UiSkin } from "./UiSkin";

/** 启动容器不依赖美术包，PNG加载失败时仍能显示原表导出的文字并接受重试。 */
export class LoadingView {
  private disposed=false;
  private artReady=false;
  private amount=0;
  private readonly frames:SpriteFrame[]=[];
  private readonly label:Label;
  private readonly fill:Sprite;
  private readonly resize=()=>this.layout();

  private constructor(private readonly root:Node,private readonly prefab:Prefab){
    this.label=root.getChildByName("Text")!.getComponent(Label)!;
    this.fill=root.getChildByName("Fill")!.getChildByName("Artwork")!.getComponent(Sprite)!;
    this.progress(0);this.layout();view.on("canvas-resize",this.resize,this);
  }
  static async load(parent:Node):Promise<LoadingView>{
    const prefab=await new Promise<Prefab>((resolve,reject)=>resources.load("ui/loading",Prefab,(error,asset)=>error||!asset?reject(error??new Error("启动预制体缺失")):resolve(asset)));
    if(!parent.isValid)throw new Error("启动节点已销毁");
    prefab.addRef();const node=instantiate(prefab);parent.addChild(node);return new LoadingView(node,prefab);
  }
  async loadArt():Promise<void>{
    if(this.artReady||this.disposed)return;
    const bundle=assetManager.getBundle("battle_art")??await new Promise<AssetManager.Bundle>((resolve,reject)=>assetManager.loadBundle("battle_art",(error,value)=>error?reject(error):resolve(value)));
    if(this.disposed)return;
    // 启动前不安装半套业务配置；这里只读取同一份VisualSkin CSV的资源绑定。
    const source=await new Promise<TextAsset>((resolve,reject)=>resources.load("config/VisualSkin",TextAsset,(error,value)=>error||!value?reject(error??new Error("启动资源缺失")):resolve(value)));
    if(this.disposed)return;
    const rows=parseCsv(source.text),bindings=this.root.getComponentsInChildren(UiSkin);
    const loaded=await Promise.all(bindings.map(binding=>(async()=>{
      const row=rows.find(r=>r.key===binding.key);if(!row)throw new Error("启动皮肤配置缺失："+binding.key);
      const frame=await new Promise<SpriteFrame>((resolve,reject)=>bundle.load(row.path,SpriteFrame,(error,value)=>error||!value?reject(error??new Error("启动资源缺失")):resolve(value)));
      frame.addRef();return{binding,row,frame};
    })().then(value=>({value,error:null}),error=>({value:null,error}))));
    const failed=loaded.find(r=>!r.value);
    if(failed||this.disposed){for(const r of loaded)r.value?.frame.decRef();if(failed)throw failed.error;return;}
    for(const item of loaded){const {binding,row,frame}=item.value!;this.frames.push(frame);const sprite=binding.image!.getComponent(Sprite)!;sprite.spriteFrame=frame;binding.resizeMode=row.resizeMode;binding.sync();sprite.type=row.mode==="sliced"?Sprite.Type.SLICED:Sprite.Type.SIMPLE;}
    this.fill.type=Sprite.Type.FILLED;this.fill.fillType=Sprite.FillType.HORIZONTAL;this.fill.fillStart=0;this.artReady=true;this.progress(this.amount);
  }
  private layout():void{const visible=view.getVisibleSize(),size=this.root.getComponent(UITransform)!;const scale=Math.min(visible.width/size.width,visible.height/size.height);this.root.setScale(scale,scale,1);}
  progress(value:number):void{if(this.disposed)return;const amount=this.amount=Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;this.fill.fillRange=amount;
    const paw=this.root.getChildByName("EndPaw")!,start=this.root.getChildByName("ProgressStart")!,end=this.root.getChildByName("ProgressEnd")!;paw.active=amount>0;paw.setPosition(start.position.x+(end.position.x-start.position.x)*amount,start.position.y);this.label.string=configsReady()?text("ui.redesign.loading",Math.floor(amount*100)):this.label.string.replace(/\{p0\}/g,"0");}
  failed():void{if(!this.disposed)this.label.string=configsReady()?text("ui.redesign.loadingFailed"):this.root.getChildByName("Error")!.getComponent(Label)!.string;}
  onRetry(action:()=>void):void{this.root.on(Node.EventType.TOUCH_END,action);}
  destroy():void{if(this.disposed)return;this.disposed=true;view.off("canvas-resize",this.resize,this);for(const sprite of this.root.getComponentsInChildren(Sprite))sprite.spriteFrame=null;this.root.destroy();for(const frame of this.frames)frame.decRef();this.frames.length=0;this.prefab.decRef();}
}
