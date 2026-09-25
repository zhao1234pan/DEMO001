import {
  _decorator, Color, Component, EventTouch, Graphics, HorizontalTextAlignment,
  Label, Layers, Node, ResolutionPolicy, UITransform, Vec3,
  VerticalTextAlignment, view,
} from "cc";
import { GAME_CONFIG, PATH_POINTS, TOWER_CONFIG, TOWER_SPOTS, EnemyKind, TowerKind } from "./GameConfig";
import { PlatformService } from "../platform/PlatformService";

const { ccclass } = _decorator;
const W = GAME_CONFIG.designWidth;
const H = GAME_CONFIG.designHeight;
const PANEL_Y = 590;
const KINDS: TowerKind[] = ["sprout", "frost", "bloom"];

interface Enemy {
  kind: EnemyKind; hp: number; maxHp: number; speed: number; reward: number;
  radius: number; color: string; damage: number; distance: number; x: number; y: number;
  age: number; slow: number;
}

interface Tower {
  x: number; y: number; kind: TowerKind; level: number; cooldown: number;
  angle: number; spent: number; spot: Spot;
}

interface Spot { x: number; y: number; tower: Tower | null; }
interface Shot { x: number; y: number; target: Enemy; kind: TowerKind; level: number; speed: number; }
interface Particle { x: number; y: number; vx: number; vy: number; size: number; color: string; life: number; maxLife: number; }

@ccclass("GameRoot")
export class GameRoot extends Component {
  private staticG!: Graphics;
  private dynamicG!: Graphics;
  private labels = new Map<string, Label>();
  private coins: number = GAME_CONFIG.initialCoins;
  private lives: number = GAME_CONFIG.initialLives;
  private wave: number = 0;
  private inWave = false;
  private paused = false;
  private screen: "playing" | "win" | "lose" = "playing";
  private revived = false;
  private selectedKind: TowerKind = "sprout";
  private selectedTower: Tower | null = null;
  private queue: EnemyKind[] = [];
  private spawnTimer = 0;
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private shots: Shot[] = [];
  private particles: Particle[] = [];
  private spots: Spot[] = [];
  private toastText = "先选择防御塔，再点击圆形塔位建造";
  private toastTime = 4;
  private defeated = 0;
  private earned = 0;
  private readonly pathLength = this.computePathLength();
  private readonly hideHandler = (): void => { this.paused = true; };

  onLoad(): void {
    view.setDesignResolutionSize(W, H, ResolutionPolicy.FIXED_WIDTH);
    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    transform.setContentSize(W, H);
    this.staticG = this.createGraphics("StaticMap");
    this.dynamicG = this.createGraphics("DynamicGame");
    this.createLabels();
    this.resetGame();
    this.drawStaticMap();
    this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    PlatformService.onHide(this.hideHandler);
  }

  onDestroy(): void {
    this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    PlatformService.offHide(this.hideHandler);
  }

  update(dt: number): void {
    dt = Math.min(dt, 0.033);
    if (!this.paused && this.screen === "playing") this.updateGame(dt);
    this.render();
  }

  private createGraphics(name: string): Graphics {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.setPosition(-W / 2, H / 2);
    node.setScale(1, -1, 1);
    this.node.addChild(node);
    node.addComponent(UITransform).setContentSize(W, H);
    return node.addComponent(Graphics);
  }

  private createLabels(): void {
    this.makeLabel("title", "守护芽芽", 18, 74, 23, 112, 30, "#fff9df", HorizontalTextAlignment.LEFT);
    this.makeLabel("wave", "", 13, 76, 50, 116, 24, "#aee3bd", HorizontalTextAlignment.LEFT);
    this.makeLabel("coin", "", 16, 220, 34, 56, 36, "#fff9df");
    this.makeLabel("lives", "", 16, 306, 34, 46, 36, "#fff9df");
    this.makeLabel("pause", "Ⅱ", 18, 360, 34, 40, 40, "#fff9df");
    KINDS.forEach((kind, i) => {
      this.makeLabel(`tower-${kind}`, TOWER_CONFIG[kind].name, 13, 56 + i * 98, 646, 88, 22, "#fff9df");
      this.makeLabel(`cost-${kind}`, `● ${TOWER_CONFIG[kind].cost}`, 12, 56 + i * 98, 669, 88, 20, "#f2d67e");
    });
    this.makeLabel("action", "开始\n战斗", 13, 344, 643, 68, 72, "#fff9df");
    this.makeLabel("selected", "", 16, 104, 614, 170, 25, "#fff9df", HorizontalTextAlignment.LEFT);
    this.makeLabel("hint", "", 12, 104, 640, 170, 22, "#aedcbc", HorizontalTextAlignment.LEFT);
    this.makeLabel("upgrade", "", 13, 102, 672, 165, 30, "#fff9df");
    this.makeLabel("sell", "", 13, 287, 672, 165, 30, "#fff9df");
    this.makeLabel("toast", "", 12, 195, 101, 290, 30, "#fff9df");
    this.makeLabel("overlayTitle", "", 27, 195, 284, 286, 45, "#17352e");
    this.makeLabel("overlayStats", "", 14, 195, 340, 270, 58, "#32724c");
    this.makeLabel("overlayPrimary", "", 14, 195, 412, 246, 44, "#fff9df");
    this.makeLabel("overlayNote", "", 11, 195, 454, 270, 24, "#71877d");
    this.makeLabel("overlaySecondary", "", 14, 195, 496, 246, 40, "#fff9df");
  }

  private makeLabel(key: string, value: string, size: number, x: number, y: number, width: number, height: number, hex: string, align = HorizontalTextAlignment.CENTER): Label {
    const node = new Node(key);
    node.layer = Layers.Enum.UI_2D;
    node.setPosition(x - W / 2, H / 2 - y);
    this.node.addChild(node);
    node.addComponent(UITransform).setContentSize(width, height);
    const label = node.addComponent(Label);
    label.string = value; label.fontSize = size; label.lineHeight = size + 5; label.color = this.color(hex);
    label.horizontalAlign = align; label.verticalAlign = VerticalTextAlignment.CENTER;
    this.labels.set(key, label);
    return label;
  }

  private color(hex: string, alpha = 255): Color {
    const value = new Color();
    Color.fromHEX(value, hex);
    value.a = alpha;
    return value;
  }

  private drawStaticMap(): void {
    const g = this.staticG;
    g.clear(); g.fillColor = this.color("#dff0b7"); g.rect(0, 0, W, H); g.fill();
    g.lineCap = Graphics.LineCap.ROUND; g.lineJoin = Graphics.LineJoin.ROUND;
    const tracePath = (): void => {
      g.moveTo(PATH_POINTS[0][0], PATH_POINTS[0][1]);
      for (let i = 1; i < PATH_POINTS.length; i += 1) g.lineTo(PATH_POINTS[i][0], PATH_POINTS[i][1]);
    };
    g.lineWidth = 58; g.strokeColor = this.color("#c59b60"); tracePath(); g.stroke();
    g.lineWidth = 48; g.strokeColor = this.color("#eacb92"); tracePath(); g.stroke();
    g.fillColor = this.color("#856b9e"); g.circle(-2, 142, 31); g.fill();
    g.fillColor = this.color("#c9a9df"); g.circle(-2, 142, 21); g.fill();
    g.fillColor = this.color("#88d072"); g.circle(378, 492, 31); g.fill();
    g.fillColor = this.color("#d7ff86"); g.circle(378, 492, 21); g.fill();
  }

  private render(): void {
    const g = this.dynamicG;
    g.clear();
    this.drawSpots(g);
    this.enemies.forEach((enemy) => this.drawEnemy(g, enemy));
    this.shots.forEach((shot) => this.disc(g, shot.x, shot.y, shot.kind === "bloom" ? 5 : 3.5, TOWER_CONFIG[shot.kind].shotColor));
    this.particles.forEach((p) => this.disc(g, p.x, p.y, p.size, p.color, Math.max(0, p.life / p.maxLife)));
    this.drawPanels(g);
    this.syncLabels();
    if (this.paused || this.screen !== "playing") this.drawOverlay(g);
  }

  private drawSpots(g: Graphics): void {
    for (const spot of this.spots) {
      if (!spot.tower) {
        this.disc(g, spot.x, spot.y, 24, "#ffffff", 0.42);
        this.ring(g, spot.x, spot.y, 24, "#32724c", 0.4, 2);
        this.ring(g, spot.x, spot.y, 9, "#32724c", 0.45, 2);
      } else this.drawTower(g, spot.tower);
    }
  }

  private drawTower(g: Graphics, tower: Tower): void {
    const cfg = TOWER_CONFIG[tower.kind];
    if (tower === this.selectedTower) {
      this.disc(g, tower.x, tower.y, cfg.range * (1 + (tower.level - 1) * 0.08), "#57a96a", 0.08);
      this.ring(g, tower.x, tower.y, cfg.range * (1 + (tower.level - 1) * 0.08), "#32724c", 0.35, 1);
    }
    this.disc(g, tower.x, tower.y + 6, 22, "#8c7047");
    this.disc(g, tower.x, tower.y + 2, 18, cfg.color);
    this.ring(g, tower.x, tower.y + 2, 18, "#2d6048", 1, 2);
    if (tower.kind === "sprout") {
      this.disc(g, tower.x - 7, tower.y - 7, 8, "#3d874b"); this.disc(g, tower.x + 7, tower.y - 7, 8, "#3d874b");
      this.disc(g, tower.x, tower.y + 1, 8, "#dcf278");
    } else if (tower.kind === "frost") {
      for (let i = 0; i < 6; i += 1) {
        const a = (Math.PI * 2 * i) / 6;
        this.disc(g, tower.x + Math.cos(a) * 11, tower.y + 2 + Math.sin(a) * 11, 4, "#ddfbff");
      }
      this.disc(g, tower.x, tower.y + 2, 7, "#eefeff");
    } else {
      for (let i = 0; i < 6; i += 1) {
        const a = (Math.PI * 2 * i) / 6;
        this.disc(g, tower.x + Math.cos(a) * 10, tower.y + 2 + Math.sin(a) * 10, 6, "#ffd0de");
      }
      this.disc(g, tower.x, tower.y + 2, 6, "#ffe568");
    }
    for (let i = 0; i < tower.level; i += 1) this.disc(g, tower.x - 7 + i * 7, tower.y + 19, 2.2, "#ffc34d");
  }

  private drawEnemy(g: Graphics, enemy: Enemy): void {
    const wobble = Math.sin(enemy.age * 8) * 1.5;
    this.disc(g, enemy.x, enemy.y + 4 + wobble, enemy.radius, enemy.color);
    this.ring(g, enemy.x, enemy.y + 4 + wobble, enemy.radius, "#17352e", 0.45, 2);
    this.disc(g, enemy.x - 5, enemy.y + wobble, 2.2, "#fff9df"); this.disc(g, enemy.x + 5, enemy.y + wobble, 2.2, "#fff9df");
    this.disc(g, enemy.x - 5, enemy.y + wobble, 1.1, "#17352e"); this.disc(g, enemy.x + 5, enemy.y + wobble, 1.1, "#17352e");
    if (enemy.kind === "tank") this.box(g, enemy.x - 13, enemy.y - 14 + wobble, 26, 8, 4, "#8e7357");
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    this.box(g, enemy.x - 17, enemy.y - enemy.radius - 10, 34, 5, 3, "#17352e", 0.32);
    this.box(g, enemy.x - 17, enemy.y - enemy.radius - 10, 34 * ratio, 5, 3, ratio > 0.35 ? "#70c963" : "#eb685d");
    if (enemy.slow > 0) this.ring(g, enemy.x, enemy.y, enemy.radius + 3, "#b4f6ff", 0.7, 2);
  }

  private drawPanels(g: Graphics): void {
    g.fillColor = this.color("#17352e"); g.rect(0, 0, W, 72); g.fill(); g.rect(0, PANEL_Y, W, H - PANEL_Y); g.fill();
    this.box(g, 177, 13, 74, 42, 14, "#ffffff", 0.1); this.box(g, 259, 13, 74, 42, 14, "#ffffff", 0.1);
    this.disc(g, 360, 34, 20, "#ffffff", 0.12);
    if (this.selectedTower) {
      const tower = this.selectedTower;
      this.box(g, 18, 655, 169, 34, 12, tower.level < 3 ? "#58a95e" : "#567068");
      this.box(g, 203, 655, 169, 34, 12, "#9a7654");
    } else {
      KINDS.forEach((kind, i) => {
        const selected = this.selectedKind === kind;
        this.box(g, 12 + i * 98, 602, 88, 82, 14, selected ? "#fff3c2" : "#ffffff", selected ? 1 : 0.1);
        this.disc(g, 56 + i * 98, 624, 13, TOWER_CONFIG[kind].color);
      });
      this.box(g, 310, 602, 68, 82, 14, !this.inWave && this.wave < GAME_CONFIG.maxWaves ? "#ef8d4e" : "#ffffff", !this.inWave && this.wave < GAME_CONFIG.maxWaves ? 1 : 0.08);
    }
    if (this.toastTime > 0) this.box(g, 43, 82, 304, 38, 16, "#17352e", 0.9);
  }

  private drawOverlay(g: Graphics): void {
    g.fillColor = this.color("#0c1f1a", 196); g.rect(0, 72, W, H - 72); g.fill();
    if (this.paused && this.screen === "playing") {
      this.box(g, 55, 226, 280, 210, 24, "#fff9df"); this.box(g, 91, 355, 208, 52, 14, "#58a95e");
      return;
    }
    const win = this.screen === "win";
    this.box(g, 36, 176, 318, win ? 318 : 360, 26, "#fff9df");
    this.disc(g, 195, 225, 40, win ? "#8fd66f" : "#f09a7c");
    if (!win && !this.revived) {
      this.box(g, 72, 386, 246, 52, 14, "#e78954"); this.box(g, 72, 474, 246, 44, 14, "#58a95e");
    } else this.box(g, 72, 394, 246, 52, 14, "#58a95e");
  }

  private syncLabels(): void {
    this.setLabel("wave", `第 ${this.wave}/${GAME_CONFIG.maxWaves} 波`);
    this.setLabel("coin", `● ${this.coins}`); this.setLabel("lives", `♥ ${this.lives}`); this.setLabel("pause", this.paused ? "▶" : "Ⅱ");
    const selecting = !this.selectedTower;
    KINDS.forEach((kind) => { this.showLabel(`tower-${kind}`, selecting); this.showLabel(`cost-${kind}`, selecting); });
    this.showLabel("action", selecting); this.setLabel("action", this.inWave ? "战斗中" : this.wave === 0 ? "开始\n战斗" : this.wave < GAME_CONFIG.maxWaves ? "下一波" : "完成");
    ["selected", "hint", "upgrade", "sell"].forEach((key) => this.showLabel(key, !selecting));
    if (this.selectedTower) {
      const tower = this.selectedTower;
      this.setLabel("selected", `${TOWER_CONFIG[tower.kind].name}  Lv.${tower.level}`);
      this.setLabel("hint", tower.level >= 3 ? "已满级" : `升级需要 ${this.upgradeCost(tower)} 阳光`);
      this.setLabel("upgrade", tower.level >= 3 ? "已满级" : `升级  ● ${this.upgradeCost(tower)}`);
      this.setLabel("sell", `出售  ● ${this.sellValue(tower)}`);
    }
    this.showLabel("toast", this.toastTime > 0 && this.screen === "playing" && !this.paused); this.setLabel("toast", this.toastText);
    const overlay = this.paused || this.screen !== "playing";
    ["overlayTitle", "overlayStats", "overlayPrimary", "overlayNote", "overlaySecondary"].forEach((key) => this.showLabel(key, overlay));
    if (!overlay) return;
    if (this.paused && this.screen === "playing") {
      this.setLabel("overlayTitle", "游戏暂停"); this.setLabel("overlayStats", "让芽芽们喘口气"); this.setLabel("overlayPrimary", "继续守护");
      this.setLabel("overlayNote", ""); this.setLabel("overlaySecondary", "");
    } else {
      const win = this.screen === "win";
      this.setLabel("overlayTitle", win ? "芽芽安全啦！" : "核心失守了");
      this.setLabel("overlayStats", `消灭 ${this.defeated} 只捣蛋怪\n累计获得 ${this.earned} 阳光`);
      this.setLabel("overlayPrimary", !win && !this.revived ? "看广告复活  +5生命" : "再玩一次");
      this.setLabel("overlayNote", !win && !this.revived ? "广告未加载时也不会中断游戏" : "");
      this.setLabel("overlaySecondary", !win && !this.revived ? "重新开始" : "");
    }
  }

  private disc(g: Graphics, x: number, y: number, radius: number, hex: string, alpha = 1): void {
    g.fillColor = this.color(hex, Math.round(alpha * 255)); g.circle(x, y, radius); g.fill();
  }

  private ring(g: Graphics, x: number, y: number, radius: number, hex: string, alpha = 1, width = 1): void {
    g.strokeColor = this.color(hex, Math.round(alpha * 255)); g.lineWidth = width; g.circle(x, y, radius); g.stroke();
  }

  private box(g: Graphics, x: number, y: number, width: number, height: number, radius: number, hex: string, alpha = 1): void {
    g.fillColor = this.color(hex, Math.round(alpha * 255)); g.roundRect(x, y, width, height, radius); g.fill();
  }

  private setLabel(key: string, value: string): void { const item = this.labels.get(key); if (item) item.string = value; }
  private showLabel(key: string, visible: boolean): void { const item = this.labels.get(key); if (item) item.node.active = visible; }

  private resetGame(): void {
    this.coins = GAME_CONFIG.initialCoins; this.lives = GAME_CONFIG.initialLives; this.wave = 0;
    this.inWave = false; this.paused = false; this.screen = "playing"; this.revived = false;
    this.selectedKind = "sprout"; this.selectedTower = null; this.queue = []; this.spawnTimer = 0;
    this.enemies = []; this.towers = []; this.shots = []; this.particles = [];
    this.spots = TOWER_SPOTS.map(([x, y]) => ({ x, y, tower: null }));
    this.toastText = "先选择防御塔，再点击圆形塔位建造"; this.toastTime = 4;
    this.defeated = 0; this.earned = 0;
  }

  private updateGame(dt: number): void {
    this.toastTime = Math.max(0, this.toastTime - dt);
    if (this.inWave && this.queue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnEnemy(this.queue.shift()!);
        this.spawnTimer = Math.max(0.42, 0.9 - this.wave * 0.025);
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      enemy.age += dt; enemy.slow = Math.max(0, enemy.slow - dt);
      enemy.distance += enemy.speed * (enemy.slow > 0 ? 0.57 : 1) * dt;
      const pos = this.pathPosition(enemy.distance); enemy.x = pos.x; enemy.y = pos.y;
      if (pos.done || enemy.distance >= this.pathLength) {
        this.lives -= enemy.damage; this.burst(enemy.x, enemy.y, "#eb685d", 10); this.enemies.splice(i, 1);
        if (this.lives <= 0) {
          this.lives = 0; this.screen = "lose";
          PlatformService.setNumber("sprout_best_wave", Math.max(this.wave, PlatformService.getNumber("sprout_best_wave", 0)));
          return;
        }
      }
    }

    for (const tower of this.towers) {
      tower.cooldown -= dt;
      const cfg = TOWER_CONFIG[tower.kind];
      const range = cfg.range * (1 + (tower.level - 1) * 0.08);
      const target = this.enemies.filter((enemy) => Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= range).sort((a, b) => b.distance - a.distance)[0];
      if (!target) continue;
      tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
      if (tower.cooldown <= 0) {
        this.shots.push({ x: tower.x, y: tower.y, target, kind: tower.kind, level: tower.level, speed: tower.kind === "bloom" ? 150 : 230 });
        tower.cooldown = cfg.rate / (1 + (tower.level - 1) * 0.15);
      }
    }

    for (let i = this.shots.length - 1; i >= 0; i -= 1) {
      const shot = this.shots[i];
      if (!this.enemies.includes(shot.target)) { this.shots.splice(i, 1); continue; }
      const dx = shot.target.x - shot.x; const dy = shot.target.y - shot.y; const distance = Math.hypot(dx, dy);
      if (distance < shot.target.radius + 6) { this.hit(shot, shot.target); this.shots.splice(i, 1); }
      else { shot.x += dx / distance * shot.speed * dt; shot.y += dy / distance * shot.speed * dt; }
    }

    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 35 * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    if (this.inWave && this.queue.length === 0 && this.enemies.length === 0) {
      this.inWave = false; const bonus = 22 + this.wave * 5; this.coins += bonus; this.earned += bonus;
      if (this.wave >= GAME_CONFIG.maxWaves) this.screen = "win";
      else this.showToast(`守住了！波次奖励 +${bonus}`);
    }
  }

  private startWave(): void {
    if (this.inWave || this.wave >= GAME_CONFIG.maxWaves) return;
    this.wave += 1; const count = 5 + this.wave * 2; this.queue = [];
    for (let i = 0; i < count; i += 1) {
      let kind: EnemyKind = "normal";
      if (this.wave >= 3 && i % 5 === 4) kind = "swift";
      if (this.wave >= 5 && i % 7 === 6) kind = "tank";
      this.queue.push(kind);
    }
    if (this.wave === GAME_CONFIG.maxWaves) this.queue.push("tank", "tank");
    this.spawnTimer = 0; this.inWave = true; this.showToast(`第 ${this.wave} 波来袭！`);
  }

  private spawnEnemy(kind: EnemyKind): void {
    const base = {
      normal: { hp: 48, speed: 43, reward: 14, radius: 15, color: "#9a77bd", damage: 1 },
      swift: { hp: 38, speed: 70, reward: 18, radius: 13, color: "#e5aa54", damage: 1 },
      tank: { hp: 150, speed: 29, reward: 34, radius: 19, color: "#8a705c", damage: 2 },
    }[kind];
    const hp = Math.round(base.hp * (1 + (this.wave - 1) * 0.19));
    this.enemies.push({ kind, hp, maxHp: hp, speed: base.speed, reward: base.reward, radius: base.radius, color: base.color, damage: base.damage, distance: 0, x: PATH_POINTS[0][0], y: PATH_POINTS[0][1], age: 0, slow: 0 });
  }

  private hit(shot: Shot, target: Enemy): void {
    const cfg = TOWER_CONFIG[shot.kind]; const damage = cfg.damage * (1 + (shot.level - 1) * 0.55);
    if (cfg.splash) {
      for (const enemy of this.enemies) if (Math.hypot(enemy.x - target.x, enemy.y - target.y) <= cfg.splash) enemy.hp -= damage;
      this.burst(target.x, target.y, cfg.shotColor, 12);
    } else {
      target.hp -= damage; if (cfg.slow) target.slow = 1.35 + shot.level * 0.2;
      this.burst(target.x, target.y, cfg.shotColor, 4);
    }
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i]; if (enemy.hp > 0) continue;
      this.coins += enemy.reward; this.earned += enemy.reward; this.defeated += 1;
      this.burst(enemy.x, enemy.y, "#ffc34d", 10); this.enemies.splice(i, 1);
    }
  }

  private buildTower(spot: Spot): void {
    const cfg = TOWER_CONFIG[this.selectedKind];
    if (this.coins < cfg.cost) { this.showToast("阳光不够，消灭怪物来获取吧"); return; }
    this.coins -= cfg.cost;
    const tower: Tower = { x: spot.x, y: spot.y, kind: this.selectedKind, level: 1, cooldown: 0, angle: 0, spent: cfg.cost, spot };
    spot.tower = tower; this.towers.push(tower); this.burst(spot.x, spot.y, cfg.color, 12);
  }

  private upgradeSelected(): void {
    const tower = this.selectedTower; if (!tower || tower.level >= 3) return;
    const cost = this.upgradeCost(tower); if (this.coins < cost) { this.showToast("升级所需阳光不足"); return; }
    this.coins -= cost; tower.spent += cost; tower.level += 1; this.burst(tower.x, tower.y, "#ffc34d", 18);
  }

  private sellSelected(): void {
    const tower = this.selectedTower; if (!tower) return;
    this.coins += this.sellValue(tower); tower.spot.tower = null; this.towers.splice(this.towers.indexOf(tower), 1);
    this.selectedTower = null; this.showToast("防御塔已回收");
  }

  private upgradeCost(tower: Tower): number { return Math.round(TOWER_CONFIG[tower.kind].cost * (0.7 + tower.level * 0.35)); }
  private sellValue(tower: Tower): number { return Math.round(tower.spent * 0.7); }

  private onTouchEnd(event: EventTouch): void {
    const point = event.getUILocation();
    const local = this.node.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(point.x, point.y));
    this.handlePress(local.x + W / 2, H / 2 - local.y);
  }

  private handlePress(x: number, y: number): void {
    if (x < 0 || x > W || y < 0 || y > H) return;
    if (this.screen === "playing" && y < 70 && x > 335) { this.paused = !this.paused; return; }
    if (this.paused && this.screen === "playing") {
      if (x >= 91 && x <= 299 && y >= 355 && y <= 407) this.paused = false;
      return;
    }
    if (this.screen === "lose") {
      if (!this.revived && x >= 72 && x <= 318 && y >= 386 && y <= 438) void this.reviveWithAd();
      else if (!this.revived && x >= 72 && x <= 318 && y >= 474 && y <= 518) this.resetGame();
      return;
    }
    if (this.screen === "win") { if (x >= 72 && x <= 318 && y >= 394 && y <= 446) this.resetGame(); return; }

    if (y >= PANEL_Y) {
      if (this.selectedTower) {
        if (x >= 18 && x <= 187 && y >= 655) this.upgradeSelected();
        else if (x >= 203 && x <= 372 && y >= 655) this.sellSelected();
        else this.selectedTower = null;
        return;
      }
      if (x >= 310 && y >= 602) { this.startWave(); return; }
      const index = Math.floor((x - 12) / 98);
      if (index >= 0 && index < KINDS.length && x <= 12 + index * 98 + 88) this.selectedKind = KINDS[index];
      return;
    }

    const spot = this.spots.find((item) => Math.hypot(item.x - x, item.y - y) <= 29);
    if (spot?.tower) this.selectedTower = spot.tower;
    else if (spot) this.buildTower(spot);
    else this.selectedTower = null;
  }

  private async reviveWithAd(): Promise<void> {
    if (this.revived) return;
    this.showToast("正在请求广告…");
    const result = await PlatformService.showRewardedVideo(GAME_CONFIG.rewardAdUnitId);
    if (!result.rewarded && result.reason !== "missing-ad-unit") { this.showToast("广告未完整观看，暂未复活"); return; }
    this.revived = true; this.lives = 5; this.screen = "playing"; this.enemies = []; this.shots = []; this.queue = [];
    this.inWave = false; this.wave = Math.max(0, this.wave - 1);
    this.showToast(result.rewarded ? "复活成功！" : "暂无广告，已直接复活");
  }

  private showToast(value: string): void { this.toastText = value; this.toastTime = 2.3; }

  private burst(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2; const speed = 18 + Math.random() * 45;
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: 1.5 + Math.random() * 2.5, color, life: 0.35 + Math.random() * 0.35, maxLife: 0.7 });
    }
  }

  private pathPosition(distance: number): { x: number; y: number; done: boolean } {
    let remaining = distance;
    for (let i = 0; i < PATH_POINTS.length - 1; i += 1) {
      const a = PATH_POINTS[i]; const b = PATH_POINTS[i + 1]; const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (remaining <= length) { const t = remaining / length; return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, done: false }; }
      remaining -= length;
    }
    const end = PATH_POINTS[PATH_POINTS.length - 1]; return { x: end[0], y: end[1], done: true };
  }

  private computePathLength(): number {
    let total = 0;
    for (let i = 0; i < PATH_POINTS.length - 1; i += 1) total += Math.hypot(PATH_POINTS[i + 1][0] - PATH_POINTS[i][0], PATH_POINTS[i + 1][1] - PATH_POINTS[i][1]);
    return total;
  }
}
