import { globalNumber, globalString } from "../config/ConfigTables";
import { PlatformService } from "./PlatformService";

/** 局外余额使用独立存档；不把战斗金币、关卡进度或图鉴收录数当作玩家资产。 */
export function readWalletCoins(): number {
  const value = PlatformService.getNumber(globalString("walletSaveKey"), globalNumber("walletInitialCoins"));
  return Number.isSafeInteger(value) && value >= 0 ? value : globalNumber("walletInitialCoins");
}
