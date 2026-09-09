export type MiningSound = 'grass' | 'stone' | 'break';

interface AudioSettings {
  volume: number;
  musicMuted: boolean;
  sfxMuted: boolean;
}

const AUDIO_SETTINGS_KEY = 'idlecraft-audio-v1';
const DEFAULT_SETTINGS: AudioSettings = { volume: 0.45, musicMuted: false, sfxMuted: false };
const SOUND_FILES: Record<MiningSound, readonly string[]> = {
  grass: ['assets/audio/sfx/grass1.ogg', 'assets/audio/sfx/grass2.ogg'],
  stone: ['assets/audio/sfx/stone1.ogg', 'assets/audio/sfx/stone2.ogg'],
  break: ['assets/audio/sfx/break.ogg'],
};

function readSettings(): AudioSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(AUDIO_SETTINGS_KEY) ?? '{}') as Partial<AudioSettings>;
    return {
      volume: Number.isFinite(parsed.volume) ? Math.min(1, Math.max(0, Number(parsed.volume))) : DEFAULT_SETTINGS.volume,
      musicMuted: parsed.musicMuted === true,
      sfxMuted: parsed.sfxMuted === true,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export class AudioManager {
  private readonly settings: AudioSettings = readSettings();
  private readonly music = new Audio(`${import.meta.env.BASE_URL}assets/audio/music/background-music.mp3`);
  private musicStarted = false;

  constructor() {
    this.music.loop = true;
    this.music.preload = 'auto';
    this.applyMusicSettings();
  }

  getSettings(): Readonly<AudioSettings> {
    return this.settings;
  }

  startMusic(): void {
    if (this.settings.musicMuted || this.musicStarted) return;
    this.musicStarted = true;
    void this.music.play().catch(() => {
      this.musicStarted = false;
    });
  }

  toggleMusic(): void {
    this.settings.musicMuted = !this.settings.musicMuted;
    this.applyMusicSettings();
    this.saveSettings();
  }

  toggleSfx(): void {
    this.settings.sfxMuted = !this.settings.sfxMuted;
    this.saveSettings();
  }

  setVolume(value: number): void {
    this.settings.volume = Math.min(1, Math.max(0, value));
    this.applyMusicSettings();
    this.saveSettings();
  }

  playMiningSound(kind: MiningSound): void {
    this.startMusic();
    if (this.settings.sfxMuted) return;
    const files = SOUND_FILES[kind];
    const file = files[Math.floor(Math.random() * files.length)];
    const sound = new Audio(`${import.meta.env.BASE_URL}${file}`);
    sound.volume = this.settings.volume;
    void sound.play().catch(() => undefined);
  }

  private applyMusicSettings(): void {
    this.music.volume = this.settings.volume * 0.35;
    if (this.settings.musicMuted) {
      this.music.pause();
    } else if (this.musicStarted) {
      void this.music.play().catch(() => undefined);
    }
  }

  private saveSettings(): void {
    localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(this.settings));
  }
}
