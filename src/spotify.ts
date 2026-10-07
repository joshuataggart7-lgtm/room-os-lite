/**
 * Real songs through Spotify's iFrame Embed API (no client id, no server). Full tracks play when this browser is
 * logged in to Spotify; otherwise Spotify plays a 30 second preview. Every URI here was checked on open.spotify.com.
 */
import { h } from "./dom";

export interface Track { uri: string; title: string; artist: string; start?: number; secs?: number }
export const TRACKS = {
  blind: { uri: "spotify:track:0esdrDhHyPjglg5AmXfJDV", title: "Blind", artist: "Korn", secs: 45 },
  smallThings: { uri: "spotify:track:2m1hi0nfMR9vdGC8UcrnwU", title: "All The Small Things", artist: "blink-182", secs: 60 },
  takeMeOut: { uri: "spotify:track:3t3eSj2tOz6arwcUHyrINs", title: "Take Me Out To the Ball Game (Gameday Version)", artist: "Instrumental All Stars", secs: 44 },
  hellsBells: { uri: "spotify:track:1LsiaD8GLyIuXtqeEPO5sg", title: "Hells Bells", artist: "AC/DC", secs: 80 },
  sevenNation: { uri: "spotify:track:3ctoHckjyd13eBi2IDw2Ip", title: "Seven Nation Army", artist: "The White Stripes", secs: 30 },
  hailState: { uri: "spotify:track:1xGF9BghGH71DUXVLV00ms", title: "MSU 2K Hail State", artist: "Mississippi State University Famous Maroon Band", secs: 55 },
  goState: { uri: "spotify:track:3uQyUElOQBj8aZ1KoQgusc", title: "Go State / Hail State", artist: "Mississippi State University Bands", secs: 46 },
  halftime: { uri: "spotify:track:4KbbwwMatxWQOM10ipj1bT", title: "Halftime (Stand Up and Get Crunk!)", artist: "Ying Yang Twins, Homebwoi", secs: 40 },
} satisfies Record<string, Track>;
export const openUrl = (t: Track) => `https://open.spotify.com/track/${t.uri.split(":").pop()}`;
export const LOGIN_URL = "https://accounts.spotify.com/login?continue=https%3A%2F%2Fopen.spotify.com%2F";

declare global { interface Window { onSpotifyIframeApiReady?: (api: any) => void } }

export class Music {
  enabled = localStorage.getItem("lite.music") !== "off";
  connected = localStorage.getItem("lite.spotify") === "yes";
  el = h("div.music.hidden");
  playing = false;
  now: Track | null = null;
  onDuck: (on: boolean) => void = () => {};
  onChange: () => void = () => {};
  private ctl: any = null;
  private loaded = false;
  private wantPlay = false;
  private ready: Promise<any> | null = null;
  private host = h("div.music-embed");
  private label = h("div.music-label");
  private stopT = 0;

  constructor() {
    this.el.append(h("div.music-head", {}, h("span.music-tag", {}, "Spotify"), this.label, h("button.music-x", { onclick: () => this.stop(), "aria-label": "Stop music" }, "×")), this.host,
      h("div.music-foot", {}, h("a.music-open", { href: "#", target: "_blank", rel: "noopener" }, "Open in Spotify")));
  }

  private api(): Promise<any> {
    if (this.ready) return this.ready;
    this.ready = new Promise((res) => {
      window.onSpotifyIframeApiReady = (api) => {
        const box = h("div");
        this.host.replaceChildren(box);
        api.createController(box, { width: "100%", height: 80, uri: TRACKS.hellsBells.uri }, (c: any) => {
          this.ctl = c;
          c.addListener("ready", () => { this.loaded = true; if (this.wantPlay) { this.wantPlay = false; try { c.play(); } catch { /* */ } } });
          c.addListener("playback_update", (e: any) => {
            const on = !!e?.data && !e.data.isPaused && !e.data.isBuffering;
            if (on !== this.playing) { this.playing = on; this.onDuck(on); this.onChange(); }
          });
          res(c);
        });
      };
      const s = document.createElement("script");
      s.src = "https://open.spotify.com/embed/iframe-api/v1"; s.async = true;
      s.onerror = () => res(null);
      document.head.append(s);
    });
    return this.ready;
  }

  /** Warm the embed up early so a moment can start a song quickly. */
  prepare() { if (this.enabled) void this.api(); }

  async play(t: Track, secs = t.secs ?? 40) {
    if (!this.enabled) return;
    this.now = t;
    this.label.textContent = `${t.title} · ${t.artist}`;
    (this.el.querySelector(".music-open") as HTMLAnchorElement).href = openUrl(t);
    this.el.classList.remove("hidden");
    this.onChange();
    const c = await this.api();
    if (!c) return;
    // play() before the embed has a track loaded throws inside Spotify's iframe, so wait for its "ready" event.
    this.loaded = false; this.wantPlay = true;
    try { c.loadUri(t.uri, false, t.start ?? 0); } catch { /* the card still has a play button */ }
    clearTimeout(this.stopT);
    this.stopT = window.setTimeout(() => this.stop(), secs * 1000);
  }

  stop() {
    clearTimeout(this.stopT);
    this.wantPlay = false;
    if (this.loaded && this.playing) try { this.ctl?.pause(); } catch { /* */ }
    this.el.classList.add("hidden");
    if (this.playing) { this.playing = false; this.onDuck(false); }
    this.now = null;
    this.onChange();
  }

  setEnabled(on: boolean) { this.enabled = on; localStorage.setItem("lite.music", on ? "on" : "off"); if (!on) this.stop(); this.onChange(); }
  markConnected() { this.connected = true; localStorage.setItem("lite.spotify", "yes"); this.onChange(); }
}
