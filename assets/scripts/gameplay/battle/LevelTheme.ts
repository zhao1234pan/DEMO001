import { rows, numeric, text, globalNumber, globalString, onConfigsReady } from "../../config/ConfigTables";
import type { LevelConfig } from "./LevelConfig";
export interface MapTheme { name:string; ground:string;road:string;edge:string;surface:string;mark:string;tile:string;seam:string; }
export const MAP_THEMES = {} as Record<NonNullable<LevelConfig["theme"]>,MapTheme>;
onConfigsReady(()=>{ for(const row of rows("Theme")) MAP_THEMES[row.key as keyof typeof MAP_THEMES] = {...row,name:text(row.name)} as unknown as MapTheme; });
export function levelTheme(level:LevelConfig):MapTheme { return MAP_THEMES[level.theme ?? "courtyard"]; }
