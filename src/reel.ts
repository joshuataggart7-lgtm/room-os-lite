/**
 * The footage reel from Room OS (packages/web/src/stands/Footage.tsx), without React: real licensed clips
 * and photos crossfading on two layers. Stills get the slow Ken Burns move, plus live haze, light flicker
 * and camera flashes in the crowd. A grade, team tint, vignette and film grain tie the sources together.
 */
import { h } from "./dom";
import footage from "./footage.json";

export interface Item { src: string; secs?: number; focus?: string; kb?: string; grade?: string; rate?: number; fx?: string[]; crowd?: number[][] }
type Sets = Record<string, Record<string, Item[]>>;
const SETS = (footage as unknown as { sets: Sets }).sets;
const G = (footage as any).grade as { contrast: number; saturate: number; brightness: number; tint: number; vignette: number; grain: number; crossfade: number };
const base = import.meta.env.BASE_URL;
const isVideo = (s: string) => /\.mp4$/i.test(s);

export function playlist(set: string, scene: string): Item[] {
  const s = SETS[set] ?? SETS.mlb;
  if (scene === "tailgate") return [...(s.tailgate ?? []), ...(s.arrival ?? [])].filter((x, i, a) => a.findIndex((y) => y.src === x.src) === i);
  if (scene === "morning" || scene === "drive") return s[scene] ?? s.arrival ?? s.tailgate;
  return s[scene]?.length ? s[scene] : s.game;
}
export const allMedia = (set: string) => [...new Set(Object.values(SETS[set] ?? {}).flat().map((i) => i.src))];

let grainUrl = "";
function grain(): string {
  if (grainUrl) return grainUrl;
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d"); if (!x) return "";
  const img = x.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  x.putImageData(img, 0, 0);
  return (grainUrl = c.toDataURL("image/png"));
}

function shimmer(areas: number[][], seed: number): HTMLElement {
  let x = seed * 9301 + 49297;
  const r = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  const total = areas.reduce((n, a) => n + a[2] * a[3], 0) || 1;
  const box = h("div.ft-shimmer");
  for (const a of areas) for (let k = 0, n = Math.max(4, Math.round((48 * a[2] * a[3]) / total)); k < n; k++) {
    const size = 2 + r() * 3;
    box.append(h("span", { style: { left: `${a[0] + r() * a[2]}%`, top: `${a[1] + r() * a[3]}%`, width: `${size}px`, height: `${size}px`, animationDuration: `${3 + r() * 6}s`, animationDelay: `${-r() * 9}s` } }));
  }
  return box;
}

export class Reel {
  el: HTMLElement;
  private layers: HTMLElement[];
  private shown = 0;
  private items: Item[] = [];
  private idx = 0;
  private timer = 0;
  private saved: Item[] | null = null;
  private restoreTimer = 0;
  private xf = G.crossfade;
  private filter = `contrast(${G.contrast}) saturate(${G.saturate}) brightness(${G.brightness})`;

  constructor(tint: string) {
    this.layers = [h("div.footage-layer"), h("div.footage-layer")];
    this.layers.forEach((l) => { l.style.transition = `opacity ${this.xf}s ease-in-out`; l.style.opacity = "0"; });
    this.el = h("div.footage", {}, ...this.layers,
      h("div.footage-tint", { style: { background: tint, opacity: String(G.tint) } }),
      h("div.footage-vignette", { style: { opacity: String(G.vignette) } }),
      h("div.footage-grain", { style: { backgroundImage: `url(${grain()})`, opacity: String(G.grain) } }));
  }

  set(items: Item[]) {
    if (!items.length) return;
    if (this.saved) { this.saved = items; return; }
    if (items.map((i) => i.src).join() === this.items.map((i) => i.src).join()) return;
    this.items = items; this.idx = 0; this.show(items[0]);
  }

  /** Celebration: switch to these for `secs`, then go back to the scene's list. */
  celebrate(items: Item[], secs: number) {
    if (!items.length) return;
    if (!this.saved) this.saved = this.items;
    this.items = items; this.idx = 0; this.show(items[0]);
    clearTimeout(this.restoreTimer);
    this.restoreTimer = window.setTimeout(() => { const s = this.saved!; this.saved = null; this.items = []; this.set(s); }, secs * 1000);
  }

  private show(it: Item) {
    clearTimeout(this.timer);
    const next = 1 - this.shown;
    const layer = this.layers[next];
    layer.innerHTML = "";
    const media: Partial<CSSStyleDeclaration> = { objectPosition: it.focus ?? "50% 50%", filter: it.grade ? `${this.filter} ${it.grade}` : this.filter };
    let ready: Promise<void>;
    if (isVideo(it.src)) {
      const v = h("video", { muted: true, playsinline: true, loop: true, preload: "auto", src: `${base}media/${it.src}` }) as HTMLVideoElement;
      v.muted = true; (v as any).playsInline = true; Object.assign(v.style, media);
      layer.append(v);
      ready = new Promise((res) => { v.addEventListener("loadeddata", () => res(), { once: true }); setTimeout(res, 4000); });
      ready.then(() => { v.playbackRate = it.rate ?? 1; void v.play().catch(() => undefined); });
      ready.then(() => this.arm(it.secs ?? (Number.isFinite(v.duration) && v.duration > 1 ? Math.max(10, v.duration / (it.rate ?? 1)) : 12)));
    } else {
      const img = h("img", { alt: "", src: `${base}media/${it.src}` }) as HTMLImageElement;
      Object.assign(img.style, media);
      const kb = h(`div.kb.kb-${it.kb ?? "in"}`, { style: { animationDuration: `${(it.secs ?? 14) + this.xf * 2}s` } }, img,
        it.fx?.includes("shimmer") ? shimmer(it.crowd ?? [[0, 45, 100, 35]], it.src.length * 31 + next) : null);
      layer.append(kb);
      ready = new Promise((res) => { if (img.complete) res(); img.onload = () => res(); img.onerror = () => res(); setTimeout(res, 4000); });
      ready.then(() => this.arm(it.secs ?? 14));
    }
    if (it.fx?.includes("haze")) layer.append(h("div.ft-haze"));
    if (it.fx?.includes("flicker")) layer.append(h("div.ft-flicker"));
    ready.then(() => {
      layer.style.opacity = "1"; layer.style.zIndex = "2";
      const old = this.layers[this.shown];
      old.style.opacity = "0"; old.style.zIndex = "1";
      this.shown = next;
      setTimeout(() => { if (this.layers[this.shown] !== old) { old.querySelector("video")?.pause(); } }, this.xf * 1000 + 300);
      // Warm the cache for the next still.
      const n = this.items[(this.idx + 1) % this.items.length];
      if (n && !isVideo(n.src)) { const pre = new Image(); pre.src = `${base}media/${n.src}`; }
    });
  }

  private arm(secs: number) {
    clearTimeout(this.timer);
    if (this.items.length < 2) return;
    this.timer = window.setTimeout(() => { this.idx = (this.idx + 1) % this.items.length; this.show(this.items[this.idx]); }, Math.max(3, secs - this.xf) * 1000);
  }
}
