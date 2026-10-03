import { globalNumber, numeric, rows, text, onConfigsReady } from "../../config/ConfigTables";
import { TOWER_CONFIG, TowerConfig, TowerKind } from "./GameConfig";

export interface StaffEvolution {
  key: string; staffKind: TowerKind; name: string; fromLevel: number; toLevel: number;
  damage: number; rate: number; range: number; burstCount: number; burstGap: number;
  targets: number; slowRatio: number; slowSeconds: number; splash: number; splashOuterRatio: number;
  projectile: TowerKind; cost: number; imageKey: string; battleImageKey: string; spriteWidth: number;
  pierceLength: number; pierceWidth: number; pierceRatio: number; chain: number; chainRadius: number; chainRatio: number;
  burn: number; burnSeconds: number; markRatio: number; markSeconds: number; shotColor: string; shotSpeed: number; laneBend: number;
  story: string; summary: string; tradeoff: string;
}
export interface AttackProfile extends TowerConfig {
  markRatio: number;
  burstCount: number; burstGap: number; slowRatio: number; slowSeconds: number; splashOuterRatio: number;
}
/** 分支保存最终属性，基础升级系数只作用于尚未进化的店员。 */
const choiceCache=new Map<TowerKind,StaffEvolution[]>();
onConfigsReady(()=>choiceCache.clear());
export function evolutionChoices(kind: TowerKind): StaffEvolution[] {
  const cached=choiceCache.get(kind);if(cached)return cached;
  const choices=rows("StaffBranch").filter(row => row.staffKey === kind).map(row => {
    const form = rows("StaffForm").find(item => item.key === row.formKey)!;
    return { key: row.key, staffKind: kind, name: text(row.nameKey), fromLevel: numeric(row,"fromLevel"), toLevel: numeric(row,"toLevel"),
      damage:numeric(row,"damage"), rate:numeric(row,"attackInterval"), range:numeric(row,"range"), burstCount:numeric(row,"burstCount"), burstGap:numeric(row,"burstGap"),
      targets:numeric(row,"targetCount"), slowRatio:numeric(row,"slowSpeedRatio"), slowSeconds:numeric(row,"slowSeconds"), splash:numeric(row,"splashRadius"), splashOuterRatio:numeric(row,"splashOuterRatio"),
      projectile:row.projectile as TowerKind,cost:numeric(row,"upgradeCost"),imageKey:form.portraitImageKey,battleImageKey:form.battleImageKey,spriteWidth:numeric(form,"spriteWidth"),
      pierceLength:numeric(row,"pierceLength"),pierceWidth:numeric(row,"pierceWidth"),pierceRatio:numeric(row,"pierceRatio"),chain:numeric(row,"chainCount"),chainRadius:numeric(row,"chainRadius"),chainRatio:numeric(row,"chainRatio"),
      burn:numeric(row,"burnDamage"),burnSeconds:numeric(row,"burnSeconds"),markRatio:numeric(row,"markRatio"),markSeconds:numeric(row,"markSeconds"),shotColor:row.shotColor,shotSpeed:numeric(row,"shotSpeed"),laneBend:numeric(row,"laneBend"),
      story:text(form.storyKey),summary:text(form.summaryKey),tradeoff:text(form.tradeoffKey) };
  }).sort((a,b)=>numeric(rows("StaffForm").find(f=>f.branchKey===a.key)!,"displayOrder")-numeric(rows("StaffForm").find(f=>f.branchKey===b.key)!,"displayOrder"));
  choiceCache.set(kind,choices);return choices;
}
export function evolutionByKey(key: string | undefined): StaffEvolution | undefined {
  if (!key) return undefined;
  const row = rows("StaffBranch").find(item => item.key === key);
  return row ? evolutionChoices(row.staffKey as TowerKind).find(item => item.key === key) : undefined;
}
export function attackProfile(kind: TowerKind, level: number, evolutionKey?: string): AttackProfile {
  const base=TOWER_CONFIG[kind], evolution=evolutionByKey(evolutionKey);
  if (evolution && (evolution.staffKind !== kind || evolution.toLevel !== level)) throw new Error("Evolution owner/level mismatch");
  return {...base, projectile:evolution?.projectile ?? base.projectile, damage:evolution?.damage ?? base.damage*(1+(level-1)*globalNumber("upgradeDamage")),
    range:evolution?.range ?? base.range*(1+(level-1)*globalNumber("upgradeRange")),rate:evolution?.rate ?? base.rate/(1+(level-1)*globalNumber("upgradeRate")),
    targets:evolution?.targets ?? base.targets, splash:evolution?.splash ?? base.splash,
    pierce:evolution ? evolution.pierceLength>0 : base.pierce,pierceLength:evolution?.pierceLength ?? base.pierceLength,pierceWidth:evolution?.pierceWidth ?? base.pierceWidth,pierceRatio:evolution?.pierceRatio ?? base.pierceRatio,
    chain:evolution?.chain ?? base.chain,chainRadius:evolution?.chainRadius ?? base.chainRadius,chainRatio:evolution?.chainRatio ?? base.chainRatio,
    // 进化灼烧与直击一样保存最终值，不再重复乘等级系数。
    burn:evolution?.burn ?? (base.burn ?? 0)*(1+(level-1)*globalNumber("upgradeDamage")),burnSeconds:evolution?.burnSeconds ?? base.burnSeconds,
    shred:evolution ? evolution.markRatio>1 : base.shred,markRatio:evolution?.markRatio ?? globalNumber("markDamageRatio"),markSeconds:evolution?.markSeconds ?? base.markSeconds,
    shotColor:evolution?.shotColor ?? base.shotColor,shotSpeed:evolution?.shotSpeed ?? base.shotSpeed,laneBend:evolution?.laneBend ?? base.laneBend,
    burstCount:evolution?.burstCount ?? 1,burstGap:evolution?.burstGap ?? 0,
    slowRatio:evolution?.slowRatio ?? (base.slow ? globalNumber("slowSpeedRatio") : 1),
    slowSeconds:evolution?.slowSeconds ?? (base.slow ? base.slowBase+level*base.slowPerLevel : 0),splashOuterRatio:evolution?.splashOuterRatio ?? 1};
}
