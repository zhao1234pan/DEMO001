import { Color } from "cc";
import { levelTheme } from "./LevelTheme";
import type { LevelConfig } from "./LevelConfig";
import { selectSceneDecorations } from "./BattleSceneryLayout";
import { PngSurface } from "../../ui/PngSurface";
/** 路面PNG由项目内导图工具按地图CSV离线生成，运行时不绘制道路。 */
export class BattleMapView {
  constructor(private readonly layer:PngSurface,private readonly width:number){}
  draw(level:LevelConfig,top:number,bottom:number,_landmarksReady:boolean){
    const color=new Color();Color.fromHEX(color,levelTheme(level).ground);this.layer.clear();
    this.layer.box(0,top,this.width,bottom-top,0,color);
    const key="map_"+level.id,height=this.layer.heightFor(key,this.width);
    this.layer.image(key,this.width/2,height/2,this.width,height);this.layer.end();
    return selectSceneDecorations(level,this.width);
  }
}
