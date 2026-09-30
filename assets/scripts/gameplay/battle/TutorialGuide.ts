import { numeric, rows, TableRow } from "../../config/ConfigTables";
import { PlatformService } from "../../services/PlatformService";

export type TutorialAction = "deploy" | "upgrade" | "combo" | "area" | "clear";
/** 引导只观察已发生的操作，不拦截输入、不控制战斗结果；记录与正式关卡进度分开。 */
export class TutorialGuide {
  private steps: TableRow[] = [];
  private readonly completed = new Set<string>();

  reset(levelId: number, enabled: boolean): void {
    this.steps = enabled ? rows("Tutorial").filter(row => numeric(row, "levelId") === levelId).sort((a, b) => numeric(a, "order") - numeric(b, "order")) : [];
    this.completed.clear();
    for (const row of this.steps) if (PlatformService.getNumber(this.storageKey(row), 0) === 1) this.completed.add(row.id);
  }
  get current(): TableRow | null { return this.steps.find(row => !this.completed.has(row.id)) ?? null; }
  get firstWaveDelay(): number | null { return this.current ? numeric(this.current, "firstWaveDelay") : null; }

  record(action: TutorialAction, kind = "", value = 1, partners: readonly string[] = []): void {
    // 玩家先做后面的动作也记为完成，不要求按脚本指定的顺序游玩。
    for (const row of this.steps) {
      if (this.completed.has(row.id) || row.action !== action || (action !== "clear" && row.staffKind !== kind)
        || value < numeric(row, "requiredValue") || (row.partnerKind && !partners.includes(row.partnerKind))) continue;
      this.completed.add(row.id); PlatformService.setMaximumInteger(this.storageKey(row), 1, 1);
    }
  }
  private storageKey(row: TableRow): string { return "night_store_tutorial_" + row.id; }
}
