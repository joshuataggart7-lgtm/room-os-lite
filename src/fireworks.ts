/** Canvas fireworks for home runs, touchdowns and wins. Runs only while bursts are in the air. */
interface P { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; s: number }
export class Fireworks {
  canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private ps: P[] = [];
  private raf = 0;
  private until = 0;
  private nextBurst = 0;
  constructor(private colors: string[]) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "fw";
    this.ctx = this.canvas.getContext("2d");
  }
  show(secs: number) {
    this.until = Math.max(this.until, performance.now() + secs * 1000);
    this.nextBurst = 0;
    if (!this.raf) this.loop();
  }
  private size() {
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const w = Math.floor(this.canvas.clientWidth * dpr), h = Math.floor(this.canvas.clientHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    return { w, h };
  }
  private burst(w: number, h: number) {
    const x = w * (0.15 + Math.random() * 0.7), y = h * (0.12 + Math.random() * 0.35);
    const c = this.colors[Math.floor(Math.random() * this.colors.length)];
    const n = 70 + Math.floor(Math.random() * 50), sp = (2 + Math.random() * 2.5) * (w / 1400);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, v = sp * (0.6 + Math.random() * 0.5);
      this.ps.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 60 + Math.random() * 40, c: Math.random() < 0.2 ? "#ffffff" : c, s: 1.6 + Math.random() * 1.6 });
    }
  }
  private loop = () => {
    const ctx = this.ctx; if (!ctx) return;
    const { w, h } = this.size();
    const now = performance.now();
    if (now < this.until && now > this.nextBurst) { this.burst(w, h); if (Math.random() < 0.4) this.burst(w, h); this.nextBurst = now + 350 + Math.random() * 650; }
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    const dpr = w / Math.max(1, this.canvas.clientWidth);
    for (const p of this.ps) {
      p.life++; p.vy += 0.035 * dpr; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy;
      const a = Math.max(0, 1 - p.life / p.max);
      ctx.globalAlpha = a; ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s * dpr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    this.ps = this.ps.filter((p) => p.life < p.max);
    if (this.ps.length || now < this.until) this.raf = requestAnimationFrame(this.loop);
    else { this.raf = 0; ctx.clearRect(0, 0, w, h); }
  };
}
