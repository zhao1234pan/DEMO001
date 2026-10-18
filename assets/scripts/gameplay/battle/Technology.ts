import {numeric,rows} from '../../config/ConfigTables';
import type {AttackProfile} from './StaffEvolution';
import type {TowerKind} from './GameConfig';
export interface TechnologySnapshot {staff:Record<string,Record<string,number>>;global:Record<string,number>;}
/** 每局复制已购节点的效果；后续购买、退款不会改写进行中的战斗。 */
export function technologySnapshot(keys:readonly string[]):TechnologySnapshot{
 const result:TechnologySnapshot={staff:{},global:{}};
 for(const node of rows('TechnologyNode').filter(r=>keys.includes(r.key))){const branch=rows('TechnologyBranch').find(r=>r.key===node.branchKey)!,effect=rows('TechnologyEffect').find(r=>r.key===node.effect)!,target=branch.staffKey?(result.staff[branch.staffKey]??(result.staff[branch.staffKey]={})):result.global;target[effect.key]=Math.min(numeric(effect,'cap'),(target[effect.key]??0)+numeric(node,'value'));}
 return result;
}
export function technologyProfile(base:AttackProfile,kind:TowerKind,snapshot:TechnologySnapshot):AttackProfile{
 if(!snapshot.staff[kind])return base;
 const result={...base},values=snapshot.staff[kind]??{};
 for(const effect of rows('TechnologyEffect').filter(r=>r.scope==='staff')){const value=values[effect.key]??0,field=effect.attribute as keyof AttackProfile;if(!value)continue;const current=Number(result[field]);(result as unknown as Record<string,unknown>)[field]=effect.operation==='multiply'?current*(1+value):effect.operation==='reduce'?current*(1-value):current+value;}
 return result;
}
