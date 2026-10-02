/** CSV 是运行时唯一配置源；此模块不依赖引擎，可用于导表与回归检查。 */
export type TableRow = Record<string, string>;
export const TABLE_NAMES = ["Global", "I18", "Staff", "Enemy", "Theme", "Map", "MapPoint", "Spot", "Obstacle", "Level", "Wave", "WaveGroup", "Collection", "Audio", "Decoration", "ArtAtlas", "ArtFrame", "UiPrefab", "Tutorial"] as const;
let data: Record<string, TableRow[]> = Object.create(null);
let ready = false;
let byKey:Record<string,Record<string,TableRow>> = Object.create(null);
const listeners: Array<() => void> = [];
export function configsReady(): boolean { return ready; }
export function onConfigsReady(callback: () => void): void { listeners.push(callback); if (ready) callback(); }
export function rows(name: string): TableRow[] { if (!ready) throw new Error("Config not loaded: " + name); return data[name]; }
export function numeric(row: TableRow, field: string): number { const value = Number(row[field]); if (row[field] === "" || !Number.isFinite(value)) throw new Error(`Invalid number: ${field}/${row.id}`); return value; }
export function globalNumber(key: string): number { const row = byKey.Global?.[key]; if (!row) throw new Error("Missing global: " + key); return numeric(row, "value"); }
export function globalString(key: string): string { const row = rows("Global").find(item => item.key === key); if (!row) throw new Error("Missing global: " + key); return row.value; }
export function text(key: string, ...args: Array<string | number>): string {
  const row = byKey.I18?.[key];
  if (!row) throw new Error("Missing I18: " + key);
  return row.zhCN.replace(/\{p(\d+)\}/g, (match, index: string) => args[Number(index)] === undefined ? match : String(args[Number(index)]));
}
/** RFC 4180：支持 BOM、逗号、双引号、换行；禁止悄悄忽略损坏的行。 */
export function parseCsv(source: string): TableRow[] {
  const grid: string[][] = []; let line: string[] = [], value = "", quoted = false, closed = false;
  source = source.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) { if (ch === '"') { if (source[i + 1] === '"') { value += '"'; i++; } else { quoted = false; closed = true; } } else value += ch; }
    else if (ch === '"' && value === "" && !closed) quoted = true;
    else if (ch === ",") { line.push(value); value = ""; closed = false; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && source[i + 1] === "\n") i++; line.push(value); if (line.some(cell => cell !== "")) grid.push(line); line = []; value = ""; closed = false; }
    else { if (closed || ch === '"') throw new Error("Invalid CSV quote"); value += ch; }
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  if (value !== "" || line.length) { line.push(value); grid.push(line); }
  const fields = grid.shift(); if (!fields || fields[0] !== "id" || new Set(fields).size !== fields.length || fields.some(x => !x)) throw new Error("Invalid CSV header");
  const ids = new Set<string>();
  return grid.map((cells, i) => { if (cells.length !== fields.length || !/^\d+$/.test(cells[0]) || Number(cells[0]) < 1 || ids.has(cells[0])) throw new Error("Invalid CSV row/id: " + (i + 2)); ids.add(cells[0]); const row: TableRow = Object.create(null); fields.forEach((field, j) => row[field] = cells[j]); return row; });
}
export function installConfigs(sources: Record<string, string>): void {
  const next: Record<string, TableRow[]> = Object.create(null);
  for (const name of TABLE_NAMES) { if (typeof sources[name] !== "string") throw new Error("Missing table: " + name); next[name] = parseCsv(sources[name]); if (!next[name].length) throw new Error("Empty table: " + name); }
  const requireRef = (table: string, field: string, value: string, owner: string) => { if (!next[table].some(r => r[field] === value)) throw new Error(`Invalid reference: ${owner} -> ${table}/${value}`); };
  for (const name of TABLE_NAMES) { const keys = new Set<string>(); for (const row of next[name]) { if ("key" in row) { if (!row.key || keys.has(row.key)) throw new Error("Duplicate/empty key: " + name + "/" + row.key); keys.add(row.key); } } }
  const positive = (name: string, fields: string[], zero = false) => { for (const row of next[name]) for (const field of fields) { const n = numeric(row, field); if (zero ? n < 0 : n <= 0) throw new Error(`Out of range: ${name}/${row.id}/${field}`); } };
  positive("Decoration",["width","height"]);
  positive("Staff", ["cost", "range", "rate", "damage", "shotSpeed", "targets"]); positive("Enemy", ["hp", "speed", "radius", "damage"]); positive("Enemy", ["reward"], true);
  positive("Level", ["initialLives", "enemyHealthScale", "enemySpeedScale"]); positive("Level", ["initialCoins"], true); positive("Obstacle", ["hp"]); positive("Obstacle", ["reward"], true); positive("Wave", ["spawnInterval", "healthScale"]); positive("WaveGroup", ["count"]);
  for (const row of next.Global) if (row.type === "float") numeric(row, "value");
  for (const name of ["Staff", "Enemy", "Theme"]) for (const row of next[name]) requireRef("I18", "key", row.name, name);
  for (const row of next.Map) requireRef("Theme", "key", row.theme, "Map");
  for (const name of ["MapPoint", "Spot", "Obstacle", "Decoration"]) for (const row of next[name]) requireRef("Map", "id", row.mapId, name);
  for (const row of next.Level) { requireRef("Map", "id", row.mapId, "Level"); requireRef("I18", "key", row.title, "Level"); if (row.goal) requireRef("I18", "key", row.goal, "Level"); for (const key of row.availableTowers.split("|")) requireRef("Staff", "key", key, "Level"); }
  for (const row of next.Wave) { requireRef("Level", "id", row.levelId, "Wave"); if (row.announcement) requireRef("I18", "key", row.announcement, "Wave"); }
  for (const row of next.WaveGroup) { requireRef("Wave", "id", row.waveId, "WaveGroup"); requireRef("Enemy", "key", row.enemy, "WaveGroup"); if (!Number.isInteger(numeric(row, "count"))) throw new Error("Fractional enemy count"); }
  for (const row of next.Collection) { if (!["enemies", "bosses", "staff"].includes(row.tab)) throw new Error("Invalid collection tab"); requireRef(row.tab === "staff" ? "Staff" : "Enemy", "key", row.kind, "Collection"); for (const field of ["category", "traits", "story"]) requireRef("I18", "key", row[field], "Collection"); }
  positive("ArtAtlas",["width","height"]); positive("ArtFrame",["width","height"]); positive("ArtFrame",["x","y"],true);
  for(const row of next.ArtFrame) { requireRef("ArtAtlas","key",row.atlas,"ArtFrame"); const atlas=next.ArtAtlas.find(a=>a.key===row.atlas)!; if(numeric(row,"x")+numeric(row,"width")>numeric(atlas,"width") || numeric(row,"y")+numeric(row,"height")>numeric(atlas,"height"))throw new Error("Art frame outside atlas"); }
  for(const field of ["battle","menu","ui","scenery"]) { const keys=new Set<string>(); for(const row of next.ArtFrame) {if(!row[field])continue;if(keys.has(row[field]))throw new Error("Duplicate art frame key");keys.add(row[field]);} }
  for (const row of next.Tutorial) {
    requireRef("Level", "id", row.levelId, "Tutorial"); requireRef("Staff", "key", row.staffKind, "Tutorial");
    const level = next.Level.find(item => item.id === row.levelId)!;
    if (level.mode !== "adventure" || !level.availableTowers.split("|").includes(row.staffKind)) throw new Error("Tutorial staff unavailable");
    if (!["deploy", "upgrade", "combo", "area", "clear"].includes(row.action)) throw new Error("Unknown tutorial action");
    if (row.partnerKind && !level.availableTowers.split("|").includes(row.partnerKind)) throw new Error("Tutorial partner unavailable");
    if (row.action === "combo" && !row.partnerKind) throw new Error("Tutorial combo needs partner");
    for (const key of ["selectText", "actionText", "waitText"]) requireRef("I18", "key", row[key], "Tutorial");
    const spot = next.Spot.find(item => item.mapId === level.mapId && item.spotIndex === row.spotIndex);
    if (!spot || !/^#[0-9a-fA-F]{6}$/.test(row.highlightColor)) throw new Error("Invalid tutorial target/style");
    const obstacle = next.Obstacle.some(item => item.mapId === level.mapId && item.spotIndex === row.spotIndex);
    if ((row.action === "clear") !== obstacle) throw new Error("Tutorial preferred spot cannot support action");
    for (const key of ["order", "requiredValue"]) if (!Number.isInteger(numeric(row,key)) || numeric(row,key) < 1) throw new Error("Invalid tutorial integer");
  }
  positive("Tutorial", ["firstWaveDelay", "pulseSeconds"]);
  for (const id of new Set(next.Tutorial.map(row => row.levelId))) {
    const steps = next.Tutorial.filter(row => row.levelId === id).sort((a,b) => numeric(a,"order") - numeric(b,"order"));
    if (steps.some((row,i) => numeric(row,"order") !== i + 1 || row.firstWaveDelay !== steps[0].firstWaveDelay)) throw new Error("Tutorial order/delay mismatch");
  }
  const requiredGlobals=["gameName","maxLevels","rewardAdUnitId","version","upgradeDamage","upgradeRange","upgradeRate","upgradeCostBase","upgradeCostStep","maxStaffLevel","sellRatio","waveHealthGrowth","waveBonusBase","waveBonusStep","firstWaveDelay","nextWaveDelay","reviveWaveDelay","reviveMinLives","reviveLifeRatio","freezeSeconds","cashBase","cashPerLevel","freePropCount","slowSpeedRatio","markDamageRatio","musicVolume","maxEffectSources","toastSeconds","challengeLevelId","touchTravelTolerance"];
  for(const key of requiredGlobals) { requireRef("Global","key",key,"Global contract"); const row=next.Global.find(r=>r.key===key)!; if(!["gameName","rewardAdUnitId","version"].includes(key) && (row.type!=="float" || numeric(row,"value")<0))throw new Error("Invalid global: "+key); }
  for(const key of ["maxLevels","maxStaffLevel","reviveMinLives","maxEffectSources"]) {const value=Number(next.Global.find(r=>r.key===key)!.value);if(!Number.isInteger(value)||value<1)throw new Error("Invalid integer global: "+key);}
  for(const key of ["sellRatio","reviveLifeRatio","slowSpeedRatio","musicVolume"]) if(Number(next.Global.find(r=>r.key===key)!.value)>1)throw new Error("Ratio exceeds one: "+key);
  if (!Number.isInteger(Number(next.Global.find(r=>r.key==="freePropCount")!.value))) throw new Error("Fractional free prop count");
  requireRef("I18","key",next.Global.find(r=>r.key==="gameName")!.value,"gameName");
  for(const row of next.Staff) {
    if(!["sprout","frost","bloom","scope","spark","ember","mint","fan"].includes(row.projectile))throw new Error("Unknown projectile renderer: "+row.projectile);
    for(const field of ["slow","pierce","shred"]) if(!["0","1"].includes(row[field]))throw new Error("Invalid feature flag");
    for(const field of ["splash","chain","burn","pierceLength","pierceWidth","pierceRatio","chainRadius","chainRatio","burnSeconds","markSeconds","slowBase","slowPerLevel","arcHeight","laneBend"])if(numeric(row,field)<0)throw new Error("Negative staff parameter");
    for(const field of ["targets","chain"])if(!Number.isInteger(numeric(row,field)))throw new Error("Fractional target count");
    if(numeric(row,"pierceRatio")>1||numeric(row,"chainRatio")>1)throw new Error("Invalid attack falloff");
    if(!next.ArtFrame.some(f=>f.menu===row.key&&f.ui===row.key))throw new Error("Missing staff portrait: "+row.key);
  }
  for(const row of next.Enemy) {if(!["","mini","major"].includes(row.boss)||numeric(row,"clearRatio")<0||numeric(row,"clearRatio")>1)throw new Error("Invalid enemy rank/clear ratio");if(!next.ArtFrame.some(f=>f.battle==="enemy_"+row.key&&f.menu==="enemy_"+row.key))throw new Error("Missing enemy portrait");}
  for(const row of next.Decoration) if(!["tree","planter"].includes(row.kind))throw new Error("Unknown decoration kind");
  for(const row of next.Collection) if(!next.ArtFrame.some(f=>f.menu===row.imageKey))throw new Error("Unknown collection image");
  for (const row of next.UiPrefab) if (!/^ui\/[a-z_]+$/.test(row.path)) throw new Error("Invalid UI prefab path: " + row.key);
  // 表现参数必须有限且有界，避免无穷特效或每帧分配过量对象。
  const feedbackRanges: Array<[string,number,number,boolean]> = [
    ["hitFeedbackSeconds",0.01,1,false],["hitFeedbackScale",0,0.2,false],
    ["impactSeconds",0.01,1,false],["impactLimit",1,128,true],
    ["bossEntranceSeconds",0.1,10,false],["bossDefeatSeconds",0.1,10,false],
  ];
  for (const [key,min,max,integer] of feedbackRanges) {
    const row=next.Global.find(r=>r.key===key); if(!row || row.type!=="float")throw new Error("Missing feedback parameter: "+key);
    const value=numeric(row,"value");if(value<min||value>max||(integer&&!Number.isInteger(value)))throw new Error("Invalid feedback parameter: "+key);
  }
  const max = Number(next.Global.find(r => r.key === "maxLevels")?.value);
  if (!Number.isInteger(max) || max !== next.Level.filter(r=>r.mode === "adventure").length) throw new Error("maxLevels mismatch");
  for (let id = 1; id <= max; id++) { requireRef("Level", "id", String(id), "Level sequence"); if (!next.Wave.some(w => w.levelId === String(id))) throw new Error("Level without waves"); }
  const challengeId = next.Global.find(r=>r.key === "challengeLevelId")!.value;
  requireRef("Level", "id", challengeId, "challengeLevelId");
  if (next.Level.find(r=>r.id === challengeId)!.mode !== "challenge") throw new Error("Challenge mode mismatch");
  for (const level of next.Level) {
    if (!["adventure", "challenge"].includes(level.mode)) throw new Error("Unknown level mode");
    if (level.mode === "adventure" && (numeric(level,"id") > max || numeric(level,"id") < 1)) throw new Error("Adventure ID outside progress");
    if (level.mode === "challenge" && numeric(level,"id") <= max) throw new Error("Challenge overlaps adventure");
    if (level.mode === "challenge" && (level.availableTowers.split("|").length !== 4 || next.Wave.filter(w=>w.levelId === level.id).length < 21)) throw new Error("Challenge needs four staff and 21+ waves");
    if (new Set(level.availableTowers.split("|")).size !== level.availableTowers.split("|").length) throw new Error("Duplicate available staff");
    if (numeric(level,"enemySpeedScale") !== 1) throw new Error("Base speed must not scale by level");
  }
  for (const map of next.Map) {
    const points = next.MapPoint.filter(r => r.mapId === map.id).sort((a,b) => numeric(a,"order")-numeric(b,"order"));
    const spots = next.Spot.filter(r => r.mapId === map.id).sort((a,b) => numeric(a,"spotIndex")-numeric(b,"spotIndex"));
    if (points.length < 2 || !spots.length) throw new Error("Empty map: " + map.id);
    for (const [i,p] of points.entries()) { if (numeric(p,"order") !== i+1) throw new Error("Path order gap"); numeric(p,"x"); numeric(p,"y"); if (i && p.x !== points[i-1].x && p.y !== points[i-1].y) throw new Error("Non-orthogonal path"); }
    const coords = new Set<string>(); for (const [i,p] of spots.entries()) { if (numeric(p,"spotIndex") !== i || coords.has(p.x+","+p.y)) throw new Error("Invalid spot index/duplicate"); numeric(p,"x"); numeric(p,"y"); coords.add(p.x+","+p.y); }
    // 格位与地台共用Map网格，导表时拒绝半格偏移、单格孤岛，避免视觉断裂再次进入游戏。
    const step = numeric(map, "gridSize"), originX = numeric(map, "gridOriginX"), originY = numeric(map, "gridOriginY");
    if (step <= 0) throw new Error("Invalid map grid: " + map.id);
    for (const spot of spots) {
      const x = numeric(spot, "x"), y = numeric(spot, "y");
      if (Math.abs((x - originX) / step - Math.round((x - originX) / step)) > 1e-6
        || Math.abs((y - originY) / step - Math.round((y - originY) / step)) > 1e-6) throw new Error("Off-grid spot: " + map.id + "/" + spot.spotIndex);
      if (!spots.some(other => other !== spot && Math.abs(numeric(other, "x") - x) + Math.abs(numeric(other, "y") - y) === step)) throw new Error("Isolated spot: " + map.id + "/" + spot.spotIndex);
    }
    const occupied = new Set<string>(); for (const o of next.Obstacle.filter(r => r.mapId === map.id)) { if (!spots.some(s=>s.spotIndex===o.spotIndex) || occupied.has(o.spotIndex)) throw new Error("Invalid obstacle spot"); if (!["crate","basket","plant"].includes(o.kind)) throw new Error("Invalid obstacle kind"); occupied.add(o.spotIndex); }
  }
  for (const level of next.Level) { const waves=next.Wave.filter(w=>w.levelId===level.id).sort((a,b)=>numeric(a,"order")-numeric(b,"order")); waves.forEach((w,i)=>{ if(numeric(w,"order")!==i+1)throw new Error("Wave order gap"); const groups=next.WaveGroup.filter(g=>g.waveId===w.id).sort((a,b)=>numeric(a,"order")-numeric(b,"order")); if(!groups.length)throw new Error("Empty wave"); groups.forEach((g,j)=>{if(numeric(g,"order")!==j+1)throw new Error("Wave group order gap");}); }); }
  // 完成所有检查后才发布；坏配置不覆盖已有可用快照。
  const nextKeys:Record<string,Record<string,TableRow>>=Object.create(null); for(const name of TABLE_NAMES){nextKeys[name]=Object.create(null);for(const row of next[name])if(row.key)nextKeys[name][row.key]=row;}
  data = next; byKey=nextKeys; ready = true; for (const listener of listeners) listener();
}
