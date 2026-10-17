/* 测试策略只用于隔离对照，不参与客户端战斗或发放资源。 */
module.exports=function(cfg){
function samples(g){const a=[];for(let d=0;d<g.pathLength;d+=10)a.push({...g.pathPosition(d),p:d/g.pathLength});return a;}
function score(g,p,k,a){const range=cfg.TOWER_CONFIG[k].range*(1+((p.level||1)-1)*.08);return a.reduce((v,q)=>v+(Math.hypot(q.x-p.x,q.y-p.y)<=range?1-.25*q.p:0),0)/(1+g.towers.filter(t=>Math.hypot(t.x-p.x,t.y-p.y)<range*.8).length*.13);}
function choose(g,mode){const ks=g.level.availableTowers;if(mode==='single'||mode==='newbie')return ks.includes('sprout')?'sprout':ks.includes('scope')?'scope':ks[0];const weights={sprout:3,frost:1,bloom:3,scope:3,spark:2,ember:1.5,mint:1,fan:3};return [...ks].sort((a,b)=>(g.towers.filter(t=>t.kind===a).length+.5)/weights[a]-(g.towers.filter(t=>t.kind===b).length+.5)/weights[b])[0];}
function act(g,mode,a,upgradeAllowed=true){const kind=choose(g,mode),spots=g.spots.filter(s=>!s.obstacle&&!s.tower).sort((x,y)=>score(g,y,kind,a)-score(g,x,kind,a));const up=upgradeAllowed?g.towers.filter(t=>t.level<3).sort((x,y)=>score(g,y,y.kind,a)/g.upgradeCost(y)-score(g,x,x.kind,a)/g.upgradeCost(x))[0]:undefined;const threshold=mode==='spread'?18:6;
 if(up&&(g.towers.length>=threshold||!spots.length)&&g.coins>=g.upgradeCost(up)){g.selectedTower=up;g.upgradeSelected();if(g.evolutionTower){const choices=g.evolutionMenuItems();g.evolveSelected(choices[up.kind==='bloom'?1:0].evolution.key);}}
 else if(spots.length&&g.coins>=cfg.TOWER_CONFIG[kind].cost)g.buildTower(spots[0],kind);
 else if(up&&g.towers.length>=4&&mode!=='spread'&&g.coins>=g.upgradeCost(up)){g.selectedTower=up;g.upgradeSelected();if(g.evolutionTower){const choices=g.evolutionMenuItems();g.evolveSelected(choices[up.kind==='bloom'?1:0].evolution.key);}}
 if(mode==='newbie'){g.selectedObstacle=null;return;}
 const reachable=g.obstacles.map(o=>({o,n:g.towers.filter(t=>Math.hypot(t.x-o.x,t.y-o.y)<=cfg.TOWER_CONFIG[t.kind].range*(1+(t.level-1)*.08)).length})).filter(x=>x.n).sort((x,y)=>y.n*y.o.reward/y.o.hp-x.n*x.o.reward/x.o.hp);if(reachable.length){g.selectedObstacle=reachable[0].o;g.selectedSpot=g.selectedObstacle.spot;g.selectedTower=null;}
}

return{samples,act};
};
const priority={"G06":100,"G02":90,"G04":85,"G05":80,"S04":75,"S03":74,"S06":73,"F02":70,"S01":69,"E03":68,"E04":67,"F01":65,"S05":64,"E01":60,"X06":58,"G03":56,"E02":50,"E06":45,"X04":40,"F04":35,"F05":34,"S02":33,"S07":32,"X02":30,"X01":28};
module.exports.choosePerk=run=>[...run.offers].sort((a,b)=>(priority[b]??0)-(priority[a]??0))[0];
