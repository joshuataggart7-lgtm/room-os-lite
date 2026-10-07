/**
 * Web Audio engine: one looping crowd bed, one-shot effects and announcer lines that duck the bed.
 * Browsers only allow sound after a tap, so unlock() runs from the Tap to start button.
 */
const base = import.meta.env.BASE_URL;
type Ctx = AudioContext;

export class Audio {
  ctx: Ctx | null = null;
  private master!: GainNode;
  private bedGain!: GainNode;
  private bedSrc: AudioBufferSourceNode | null = null;
  private bedName = "";
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private ducks = 0;
  volume = 0.8;
  bedLevel = 0.55;

  unlock(): boolean {
    if (!this.ctx) {
      const C = window.AudioContext || (window as any).webkitAudioContext;
      if (!C) return false;
      this.ctx = new C();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      this.bedGain = this.ctx.createGain();
      this.bedGain.gain.value = 0;
      this.bedGain.connect(this.master);
      // A silent blip in the same tap wakes iOS audio.
      const b = this.ctx.createBuffer(1, 1, 22050), s = this.ctx.createBufferSource();
      s.buffer = b; s.connect(this.master); s.start(0);
    }
    void this.ctx.resume();
    return true;
  }

  get ready() { return !!this.ctx && this.ctx.state === "running"; }

  load(name: string): Promise<AudioBuffer | null> {
    let p = this.buffers.get(name);
    if (!p) {
      p = fetch(`${base}sounds/${name}.mp3`).then((r) => r.arrayBuffer())
        .then((ab) => new Promise<AudioBuffer>((res, rej) => this.ctx!.decodeAudioData(ab, res, rej)))
        .catch(() => null);
      this.buffers.set(name, p);
    }
    return p;
  }

  preload(names: string[]) { if (this.ctx) names.forEach((n) => void this.load(n)); }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.ctx) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
  }

  async bed(name: string) {
    if (!this.ctx || name === this.bedName) return;
    this.bedName = name;
    const buf = await this.load(name);
    if (!buf || this.bedName !== name || !this.ctx) return;
    const now = this.ctx.currentTime;
    const old = this.bedSrc;
    if (old) { this.bedGain.gain.setTargetAtTime(0, now, 0.4); setTimeout(() => { try { old.stop(); } catch { /* */ } }, 1500); }
    const s = this.ctx.createBufferSource();
    s.buffer = buf; s.loop = true; s.connect(this.bedGain); s.start(old ? now + 1.2 : now);
    this.bedSrc = s;
    this.bedGain.gain.setTargetAtTime(this.ducks ? this.bedLevel * 0.35 : this.bedLevel, old ? now + 1.2 : now, 0.8);
  }

  /** Plays a sound now or after `at` seconds. duck lowers the bed while it plays (announcer lines). Resolves when it ends. */
  async play(name: string, o: { gain?: number; at?: number; duck?: boolean; pan?: number } = {}): Promise<void> {
    if (!this.ctx) return;
    const buf = await this.load(name);
    if (!buf || !this.ctx) return;
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = o.gain ?? 1;
    let node: AudioNode = g;
    if (o.pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = o.pan; g.connect(p); node = p; }
    s.connect(g); node.connect(this.master);
    const start = ctx.currentTime + (o.at ?? 0);
    s.start(start);
    if (o.duck) {
      setTimeout(() => this.duck(true), (o.at ?? 0) * 1000);
      s.onended = () => this.duck(false);
    }
    return new Promise((res) => { const t = setTimeout(res, ((o.at ?? 0) + buf.duration) * 1000 + 50); s.addEventListener("ended", () => { clearTimeout(t); res(); }); });
  }

  private duck(on: boolean) {
    if (!this.ctx) return;
    this.ducks = Math.max(0, this.ducks + (on ? 1 : -1));
    this.bedGain.gain.setTargetAtTime(this.ducks ? this.bedLevel * 0.35 : this.bedLevel, this.ctx.currentTime, 0.25);
  }
}
