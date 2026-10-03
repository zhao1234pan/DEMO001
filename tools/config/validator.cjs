// 由 ConfigTables.ts 生成，共用运行时校验算法。禁止手改。
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TABLE_NAMES = void 0;
exports.configsReady = configsReady;
exports.onConfigsReady = onConfigsReady;
exports.rows = rows;
exports.numeric = numeric;
exports.globalNumber = globalNumber;
exports.globalString = globalString;
exports.text = text;
exports.parseCsv = parseCsv;
exports.installConfigs = installConfigs;
exports.TABLE_NAMES = ["Global", "I18", "Staff", "Enemy", "Theme", "Map", "MapPoint", "Spot", "Obstacle", "Level", "Wave", "WaveGroup", "Collection", "Audio", "Decoration", "ArtAtlas", "ArtFrame", "UiPrefab", "Tutorial", "StaffBranch", "StaffForm", "LevelLoadout", "ChallengeRule", "ChallengePerk"];
let data = Object.create(null);
let ready = false;
let byKey = Object.create(null);
const listeners = [];
function configsReady() { return ready; }
function onConfigsReady(callback) { listeners.push(callback); if (ready)
    callback(); }
function rows(name) { if (!ready)
    throw new Error("Config not loaded: " + name); return data[name]; }
function numeric(row, field) { const value = Number(row[field]); if (row[field] === "" || !Number.isFinite(value))
    throw new Error(`Invalid number: ${field}/${row.id}`); return value; }
function globalNumber(key) { var _a; const row = (_a = byKey.Global) === null || _a === void 0 ? void 0 : _a[key]; if (!row)
    throw new Error("Missing global: " + key); return numeric(row, "value"); }
function globalString(key) { const row = rows("Global").find(item => item.key === key); if (!row)
    throw new Error("Missing global: " + key); return row.value; }
function text(key, ...args) {
    var _a;
    const row = (_a = byKey.I18) === null || _a === void 0 ? void 0 : _a[key];
    if (!row)
        throw new Error("Missing I18: " + key);
    return row.zhCN.replace(/\{p(\d+)\}/g, (match, index) => args[Number(index)] === undefined ? match : String(args[Number(index)]));
}
/** RFC 4180：支持 BOM、逗号、双引号、换行；禁止悄悄忽略损坏的行。 */
function parseCsv(source) {
    const grid = [];
    let line = [], value = "", quoted = false, closed = false;
    source = source.replace(/^\uFEFF/, "");
    for (let i = 0; i < source.length; i++) {
        const ch = source[i];
        if (quoted) {
            if (ch === '"') {
                if (source[i + 1] === '"') {
                    value += '"';
                    i++;
                }
                else {
                    quoted = false;
                    closed = true;
                }
            }
            else
                value += ch;
        }
        else if (ch === '"' && value === "" && !closed)
            quoted = true;
        else if (ch === ",") {
            line.push(value);
            value = "";
            closed = false;
        }
        else if (ch === "\n" || ch === "\r") {
            if (ch === "\r" && source[i + 1] === "\n")
                i++;
            line.push(value);
            if (line.some(cell => cell !== ""))
                grid.push(line);
            line = [];
            value = "";
            closed = false;
        }
        else {
            if (closed || ch === '"')
                throw new Error("Invalid CSV quote");
            value += ch;
        }
    }
    if (quoted)
        throw new Error("Unclosed CSV quote");
    if (value !== "" || line.length) {
        line.push(value);
        grid.push(line);
    }
    const fields = grid.shift();
    if (!fields || fields[0] !== "id" || new Set(fields).size !== fields.length || fields.some(x => !x))
        throw new Error("Invalid CSV header");
    const ids = new Set();
    return grid.map((cells, i) => { if (cells.length !== fields.length || !/^\d+$/.test(cells[0]) || Number(cells[0]) < 1 || ids.has(cells[0]))
        throw new Error("Invalid CSV row/id: " + (i + 2)); ids.add(cells[0]); const row = Object.create(null); fields.forEach((field, j) => row[field] = cells[j]); return row; });
}
function installConfigs(sources) {
    var _a;
    const next = Object.create(null);
    for (const name of exports.TABLE_NAMES) {
        if (typeof sources[name] !== "string")
            throw new Error("Missing table: " + name);
        next[name] = parseCsv(sources[name]);
        if (!next[name].length)
            throw new Error("Empty table: " + name);
    }
    const requireRef = (table, field, value, owner) => { if (!next[table].some(r => r[field] === value))
        throw new Error(`Invalid reference: ${owner} -> ${table}/${value}`); };
    for (const name of exports.TABLE_NAMES) {
        const keys = new Set();
        for (const row of next[name]) {
            if ("key" in row) {
                if (!row.key || keys.has(row.key))
                    throw new Error("Duplicate/empty key: " + name + "/" + row.key);
                keys.add(row.key);
            }
        }
    }
    const positive = (name, fields, zero = false) => { for (const row of next[name])
        for (const field of fields) {
            const n = numeric(row, field);
            if (zero ? n < 0 : n <= 0)
                throw new Error(`Out of range: ${name}/${row.id}/${field}`);
        } };
    positive("Decoration", ["width", "height"]);
    positive("Staff", ["cost", "range", "rate", "damage", "shotSpeed", "targets"]);
    positive("Enemy", ["hp", "speed", "radius", "damage"]);
    positive("Enemy", ["reward"], true);
    positive("Level", ["initialLives", "enemyHealthScale", "enemySpeedScale"]);
    positive("Level", ["initialCoins"], true);
    positive("Obstacle", ["hp"]);
    positive("Obstacle", ["reward"], true);
    positive("Wave", ["spawnInterval", "healthScale"]);
    positive("WaveGroup", ["count"]);
    for (const row of next.Global)
        if (row.type === "float")
            numeric(row, "value");
    for (const name of ["Staff", "Enemy", "Theme"])
        for (const row of next[name])
            requireRef("I18", "key", row.name, name);
    for (const row of next.Map)
        requireRef("Theme", "key", row.theme, "Map");
    for (const name of ["MapPoint", "Spot", "Obstacle", "Decoration"])
        for (const row of next[name])
            requireRef("Map", "id", row.mapId, name);
    for (const row of next.Level) {
        requireRef("Map", "id", row.mapId, "Level");
        requireRef("I18", "key", row.title, "Level");
        if (row.goal)
            requireRef("I18", "key", row.goal, "Level");
    }
    for (const staff of next.Staff) {
        requireRef("Level", "id", staff.unlockLevel, "Staff unlock");
        requireRef("I18", "key", staff.roleKey, "Staff role");
        if (next.Level.find(r => r.id === staff.unlockLevel).mode !== "adventure" || !Number.isInteger(numeric(staff, "displayOrder")) || numeric(staff, "displayOrder") < 1)
            throw new Error("Invalid staff unlock/order");
    }
    if (new Set(next.Staff.map(r => r.displayOrder)).size !== next.Staff.length)
        throw new Error("Duplicate staff order");
    if (next.LevelLoadout.length !== next.Level.length || new Set(next.LevelLoadout.map(r => r.levelId)).size !== next.Level.length)
        throw new Error("Missing/duplicate loadout level");
    for (const row of next.LevelLoadout) {
        requireRef("Level", "id", row.levelId, "LevelLoadout");
        const level = next.Level.find(r => r.id === row.levelId);
        const candidates = row.candidateStaff.split("|"), defaults = row.defaultStaff.split("|"), slots = numeric(row, "slots");
        if (!["0", "1"].includes(row.enabled) || !Number.isInteger(slots) || slots < 1 || slots > 4 || candidates.length > 8)
            throw new Error("Invalid loadout capacity");
        if (new Set(candidates).size !== candidates.length || new Set(defaults).size !== defaults.length)
            throw new Error("Duplicate loadout staff");
        for (const key of candidates) {
            requireRef("Staff", "key", key, "LevelLoadout");
            if (level.mode === "adventure" && numeric(next.Staff.find(r => r.key === key), "unlockLevel") > numeric(level, "id"))
                throw new Error("Early loadout staff");
        }
        if (defaults.some(k => !candidates.includes(k)) || defaults.length !== Math.min(slots, candidates.length))
            throw new Error("Invalid default loadout");
    }
    for (const row of next.Wave) {
        requireRef("Level", "id", row.levelId, "Wave");
        if (row.announcement)
            requireRef("I18", "key", row.announcement, "Wave");
    }
    for (const row of next.WaveGroup) {
        requireRef("Wave", "id", row.waveId, "WaveGroup");
        requireRef("Enemy", "key", row.enemy, "WaveGroup");
        if (!Number.isInteger(numeric(row, "count")))
            throw new Error("Fractional enemy count");
    }
    for (const row of next.Collection) {
        if (!["enemies", "bosses", "staff"].includes(row.tab))
            throw new Error("Invalid collection tab");
        requireRef(row.tab === "staff" ? "Staff" : "Enemy", "key", row.kind, "Collection");
        for (const field of ["category", "traits", "story"])
            requireRef("I18", "key", row[field], "Collection");
    }
    positive("ArtAtlas", ["width", "height"]);
    positive("ArtFrame", ["width", "height"]);
    positive("ArtFrame", ["x", "y"], true);
    for (const row of next.ArtFrame) {
        requireRef("ArtAtlas", "key", row.atlas, "ArtFrame");
        const atlas = next.ArtAtlas.find(a => a.key === row.atlas);
        if (numeric(row, "x") + numeric(row, "width") > numeric(atlas, "width") || numeric(row, "y") + numeric(row, "height") > numeric(atlas, "height"))
            throw new Error("Art frame outside atlas");
    }
    for (const field of ["battle", "menu", "ui", "scenery"]) {
        const keys = new Set();
        for (const row of next.ArtFrame) {
            if (!row[field])
                continue;
            if (keys.has(row[field]))
                throw new Error("Duplicate art frame key");
            keys.add(row[field]);
        }
    }
    for (const row of next.Tutorial) {
        requireRef("Level", "id", row.levelId, "Tutorial");
        requireRef("Staff", "key", row.staffKind, "Tutorial");
        const level = next.Level.find(item => item.id === row.levelId);
        if (level.mode !== "adventure" || !next.LevelLoadout.find(r => r.levelId === level.id).defaultStaff.split("|").includes(row.staffKind))
            throw new Error("Tutorial staff unavailable");
        if (!["deploy", "upgrade", "combo", "area", "clear"].includes(row.action))
            throw new Error("Unknown tutorial action");
        if (row.partnerKind && !next.LevelLoadout.find(r => r.levelId === level.id).defaultStaff.split("|").includes(row.partnerKind))
            throw new Error("Tutorial partner unavailable");
        if (row.action === "combo" && !row.partnerKind)
            throw new Error("Tutorial combo needs partner");
        for (const key of ["selectText", "actionText", "waitText"])
            requireRef("I18", "key", row[key], "Tutorial");
        const spot = next.Spot.find(item => item.mapId === level.mapId && item.spotIndex === row.spotIndex);
        if (!spot || !/^#[0-9a-fA-F]{6}$/.test(row.highlightColor))
            throw new Error("Invalid tutorial target/style");
        const obstacle = next.Obstacle.some(item => item.mapId === level.mapId && item.spotIndex === row.spotIndex);
        if ((row.action === "clear") !== obstacle)
            throw new Error("Tutorial preferred spot cannot support action");
        for (const key of ["order", "requiredValue"])
            if (!Number.isInteger(numeric(row, key)) || numeric(row, key) < 1)
                throw new Error("Invalid tutorial integer");
    }
    positive("Tutorial", ["firstWaveDelay", "pulseSeconds"]);
    for (const id of new Set(next.Tutorial.map(row => row.levelId))) {
        const steps = next.Tutorial.filter(row => row.levelId === id).sort((a, b) => numeric(a, "order") - numeric(b, "order"));
        if (steps.some((row, i) => numeric(row, "order") !== i + 1 || row.firstWaveDelay !== steps[0].firstWaveDelay))
            throw new Error("Tutorial order/delay mismatch");
    }
    for (const row of next.StaffBranch) {
        requireRef("Staff", "key", row.staffKey, "StaffBranch");
        requireRef("I18", "key", row.nameKey, "StaffBranch");
        requireRef("StaffForm", "key", row.formKey, "StaffBranch");
        const form = next.StaffForm.find(f => f.key === row.formKey);
        if (form.branchKey !== row.key)
            throw new Error("Evolution form owner mismatch");
        for (const field of ["damage", "attackInterval", "range", "upgradeCost"])
            if (numeric(row, field) <= 0)
                throw new Error("Invalid evolution value");
        for (const field of ["fromLevel", "toLevel", "burstCount", "targetCount", "upgradeCost"])
            if (!Number.isInteger(numeric(row, field)) || numeric(row, field) < 1)
                throw new Error("Invalid evolution integer");
        if (numeric(row, "fromLevel") + 1 !== numeric(row, "toLevel") || numeric(row, "toLevel") !== Number(next.Global.find(r => r.key === "maxStaffLevel").value))
            throw new Error("Invalid evolution level");
        const burst = numeric(row, "burstCount"), gap = numeric(row, "burstGap");
        if (gap < 0 || (burst === 1 ? gap !== 0 : gap <= 0) || (burst - 1) * gap >= numeric(row, "attackInterval"))
            throw new Error("Invalid burst timing");
        const slow = numeric(row, "slowSpeedRatio"), seconds = numeric(row, "slowSeconds"), outer = numeric(row, "splashOuterRatio");
        if (slow <= 0 || slow > 1 || seconds < 0 || (slow === 1) !== (seconds === 0) || outer < 0 || outer > 1 || numeric(row, "splashRadius") < 0)
            throw new Error("Invalid evolution effect");
        if (!next.Staff.some(r => r.key === row.staffKey && r.projectile === row.projectile))
            throw new Error("Unknown evolution projectile");
        for (const field of ["pierceLength", "pierceWidth", "pierceRatio", "chainCount", "chainRadius", "chainRatio", "burnDamage", "burnSeconds", "markSeconds", "laneBend"])
            if (numeric(row, field) < 0)
                throw new Error("Invalid evolution effect parameter");
        const pierce = numeric(row, "pierceLength"), chain = numeric(row, "chainCount"), burn = numeric(row, "burnDamage"), mark = numeric(row, "markRatio");
        if ((pierce === 0) !== (numeric(row, "pierceRatio") === 0) || numeric(row, "pierceRatio") > 1)
            throw new Error("Invalid evolution pierce");
        if (!Number.isInteger(chain) || chain === 1 || (chain === 0) !== (numeric(row, "chainRadius") === 0) || (chain === 0) !== (numeric(row, "chainRatio") === 0) || numeric(row, "chainRatio") > 1)
            throw new Error("Invalid evolution chain");
        if ((burn === 0) !== (numeric(row, "burnSeconds") === 0) || mark < 1 || (mark === 1) !== (numeric(row, "markSeconds") === 0))
            throw new Error("Invalid evolution timed strength");
        if (numeric(row, "shotSpeed") <= 0 || !/^#[0-9a-f]{6}$/i.test(row.shotColor))
            throw new Error("Invalid evolution projectile style");
    }
    for (const kind of next.Staff.map(r => r.key))
        if (next.StaffBranch.filter(r => r.staffKey === kind).length !== 2)
            throw new Error("Evolution requires two choices");
    for (const kind of new Set(next.StaffBranch.map(r => r.staffKey))) {
        const branches = next.StaffBranch.filter(r => r.staffKey === kind);
        const order = branches.map(b => next.StaffForm.find(f => f.key === b.formKey).displayOrder);
        if (new Set(order).size !== order.length)
            throw new Error("Duplicate evolution order");
    }
    for (const row of next.StaffForm) {
        requireRef("StaffBranch", "key", row.branchKey, "StaffForm");
        if (next.StaffBranch.find(r => r.key === row.branchKey).formKey !== row.key)
            throw new Error("Orphan evolution form");
        for (const key of ["storyKey", "summaryKey", "tradeoffKey"])
            requireRef("I18", "key", row[key], "StaffForm");
        if (!next.ArtFrame.some(f => f.battle === row.battleImageKey) || !next.ArtFrame.some(f => f.menu === row.portraitImageKey && f.ui === row.portraitImageKey))
            throw new Error("Missing evolution art");
        if (numeric(row, "spriteWidth") <= 0 || !Number.isInteger(numeric(row, "displayOrder")) || numeric(row, "displayOrder") < 1)
            throw new Error("Invalid form geometry/order");
    }
    for (const key of ["branchUnlockProgress", "branchAdventureStartLevel"]) {
        requireRef("Global", "key", key, "Evolution");
        const v = Number(next.Global.find(r => r.key === key).value);
        if (!Number.isInteger(v) || v < 1 || v > Number(next.Global.find(r => r.key === "maxLevels").value))
            throw new Error("Invalid evolution gate");
    }
    positive("Wave", ["bossHealthScale"]);
    const perkKeys = ["S01", "S02", "S03", "S04", "S05", "S06", "S07", "S08", "G01", "G02", "G03", "G04", "G05", "G06", "E01", "E02", "E03", "E04", "E05", "E06", "X01", "X02", "X03", "X04", "X05", "X06", "F01", "F02", "F03", "F04", "F05", "F06"];
    for (const row of next.ChallengePerk) {
        if (!perkKeys.includes(row.key) || !['S', 'G', 'E', 'X', 'F'].includes(row.category) || !['', 'space', 'evolve', 'obstacles'].includes(row.condition))
            throw Error('Unknown challenge effect/category/condition');
        if (row.staffKey)
            requireRef('Staff', 'key', row.staffKey, 'ChallengePerk');
        for (const field of ['nameKey', 'descriptionKey'])
            requireRef('I18', 'key', row[field], 'ChallengePerk');
        requireRef('ArtFrame', 'ui', row.iconKey, 'ChallengePerk');
        if (row.exclusive)
            requireRef('ChallengePerk', 'key', row.exclusive, 'ChallengePerk');
        const contracts = { S01: 'every|shots|ratio', S02: 'radius|count|seconds', S03: 'every|delay|ratio', S04: 'ratio', S05: 'every|ratio', S06: 'radius|ratio', S07: 'radius|count|seconds|generations', S08: 'radius|ratio', G01: 'seconds|rate', G02: 'radius|damage', G03: 'radius|damage|range', G04: 'step|damage|cap', G05: 'damage|range', G06: 'damage', E01: 'coins', E02: 'waves|ratio|cap', E03: 'charges', E04: 'charges', E05: 'coins|reward', E06: 'ratio', X01: 'progress', X02: 'shield', X03: 'count|progress|ratio|seconds', X04: 'coins|rate|seconds', X05: 'radius|ratio', X06: 'damage', F01: 'damage|range|rate|scale', F02: 'rate|damage|scale', F03: 'every|limit|coins|damage|radius|ratio|seconds', F04: 'every|damage|count|cooldown|speed|seconds|radius', F05: 'interval|count|delay|radius|damage', F06: 'hp|reward' };
        const params = JSON.parse(row.params);
        if (Object.keys(params).sort().join('|') !== contracts[row.key].split('|').sort().join('|'))
            throw Error('Challenge parameter contract mismatch');
        for (const [key, value] of Object.entries(params)) {
            if (!Number.isFinite(value) || value <= (['rate', 'damage', 'range'].includes(key) ? -1 : 0) || Math.abs(value) > 100000)
                throw Error('Invalid challenge parameter range');
            if (['every', 'shots', 'count', 'generations', 'waves', 'charges', 'limit', 'coins', 'shield', 'reward'].includes(key) && !Number.isInteger(value))
                throw Error('Invalid challenge integer parameter');
            if (['progress', 'ratio'].includes(key) && value > 1 && !['S06'].includes(row.key))
                throw Error('Invalid challenge ratio');
        }
        if (row.category !== row.key[0] || (row.category === 'S' && row.staffKey !== ['sprout', 'frost', 'bloom', 'scope', 'spark', 'ember', 'mint', 'fan'][Number(row.key.slice(1)) - 1]) || (row.category === 'S') !== Boolean(row.staffKey))
            throw Error('Invalid staff challenge card');
        if (row.exclusive && next.ChallengePerk.find(r => r.key === row.exclusive).exclusive !== row.key)
            throw Error('Asymmetric challenge exclusion');
        if (!params || Array.isArray(params) || Object.values(params).some(v => typeof v !== 'number' || !Number.isFinite(v)))
            throw Error('Invalid challenge parameters');
        if (!Number.isInteger(numeric(row, 'maxWave')) || numeric(row, 'maxWave') < 0)
            throw Error('Invalid challenge eligibility');
    }
    if (next.ChallengePerk.length !== perkKeys.length || perkKeys.some(k => !next.ChallengePerk.some(r => r.key === k)))
        throw Error('Missing challenge effect');
    if (new Set(next.ChallengeRule.map(r => r.levelId)).size !== next.ChallengeRule.length)
        throw Error('Duplicate challenge rule');
    for (const row of next.ChallengeRule) {
        if (!Number.isInteger(numeric(row, 'cashReward')) || numeric(row, 'cashReward') < 0 || !Number.isInteger(numeric(row, 'freeProps')) || numeric(row, 'freeProps') < 0 || numeric(row, 'reviveProgress') <= 0 || numeric(row, 'reviveProgress') >= 1)
            throw Error('Invalid challenge supply rule');
        requireRef('Level', 'id', row.levelId, 'ChallengeRule');
        const waves = next.Wave.filter(w => w.levelId === row.levelId), choice = row.choiceWaves.split('|').map(Number);
        if (next.Level.find(l => l.id === row.levelId).mode !== 'challenge' || !choice.length || choice[0] !== 0 || choice.some((v, i) => !Number.isInteger(v) || v < 0 || v >= waves.length || (i > 0 && v <= choice[i - 1])))
            throw Error('Invalid challenge choice schedule');
        if (!['0', '1'].includes(row.allowAllStaff) || numeric(row, 'minIntervalRatio') <= 0 || numeric(row, 'minIntervalRatio') > 1 || numeric(row, 'waveReward') < 0 || numeric(row, 'firstDelay') <= 0 || numeric(row, 'nextDelay') <= 0 || !Number.isInteger(numeric(row, 'freeRefresh')) || numeric(row, 'freeRefresh') < 0)
            throw Error('Invalid challenge rule');
    }
    const requiredGlobals = ["gameName", "maxLevels", "rewardAdUnitId", "version", "upgradeDamage", "upgradeRange", "upgradeRate", "upgradeCostBase", "upgradeCostStep", "maxStaffLevel", "sellRatio", "waveHealthGrowth", "waveBonusBase", "waveBonusStep", "firstWaveDelay", "nextWaveDelay", "reviveWaveDelay", "reviveMinLives", "reviveLifeRatio", "freezeSeconds", "cashBase", "cashPerLevel", "freePropCount", "slowSpeedRatio", "markDamageRatio", "musicVolume", "maxEffectSources", "toastSeconds", "challengeLevelId", "touchTravelTolerance"];
    for (const key of requiredGlobals) {
        requireRef("Global", "key", key, "Global contract");
        const row = next.Global.find(r => r.key === key);
        if (!["gameName", "rewardAdUnitId", "version"].includes(key) && (row.type !== "float" || numeric(row, "value") < 0))
            throw new Error("Invalid global: " + key);
    }
    for (const key of ["maxLevels", "maxStaffLevel", "reviveMinLives", "maxEffectSources"]) {
        const value = Number(next.Global.find(r => r.key === key).value);
        if (!Number.isInteger(value) || value < 1)
            throw new Error("Invalid integer global: " + key);
    }
    for (const key of ["sellRatio", "reviveLifeRatio", "slowSpeedRatio", "musicVolume"])
        if (Number(next.Global.find(r => r.key === key).value) > 1)
            throw new Error("Ratio exceeds one: " + key);
    if (!Number.isInteger(Number(next.Global.find(r => r.key === "freePropCount").value)))
        throw new Error("Fractional free prop count");
    requireRef("I18", "key", next.Global.find(r => r.key === "gameName").value, "gameName");
    for (const row of next.Staff) {
        if (!["sprout", "frost", "bloom", "scope", "spark", "ember", "mint", "fan"].includes(row.projectile))
            throw new Error("Unknown projectile renderer: " + row.projectile);
        for (const field of ["slow", "pierce", "shred"])
            if (!["0", "1"].includes(row[field]))
                throw new Error("Invalid feature flag");
        for (const field of ["splash", "chain", "burn", "pierceLength", "pierceWidth", "pierceRatio", "chainRadius", "chainRatio", "burnSeconds", "markSeconds", "slowBase", "slowPerLevel", "arcHeight", "laneBend"])
            if (numeric(row, field) < 0)
                throw new Error("Negative staff parameter");
        for (const field of ["targets", "chain"])
            if (!Number.isInteger(numeric(row, field)))
                throw new Error("Fractional target count");
        if (numeric(row, "pierceRatio") > 1 || numeric(row, "chainRatio") > 1)
            throw new Error("Invalid attack falloff");
        if (!next.ArtFrame.some(f => f.menu === row.key && f.ui === row.key))
            throw new Error("Missing staff portrait: " + row.key);
    }
    for (const row of next.Enemy) {
        if (!["", "mini", "major"].includes(row.boss) || numeric(row, "clearRatio") < 0 || numeric(row, "clearRatio") > 1)
            throw new Error("Invalid enemy rank/clear ratio");
        if (!next.ArtFrame.some(f => f.battle === "enemy_" + row.key && f.menu === "enemy_" + row.key))
            throw new Error("Missing enemy portrait");
    }
    for (const row of next.Decoration)
        if (!["tree", "planter"].includes(row.kind))
            throw new Error("Unknown decoration kind");
    for (const row of next.Collection)
        if (!next.ArtFrame.some(f => f.menu === row.imageKey))
            throw new Error("Unknown collection image");
    for (const row of next.UiPrefab)
        if (!/^ui\/[a-z_]+$/.test(row.path))
            throw new Error("Invalid UI prefab path: " + row.key);
    // 表现参数必须有限且有界，避免无穷特效或每帧分配过量对象。
    const feedbackRanges = [
        ["hitFeedbackSeconds", 0.01, 1, false], ["hitFeedbackScale", 0, 0.2, false],
        ["impactSeconds", 0.01, 1, false], ["impactLimit", 1, 128, true],
        ["bossEntranceSeconds", 0.1, 10, false], ["bossDefeatSeconds", 0.1, 10, false],
    ];
    for (const [key, min, max, integer] of feedbackRanges) {
        const row = next.Global.find(r => r.key === key);
        if (!row || row.type !== "float")
            throw new Error("Missing feedback parameter: " + key);
        const value = numeric(row, "value");
        if (value < min || value > max || (integer && !Number.isInteger(value)))
            throw new Error("Invalid feedback parameter: " + key);
    }
    const max = Number((_a = next.Global.find(r => r.key === "maxLevels")) === null || _a === void 0 ? void 0 : _a.value);
    if (!Number.isInteger(max) || max !== next.Level.filter(r => r.mode === "adventure").length)
        throw new Error("maxLevels mismatch");
    for (let id = 1; id <= max; id++) {
        requireRef("Level", "id", String(id), "Level sequence");
        if (!next.Wave.some(w => w.levelId === String(id)))
            throw new Error("Level without waves");
    }
    const challengeId = next.Global.find(r => r.key === "challengeLevelId").value;
    requireRef("Level", "id", challengeId, "challengeLevelId");
    if (next.Level.find(r => r.id === challengeId).mode !== "challenge")
        throw new Error("Challenge mode mismatch");
    for (const level of next.Level) {
        if (!["adventure", "challenge"].includes(level.mode))
            throw new Error("Unknown level mode");
        if (level.mode === "adventure" && (numeric(level, "id") > max || numeric(level, "id") < 1))
            throw new Error("Adventure ID outside progress");
        if (level.mode === "challenge" && numeric(level, "id") <= max)
            throw new Error("Challenge overlaps adventure");
        if (level.mode === "challenge" && !next.ChallengeRule.some(r => r.levelId === level.id))
            throw new Error("Missing challenge rule");
        if (new Set(next.LevelLoadout.find(r => r.levelId === level.id).defaultStaff.split("|")).size !== next.LevelLoadout.find(r => r.levelId === level.id).defaultStaff.split("|").length)
            throw new Error("Duplicate available staff");
        if (numeric(level, "enemySpeedScale") !== 1)
            throw new Error("Base speed must not scale by level");
    }
    for (const map of next.Map) {
        const points = next.MapPoint.filter(r => r.mapId === map.id).sort((a, b) => numeric(a, "order") - numeric(b, "order"));
        const spots = next.Spot.filter(r => r.mapId === map.id).sort((a, b) => numeric(a, "spotIndex") - numeric(b, "spotIndex"));
        if (points.length < 2 || !spots.length)
            throw new Error("Empty map: " + map.id);
        for (const [i, p] of points.entries()) {
            if (numeric(p, "order") !== i + 1)
                throw new Error("Path order gap");
            numeric(p, "x");
            numeric(p, "y");
            if (i && p.x !== points[i - 1].x && p.y !== points[i - 1].y)
                throw new Error("Non-orthogonal path");
        }
        const coords = new Set();
        for (const [i, p] of spots.entries()) {
            if (numeric(p, "spotIndex") !== i || coords.has(p.x + "," + p.y))
                throw new Error("Invalid spot index/duplicate");
            numeric(p, "x");
            numeric(p, "y");
            coords.add(p.x + "," + p.y);
        }
        // 格位与地台共用Map网格，导表时拒绝半格偏移、单格孤岛，避免视觉断裂再次进入游戏。
        const step = numeric(map, "gridSize"), originX = numeric(map, "gridOriginX"), originY = numeric(map, "gridOriginY");
        if (step <= 0)
            throw new Error("Invalid map grid: " + map.id);
        for (const spot of spots) {
            const x = numeric(spot, "x"), y = numeric(spot, "y");
            if (Math.abs((x - originX) / step - Math.round((x - originX) / step)) > 1e-6
                || Math.abs((y - originY) / step - Math.round((y - originY) / step)) > 1e-6)
                throw new Error("Off-grid spot: " + map.id + "/" + spot.spotIndex);
            if (!spots.some(other => other !== spot && Math.abs(numeric(other, "x") - x) + Math.abs(numeric(other, "y") - y) === step))
                throw new Error("Isolated spot: " + map.id + "/" + spot.spotIndex);
        }
        const occupied = new Set();
        for (const o of next.Obstacle.filter(r => r.mapId === map.id)) {
            if (!spots.some(s => s.spotIndex === o.spotIndex) || occupied.has(o.spotIndex))
                throw new Error("Invalid obstacle spot");
            if (!["crate", "basket", "plant"].includes(o.kind))
                throw new Error("Invalid obstacle kind");
            occupied.add(o.spotIndex);
        }
    }
    for (const level of next.Level) {
        const waves = next.Wave.filter(w => w.levelId === level.id).sort((a, b) => numeric(a, "order") - numeric(b, "order"));
        waves.forEach((w, i) => { if (numeric(w, "order") !== i + 1)
            throw new Error("Wave order gap"); const groups = next.WaveGroup.filter(g => g.waveId === w.id).sort((a, b) => numeric(a, "order") - numeric(b, "order")); if (!groups.length)
            throw new Error("Empty wave"); groups.forEach((g, j) => { if (numeric(g, "order") !== j + 1)
            throw new Error("Wave group order gap"); }); });
    }
    // 完成所有检查后才发布；坏配置不覆盖已有可用快照。
    const nextKeys = Object.create(null);
    for (const name of exports.TABLE_NAMES) {
        nextKeys[name] = Object.create(null);
        for (const row of next[name])
            if (row.key)
                nextKeys[name][row.key] = row;
    }
    data = next;
    byKey = nextKeys;
    ready = true;
    for (const listener of listeners)
        listener();
}
