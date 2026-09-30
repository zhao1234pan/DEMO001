import { rows, globalNumber } from "../config/ConfigTables";
import { AudioClip, AudioSource, Node, resources } from "cc";
import { PlatformService } from "./PlatformService";

export type SoundKey = "build" | "upgrade" | "sprout" | "frost" | "bloom"
  | "defeat" | "leak" | "wave" | "win" | "lose" | "prop";

function soundPath(key:string):string { return rows("Audio").find(row=>row.key===key)!.path; }
const MUSIC_PREFERENCE = "night_store_music_enabled";
const EFFECTS_PREFERENCE = "night_store_effects_enabled";


function minInterval(key:string):number { return Number(rows("Audio").find(row=>row.key===key)?.minIntervalMs ?? 0); }
interface EffectVoice { source: AudioSource; startedAt: number; busyUntil: number; }

/** 音乐和音效独立控制；加载失败不阻断界面，未取得玩家手势前不自动播放。 */
export class AudioService {
  private readonly audioNode: Node;
  private readonly musicSource: AudioSource;
  private readonly voices: EffectVoice[] = [];
  private readonly clips = new Map<SoundKey, AudioClip>();
  private readonly lastPlayedAt = new Map<SoundKey, number>();
  private musicClip: AudioClip | null = null;
  private musicOn: boolean;
  private effectsOn: boolean;
  private unlocked = false;
  private suspended = false;
  private musicRequested = false;
  private musicPosition = 0;
  private disposed = false;

  constructor(parent: Node, private readonly persistPreferences = true) {
    this.musicOn = !persistPreferences || PlatformService.getNumber(MUSIC_PREFERENCE, 1) !== 0;
    this.effectsOn = !persistPreferences || PlatformService.getNumber(EFFECTS_PREFERENCE, 1) !== 0;
    this.audioNode = new Node("GameAudio");
    parent.addChild(this.audioNode);
    this.musicSource = this.createSource("NightShiftMusic");
    this.musicSource.loop = true;
    this.musicSource.volume = globalNumber("musicVolume");
    this.preload();
  }

  get musicEnabled(): boolean { return this.musicOn; }
  get effectsEnabled(): boolean { return this.effectsOn; }

  setMusicEnabled(enabled: boolean): void {
    if (this.disposed) return;
    this.musicOn = enabled;
    if (this.persistPreferences) PlatformService.setNumber(MUSIC_PREFERENCE, enabled ? 1 : 0);
    this.syncMusic();
  }

  setEffectsEnabled(enabled: boolean): void {
    if (this.disposed) return;
    this.effectsOn = enabled;
    if (this.persistPreferences) PlatformService.setNumber(EFFECTS_PREFERENCE, enabled ? 1 : 0);
    if (!enabled) this.stopEffects();
  }

  unlock(): void {
    if (this.disposed) return;
    this.unlocked = true;
    this.syncMusic();
  }

  setSuspended(suspended: boolean): void {
    if (this.disposed || suspended === this.suspended) return;
    this.suspended = suspended;
    if (suspended) this.stopEffects();
    this.syncMusic();
  }

  play(key: SoundKey, volumeScale = 1): void {
    const clip = this.clips.get(key);
    if (!clip || this.disposed || !this.unlocked || !this.effectsOn || this.suspended
      || !Number.isFinite(volumeScale) || volumeScale <= 0) return;
    const now = Date.now();
    const lastPlayed = this.lastPlayedAt.get(key);
    if (lastPlayed !== undefined && now - lastPlayed < minInterval(key)) return;
    const voice = this.acquireVoice(now);
    // 不使用无法停止的 playOneShot；切开关和切后台时可立即清空所有在途声音。
    voice.source.stop(); voice.source.clip = null;
    voice.source.clip = clip;
    voice.source.volume = 0.72 * Math.min(1, volumeScale);
    voice.startedAt = now;
    // AudioSource 解码未结束时 playing 仍为 false，先保留通道，避免同帧反复抢占。
    const duration = clip.getDuration();
    voice.busyUntil = now + (Number.isFinite(duration) && duration > 0 ? duration : 0.5) * 1000 + 60;
    voice.source.play();
    this.lastPlayedAt.set(key, now);
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopEffects();
    this.haltMusic();
    this.voices.length = 0;
    this.audioNode.destroy();
    for (const clip of this.clips.values()) clip.decRef();
    this.clips.clear();
    this.musicClip?.decRef(); this.musicClip = null;
    this.lastPlayedAt.clear();
  }

  private createSource(name: string): AudioSource {
    const node = new Node(name);
    this.audioNode.addChild(node);
    const source = node.addComponent(AudioSource);
    source.playOnAwake = false;
    return source;
  }

  private acquireVoice(now: number): EffectVoice {
    const available = this.voices.find((voice) => now >= voice.busyUntil && !voice.source.playing);
    if (available) return available;
    if (this.voices.length < globalNumber("maxEffectSources")) {
      const voice = { source: this.createSource(`Effect${this.voices.length + 1}`), startedAt: 0, busyUntil: 0 };
      this.voices.push(voice);
      return voice;
    }
    return this.voices.reduce((oldest, voice) => voice.startedAt < oldest.startedAt ? voice : oldest);
  }

  private stopEffects(): void {
    for (const voice of this.voices) {
      voice.source.stop();
      // 清空 clip 同时撤销仍在异步解码的播放，防止关闭后旧回调突然出声。
      voice.source.clip = null;
      voice.busyUntil = 0;
    }
    this.lastPlayedAt.clear();
  }

  private syncMusic(): void {
    if (this.disposed || !this.musicOn || !this.unlocked || this.suspended || !this.musicClip) {
      this.haltMusic(); return;
    }
    if (this.musicRequested) return;
    this.musicSource.clip = this.musicClip;
    this.musicSource.currentTime = this.musicPosition;
    this.musicRequested = true;
    this.musicSource.play();
  }

  private haltMusic(): void {
    if (!this.musicSource.clip) return;
    const position = this.musicSource.currentTime;
    if (Number.isFinite(position) && position >= 0) this.musicPosition = position;
    this.musicSource.stop();
    this.musicSource.clip = null;
    this.musicRequested = false;
  }

  private preload(): void {
    (rows("Audio").filter(row=>row.key!=="bgm").map(row=>row.key) as SoundKey[]).forEach((key) => this.loadClip(soundPath(key), (clip) => {
      this.clips.set(key, clip);
    }));
    this.loadClip(soundPath("bgm"), (clip) => { this.musicClip = clip; this.syncMusic(); });
  }

  private loadClip(path: string, accept: (clip: AudioClip) => void): void {
    let settled = false;
    try {
      resources.load(path, AudioClip, (error, clip) => {
        if (settled) return;
        settled = true;
        if (error || !clip || this.disposed) return;
        clip.addRef();
        accept(clip);
      });
    } catch {
      // 资源不可用时保持静音，不让音频故障影响进入关卡或设置开关。
      settled = true;
    }
  }
}
