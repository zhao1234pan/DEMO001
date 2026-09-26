import { AudioClip, AudioSource, Node, resources } from "cc";

export type SoundKey = "build" | "upgrade" | "sprout" | "frost" | "bloom"
  | "defeat" | "leak" | "wave" | "win" | "lose" | "prop";

const SOUND_PATHS: Record<SoundKey, string> = {
  build: "audio/sfx/sfx_ui_build",
  upgrade: "audio/sfx/sfx_ui_upgrade",
  sprout: "audio/sfx/sfx_battle_sprout",
  frost: "audio/sfx/sfx_battle_frost",
  bloom: "audio/sfx/sfx_battle_bloom",
  defeat: "audio/sfx/sfx_battle_defeat",
  leak: "audio/sfx/sfx_battle_leak",
  wave: "audio/sfx/sfx_system_wave",
  win: "audio/sfx/sfx_system_win",
  lose: "audio/sfx/sfx_system_lose",
  prop: "audio/sfx/sfx_battle_prop",
};

const MIN_INTERVAL_MS: Partial<Record<SoundKey, number>> = {
  sprout: 80,
  frost: 120,
  bloom: 160,
  defeat: 90,
  leak: 160,
};

/**
 * 战斗音频统一经过此服务播放，业务代码不依赖浏览器或抖音的原生音频接口。
 * 音频采用异步预载；资源尚未就绪或加载失败时直接跳过，不阻塞战斗流程。
 */
export class AudioService {
  private readonly audioNode: Node;
  private readonly source: AudioSource;
  private readonly clips = new Map<SoundKey, AudioClip>();
  private readonly lastPlayedAt = new Map<SoundKey, number>();
  private disposed = false;

  constructor(parent: Node) {
    this.audioNode = new Node("BattleAudio");
    parent.addChild(this.audioNode);
    this.source = this.audioNode.addComponent(AudioSource);
    this.source.playOnAwake = false;
    this.source.volume = 0.72;
    this.preload();
  }

  play(key: SoundKey, volumeScale = 1): void {
    const clip = this.clips.get(key);
    if (!clip || this.disposed) return;
    const now = Date.now();
    const minimumInterval = MIN_INTERVAL_MS[key] ?? 0;
    if (now - (this.lastPlayedAt.get(key) ?? 0) < minimumInterval) return;
    this.lastPlayedAt.set(key, now);
    this.source.playOneShot(clip, volumeScale);
  }

  destroy(): void {
    this.disposed = true;
    this.clips.clear();
    this.audioNode.destroy();
  }

  private preload(): void {
    (Object.keys(SOUND_PATHS) as SoundKey[]).forEach((key) => {
      resources.load(SOUND_PATHS[key], AudioClip, (error, clip) => {
        if (error || this.disposed) return;
        this.clips.set(key, clip);
      });
    });
  }
}
