import { numeric, rows, text, TableRow, globalNumber } from '../../config/ConfigTables';
import { ENEMY_CONFIG, TowerKind } from './GameConfig';
import { attackProfile, AttackProfile } from './StaffEvolution';
import type { Enemy, Tower, Obstacle, Shot } from './GameRoot';

export interface ChallengeCard { key:string;category:string;staff:string;name:string;description:string;icon:string;params:Record<string,number>;condition:string;maxWave:number;exclusive:string }
export interface ChallengePort {
  enemies:Enemy[];towers:Tower[];obstacles:Obstacle[];queueLength:number;coins:number;pathLength:number;wave:number;inWave:boolean;
  addCoins:(amount:number)=>void;clear:(obstacle:Obstacle,secondary?:boolean)=>void;
  impact:(target:{x:number;y:number;radius:number},kind:TowerKind,from?:{x:number;y:number})=>void;
  position:(distance:number)=>{x:number;y:number;done:boolean};
}
export interface ChallengeShot { profile:AttackProfile;round:number;source:Tower;damageRatio:number;originalRange:number }
export function challengeRule(levelId:number):TableRow|undefined{return rows('ChallengeRule').find(r=>Number(r.levelId)===levelId);}
export function challengeCards():ChallengeCard[]{return rows('ChallengePerk').map(r=>({key:r.key,category:r.category,staff:r.staffKey,name:text(r.nameKey),description:text(r.descriptionKey),icon:r.iconKey,params:JSON.parse(r.params),condition:r.condition,maxWave:numeric(r,'maxWave'),exclusive:r.exclusive}));}
/** 一局的选卡、计数与衍生攻击都在这里持有；不写入冒险成长。 */
export class ChallengeRun {
  readonly cards=challengeCards(); readonly selected:string[]=[]; readonly choiceWaves:number[];
  offers:string[]=[]; pending=false; browsing=false; refreshLeft=0; refreshBusy=false; refreshFeedback=''; completedChoices:number[]=[];
  seed:number; elapsed=0;waveElapsed=0;shield=0;returned=false;slowCount=0;leaks=0;previousPerfect=false;
  freeBuild=0;freeEvolution=0;interestLeft=0;cashMeter=0;cashTime=0;killMeter=0;gifts=0;roundMeter=0;ballCooldown=0;rainTimer=0;
  giant:Tower|null=null;treasureIndex=-1;spawned=0;
  private readonly delayed:Array<{time:number;x:number;y:number;radius:number;damage:number;kind:TowerKind;group?:number}>=[];
  private readonly balls:Array<{distance:number;remaining:number;hit:Enemy[]}>=[];
  private rainGroup=0;
  constructor(readonly rule:TableRow,readonly roster:readonly TowerKind[],seed=Math.floor(Math.random()*0x100000000)){
    this.seed=seed>>>0||1;this.choiceWaves=rule.choiceWaves.split('|').map(Number);
  }
  random():number{let x=this.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;return this.seed/0x100000000;}
  has(key:string):boolean{return this.selected.includes(key);}
  p(key:string):Record<string,number>{const c=this.cards.find(c=>c.key===key);if(!c)throw Error('Unknown challenge card: '+key);return c.params;}
  card(key:string):ChallengeCard{return this.cards.find(c=>c.key===key)!;}
  eligible(port:ChallengePort):ChallengeCard[]{return this.cards.filter(c=>!this.has(c.key)&&(!c.staff||this.roster.includes(c.staff as TowerKind))&&port.wave<=c.maxWave&&(!c.exclusive||!this.has(c.exclusive))
    &&(c.condition!=='obstacles'||port.obstacles.length>0)
    &&(c.condition!=='space'||port.towers.length<port.obstacles.length+Number(rows('Spot').filter(s=>s.mapId===rows('Level').find(l=>l.id===this.rule.levelId)!.mapId).length))
    &&(c.condition!=='evolve'||port.towers.some(t=>t.level<globalNumber("maxStaffLevel"))||port.towers.length<rows('Spot').filter(s=>s.mapId===rows('Level').find(l=>l.id===this.rule.levelId)!.mapId).length));}
  offer(port:ChallengePort):void{
    if(this.pending||!this.choiceWaves.includes(port.wave)||this.completedChoices.includes(port.wave))return;
    this.pending=true;this.refreshLeft=numeric(this.rule,'adRefreshPerChoice');this.refreshFeedback='';this.roll(port);
  }
  private roll(port:ChallengePort,exclude:readonly string[]=[]):void{
    let pool=this.eligible(port).filter(c=>!exclude.includes(c.key));if(pool.length<3)pool=this.eligible(port);
    const result:ChallengeCard[]=[];
    while(result.length<3&&pool.length){const diverse=pool.filter(c=>!result.some(r=>r.category===c.category)),choices=diverse.length?diverse:pool;const c=choices[Math.floor(this.random()*choices.length)];result.push(c);pool=pool.filter(x=>x!==c);}
    if(result.length!==3)throw Error('挑战候选池不足');this.offers=result.map(c=>c.key);
  }
  refresh(port:ChallengePort):boolean{if(!this.pending||this.refreshLeft<=0)return false;this.roll(port,this.offers);this.refreshLeft--;return true;}
  choose(key:string,port:ChallengePort):boolean{
    if(this.refreshBusy||!this.pending||!this.offers.includes(key)||this.has(key))return false;
    this.selected.push(key);this.completedChoices.push(port.wave);this.pending=false;this.offers=[];
    const p=this.p(key);if(key==='E01'||key==='E05')port.addCoins(p.coins);
    if(key==='E02')this.interestLeft=p.waves;if(key==='E03')this.freeBuild=p.charges;if(key==='E04')this.freeEvolution=p.charges;
    return true;
  }
  income(amount:number):void{if(!this.has('X04')||amount<=0)return;const p=this.p('X04');this.cashMeter+=amount;if(this.cashMeter>=p.coins){this.cashMeter%=p.coins;this.cashTime=p.seconds;}}
  waveStart(port:ChallengePort,kinds:readonly string[]):void{
    this.waveElapsed=0;this.shield=this.has('X02')?this.p('X02').shield:0;this.returned=false;this.slowCount=0;this.leaks=0;this.gifts=0;this.spawned=0;
    this.giant=null;this.treasureIndex=-1;
    if(this.has('F01')&&port.towers.length){const top=Math.max(...port.towers.map(t=>t.level)),pool=port.towers.filter(t=>t.level===top);this.giant=pool[Math.floor(this.random()*pool.length)];}
    if(this.has('F06')){const pool=kinds.map((k,i)=>ENEMY_CONFIG[k as keyof typeof ENEMY_CONFIG].boss?-1:i).filter(i=>i>=0);if(pool.length)this.treasureIndex=pool[Math.floor(this.random()*pool.length)];}
  }
  spawnedEnemy(enemy:Enemy):void{if(this.spawned++===this.treasureIndex){enemy.hp*=this.p('F06').hp;enemy.maxHp=enemy.hp;enemy.reward*=this.p('F06').reward;enemy.chTreasure=true;}}
  waveEnd(port:ChallengePort):number{
    this.previousPerfect=this.leaks===0;
    const interest=this.interestLeft>0?Math.min(this.p('E02').cap,Math.floor(port.coins*this.p('E02').ratio)):0;
    if(this.interestLeft>0)this.interestLeft--;
    this.delayed.length=0;this.balls.length=0;
    return numeric(this.rule,'waveReward')+interest;
  }
  profile(tower:Tower,port:ChallengePort):AttackProfile{
    const base=attackProfile(tower.kind,tower.level,tower.evolutionKey),result={...base};let damage=0,range=0,rate=0;
    if(this.has('G01')&&port.inWave&&this.waveElapsed<this.p('G01').seconds)rate+=this.p('G01').rate;
    if(this.has('G02')&&port.towers.some(t=>t!==tower&&t.kind!==tower.kind&&Math.hypot(t.x-tower.x,t.y-tower.y)<=this.p('G02').radius))damage+=this.p('G02').damage;
    if(this.has('G03')&&!port.towers.some(t=>t!==tower&&Math.hypot(t.x-tower.x,t.y-tower.y)<=this.p('G03').radius)){damage+=this.p('G03').damage;range+=this.p('G03').range;}
    if(this.has('G04'))damage+=Math.min(this.p('G04').cap,Math.floor(port.coins/this.p('G04').step)*this.p('G04').damage);
    if(this.has('G05')&&this.previousPerfect){damage+=this.p('G05').damage;range+=this.p('G05').range;}
    if(this.has('G06')&&this.roster.every(k=>port.towers.some(t=>t.kind===k)))damage+=this.p('G06').damage;
    if(this.has('X04')&&this.cashTime>0)rate+=this.p('X04').rate;
    if(this.has('F01')&&this.giant===tower){damage+=this.p('F01').damage;range+=this.p('F01').range;rate+=this.p('F01').rate;}
    if(this.has('F02')){damage+=this.p('F02').damage;rate+=this.p('F02').rate;}
    result.damage*=1+damage;result.burn=(result.burn??0)*(1+damage);result.range*=1+range;const factor=Math.max(numeric(this.rule,'minIntervalRatio'),1+rate);result.rate*=factor;result.burstGap*=factor;return result;
  }
  visualScale(tower:Tower):number{return this.has('F02')?this.p('F02').scale:this.giant===tower?this.p('F01').scale:1;}
  attackRound(tower:Tower):void{
    tower.chRound=(tower.chRound??0)+1;
    if(!this.has('F04'))return;const p=this.p('F04');this.roundMeter++;
    if(this.ballCooldown>0){this.roundMeter=Math.min(this.roundMeter,p.every-1);return;}
    if(this.roundMeter>=p.every){this.roundMeter-=p.every;this.ballCooldown=p.cooldown;this.balls.push({distance:Infinity,remaining:p.seconds,hit:[]});}
  }
  /** 额外伤害不再走店员命中回调；只有致死的来源决定是否允许死亡触发。 */
  rawDamage(enemy:Enemy,damage:number,port:ChallengePort,kind:TowerKind):void{if(enemy.hp<=0)return;enemy.hp-=damage;enemy.hitFlash=globalNumber("hitFeedbackSeconds");enemy.sinceHit=0;if(enemy.hp<=0)enemy.chSecondary=true;port.impact(enemy,kind);}
  afterHit(shot:Shot,target:Enemy,port:ChallengePort):void{
    const s=shot.challenge;if(!s)return;const cfg=s.profile;
    if(this.has('S03')&&shot.kind==='bloom'&&s.round%this.p('S03').every===0)this.delayed.push({time:this.p('S03').delay,x:target.x,y:target.y,radius:cfg.splash??0,damage:cfg.damage*this.p('S03').ratio,kind:'bloom'});
    if(this.has('S05')&&shot.kind==='spark'&&s.round%this.p('S05').every===0){const visited=new Set<Enemy>([target]);let last=target;this.rawDamage(target,cfg.damage*this.p('S05').ratio,port,'spark');for(let i=1;i<(cfg.chain??0);i++){const next=port.enemies.filter(e=>e.hp>0&&!visited.has(e)&&Math.hypot(e.x-last.x,e.y-last.y)<=cfg.chainRadius).sort((a,b)=>Math.hypot(a.x-last.x,a.y-last.y)-Math.hypot(b.x-last.x,b.y-last.y))[0];if(!next)break;visited.add(next);this.rawDamage(next,cfg.damage*this.p('S05').ratio*Math.pow(cfg.chainRatio,i),port,'spark');port.impact(next,'spark',last);last=next;}}
    if(this.has('S08')&&shot.kind==='fan'){const p=this.p('S08'),next=port.enemies.filter(e=>e!==target&&e.hp>0&&Math.hypot(e.x-target.x,e.y-target.y)<=p.radius).sort((a,b)=>Math.hypot(a.x-target.x,a.y-target.y)-Math.hypot(b.x-target.x,b.y-target.y))[0];if(next){this.rawDamage(next,cfg.damage*p.ratio,port,'fan');port.impact(next,'fan',target);}}
  }
  damageBonus(shot:Shot|undefined,enemy:Enemy,port:ChallengePort):number{
    let bonus=0;if(shot?.challenge&&shot.kind==='scope'&&this.has('S04'))bonus+=this.p('S04').ratio*Math.min(1,Math.hypot(enemy.x-shot.originX,enemy.y-shot.originY)/shot.challenge.originalRange);
    if(this.has('X06')&&port.inWave&&port.queueLength===0&&port.enemies.filter(e=>e.hp>0).length===1)bonus+=this.p('X06').damage;
    return 1+bonus/(shot?.challenge?.damageRatio??1);
  }
  leak(enemy:Enemy,port:ChallengePort):{returned:boolean;damage:number}{
    if(this.has('X01')&&!ENEMY_CONFIG[enemy.kind].boss&&!this.returned){this.returned=true;enemy.distance=port.pathLength*this.p('X01').progress;const pos=port.position(enemy.distance);enemy.x=pos.x;enemy.y=pos.y;return {returned:true,damage:0};}
    this.leaks++;const absorbed=Math.min(enemy.damage,this.shield);this.shield-=absorbed;return {returned:false,damage:enemy.damage-absorbed};
  }
  reward(enemy:Enemy):number{return enemy.reward+(this.has('E06')&&!ENEMY_CONFIG[enemy.kind].boss?Math.floor(ENEMY_CONFIG[enemy.kind].reward*this.p('E06').ratio):0);}
  death(enemy:Enemy,port:ChallengePort):void{
    const alive=port.enemies.filter(e=>e!==enemy&&e.hp>0),near=(radius:number,count:number)=>alive.filter(e=>Math.hypot(e.x-enemy.x,e.y-enemy.y)<=radius).sort((a,b)=>Math.hypot(a.x-enemy.x,a.y-enemy.y)-Math.hypot(b.x-enemy.x,b.y-enemy.y)).slice(0,count);
    if(enemy.chSecondary)return;
    if(this.has('S02')&&!enemy.chColdSpread){const ratios=Object.values(enemy.slows??{}).filter(s=>s.remaining>0).map(s=>s.ratio);if(enemy.slow>0)ratios.push(attackProfile('frost',1).slowRatio);if(ratios.length){const p=this.p('S02');for(const e of near(p.radius,p.count)){e.slows??={};const ratio=Math.min(...ratios),key="challengeCold:"+ratio,old=e.slows[key];e.slows[key]={ratio,remaining:Math.max(old?.remaining??0,p.seconds)};e.chColdSpread=true;}}}
    if(this.has('S06')&&((enemy.burnDamage>0&&enemy.burnTime>0)||(enemy.chLethalBurn??0)>0)){const p=this.p('S06');for(const e of near(p.radius,alive.length))this.rawDamage(e,(enemy.chLethalBurn??enemy.burnDamage)*p.ratio,port,'ember');}
    if(this.has('S07')&&enemy.markedTime>0){
      const marks=Object.entries(enemy.marks??{}).filter(([,m])=>m.remaining>0),strength=Math.max(1,...marks.map(([,m])=>m.value));
      const generation=Math.min(...marks.filter(([,m])=>m.value===strength).map(([key])=>key.startsWith('challengeMark:')?Number(key.split(':')[1]):0));
      const p=this.p('S07');if(generation<p.generations)for(const e of near(p.radius,p.count)){e.marks??={};const key='challengeMark:'+(generation+1)+':'+strength,old=e.marks[key];e.marks[key]={value:strength,remaining:Math.max(old?.remaining??0,p.seconds)};e.markedTime=Math.max(e.markedTime,p.seconds);}
    }
    if(this.has('F03')){const p=this.p('F03');this.killMeter++;if(this.gifts<p.limit&&this.killMeter>=p.every){this.killMeter-=p.every;this.gifts++;const roll=Math.floor(this.random()*3);if(roll===0)port.addCoins(p.coins);else for(const e of near(p.radius,alive.length)){if(roll===1)this.rawDamage(e,p.damage,port,'bloom');else{e.slows??={};e.slows.challengeGift={ratio:p.ratio,remaining:p.seconds};port.impact(e,'frost');}}}this.killMeter=Math.min(this.killMeter,p.every-1);}
  }
  obstacleCleared(obstacle:Obstacle,port:ChallengePort,secondary=false):number{
    if(this.has('X05')&&!secondary){const p=this.p('X05');for(const other of [...port.obstacles])if(Math.hypot(other.x-obstacle.x,other.y-obstacle.y)<=p.radius){other.hp-=other.maxHp*p.ratio;port.impact(other,'bloom');if(other.hp<=0)port.clear(other,true);}}
    return this.has('E05')?this.p('E05').reward:0;
  }
  visuals(port:ChallengePort):Array<{kind:'ball'|'parcel';x:number;y:number;radius:number;progress:number}>{
    return [...this.balls.map(b=>({kind:'ball' as const,...port.position(Number.isFinite(b.distance)?Math.max(0,b.distance):port.pathLength),radius:this.p('F04').radius,progress:0})),
      ...this.delayed.filter(e=>e.group!==undefined).map(e=>({kind:'parcel' as const,x:e.x,y:e.y,radius:e.radius,progress:Math.max(0,e.time/this.p('F05').delay)}))];
  }
  update(dt:number,port:ChallengePort):void{
    this.elapsed+=dt;this.ballCooldown=Math.max(0,this.ballCooldown-dt);
    if(!port.inWave)return;this.cashTime=Math.max(0,this.cashTime-dt);this.waveElapsed+=dt;
    if(this.has('X03')){const p=this.p('X03');for(const e of port.enemies)if(!e.chDoorSlow&&e.hp>0&&!ENEMY_CONFIG[e.kind].boss&&e.distance>=port.pathLength*p.progress&&this.slowCount<p.count){e.chDoorSlow=true;this.slowCount++;e.slows??={};e.slows.challengeDoor={ratio:p.ratio,remaining:p.seconds};}}
    if(this.has('F05')){const p=this.p('F05');this.rainTimer+=dt;if(this.rainTimer>=p.interval){this.rainTimer%=p.interval;const group=++this.rainGroup;for(const e of port.enemies.filter(e=>e.hp>0).sort((a,b)=>b.distance-a.distance).slice(0,p.count))this.delayed.push({time:p.delay,x:e.x,y:e.y,radius:p.radius,damage:p.damage,kind:'bloom',group});}}
    const hitGroups=new Map<number,Set<Enemy>>();
    for(let i=this.delayed.length-1;i>=0;i--){const event=this.delayed[i];event.time-=dt;if(event.time>0)continue;this.delayed.splice(i,1);const hit=event.group===undefined?new Set<Enemy>():hitGroups.get(event.group)??new Set<Enemy>();if(event.group!==undefined)hitGroups.set(event.group,hit);port.impact({...event,radius:event.radius},event.kind);for(const e of port.enemies)if(!hit.has(e)&&Math.hypot(e.x-event.x,e.y-event.y)<=event.radius){hit.add(e);this.rawDamage(e,event.damage,port,event.kind);}}
    for(let i=this.balls.length-1;i>=0;i--){const ball=this.balls[i],p=this.p('F04');if(!Number.isFinite(ball.distance))ball.distance=port.pathLength;const before=ball.distance;ball.distance-=p.speed*dt;ball.remaining-=dt;for(const e of port.enemies)if(e.hp>0&&!ball.hit.includes(e)&&ball.hit.length<p.count&&e.distance>=ball.distance-p.radius&&e.distance<=before+p.radius){ball.hit.push(e);this.rawDamage(e,p.damage,port,'scope');}if(ball.remaining<=0||ball.distance<=0||ball.hit.length>=p.count)this.balls.splice(i,1);}
  }
}
