import { resources, TextAsset } from "cc";
import { configsReady, installConfigs, TABLE_NAMES } from "./ConfigTables";
let pending: Promise<void> | null = null;
/** 随客户端包加载本地 CSV，不请求服务器；失败可重试且不进入半初始化战斗。 */
export function loadGameConfigs(): Promise<void> {
  if (configsReady()) return Promise.resolve();
  if (pending) return pending;
  pending = Promise.all(TABLE_NAMES.map(name => new Promise<[string,string]>((resolve,reject) => {
    resources.load("config/" + name, TextAsset, (error, asset) => { if(error || !asset)reject(error ?? new Error("Missing config: " + name)); else resolve([name,asset.text]); });
  }))).then(entries => { const source:Record<string,string>={}; entries.forEach(([name,value])=>source[name]=value); installConfigs(source); }).finally(()=>pending=null);
  return pending;
}
