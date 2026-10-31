import { text, globalString, globalNumber } from '../config/ConfigTables';

/** 紧凑钱包只改变显示；管理页仍给出完整余额，保存与扣款始终使用原数值。 */
export function compactUiCoins(value:number):string {
  const amount=Number.isFinite(value)?Math.max(0,Math.floor(value)):0;
  for(const item of globalString('uiCoinDisplayUnits').split('|')){
    const [threshold,key]=item.split(':'),unit=Number(threshold);
    if(amount<unit)continue;
    const quotient=amount/unit,power=10**globalNumber('uiCoinDisplayDecimals');
    const display=quotient<100?Math.floor(quotient*power)/power:Math.floor(quotient);
    return text(key,display);
  }
  return String(amount);
}

/** 战斗中常见余额仍显示精确整数，超出固定槽位再使用同一套配置单位。 */
export function battleUiCoins(value:number):string {
  const amount=Number.isFinite(value)?Math.max(0,Math.floor(value)):0;
  return String(amount).length<=globalNumber('uiBattleCoinDigits')?String(amount):compactUiCoins(amount);
}
