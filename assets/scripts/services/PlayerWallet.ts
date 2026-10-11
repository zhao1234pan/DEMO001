import { ShopService, shopRule } from "./ShopService";
import { globalNumber, globalString } from "../config/ConfigTables";
import { PlatformService } from "./PlatformService";

/** 局外余额使用独立存档；不把战斗金币、关卡进度或图鉴收录数当作玩家资产。 */
export function readWalletCoins(): number {
  if(ShopService.shared.state)return ShopService.shared.state.coins;
  try{const saved=JSON.parse(PlatformService.getString(shopRule("saveKey"),"null"));if(saved&&Number.isSafeInteger(saved.coins)&&saved.coins>=0)return saved.coins;}catch{}
  const value = PlatformService.getNumber(globalString("walletSaveKey"), globalNumber("walletInitialCoins"));
  return Number.isSafeInteger(value) && value >= 0 ? value : globalNumber("walletInitialCoins");
}
