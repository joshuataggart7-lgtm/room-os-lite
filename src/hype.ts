/**
 * The hype video. For tonight's Padres game it's a 64 second underdog trailer (src/trailer.json): bold comic panels,
 * punches, shakes and flashes synced to a pre-mixed ElevenLabs narration with drums, booms and crowd.
 * It only runs while ESPN still shows that exact series state; otherwise a data-driven cut of the same baseball
 * panels plays. Music comes from Spotify when it's on.
 */
import trailer from "./trailer.json";
import { h } from "./dom";
import type { Snapshot } from "./espn";
import { seriesFlag } from "./espn";
import type { Team } from "./teams";

const base = import.meta.env.BASE_URL;
type Fx = { fx?: string; flash?: boolean; shake?: boolean; dim?: boolean };
type Step = ({ shot: string; secs: number } | { card: string; kicker?: string; secs: number; hot?: boolean }) & Fx;
export interface HypeAudio { at: number; s: string; gain?: number; duck?: boolean; direct?: boolean }

// Baseball-only comic panels (scripts/comic-panels.py; AI illustrations can replace them at the same names).
const PADRES_SHOTS = ["hype/ill_ballpark.jpg", "hype/ill_crowd.jpg", "hype/ill_batter.jpg", "hype/ill_pitcher.jpg", "hype/ill_homer.jpg", "hype/ill_scoreboard.jpg", "hype/ill_skyline.jpg", "hype/ill_whistle.jpg"];
const MSU_SHOTS = ["hsv_skyline.jpg", "road_i22_ms25.jpg", "road_starkville_sign.jpg", "msu_daviswade_pd.jpg", "msu_exterior_2024.jpg", "msu_expansion.jpg", "msu_game_2024.jpg", "msu_eggbowl_2009.jpg", "msu_halftime_2009.jpg", "v_stadium_crowd_night.mp4", "v_crowd_stands.mp4", "v_fireworks_crowd.mp4"];

const fmt = (iso: string) => new Date(iso).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit", timeZoneName: "short" });

/** The trailer's narration states real results, so it only plays while ESPN still shows that series state. */
function trailerFits(team: Team, s: Snapshot | null) {
  return team.set === "padres" && !!s && s.state !== "post" && s.them.abbr === "MIL" && s.series?.note === "NLDS - Game 4" && s.series?.summary === "MIL leads series 2-1";
}
export function hypePlan(team: Team, s: Snapshot | null): { steps: Step[]; audio: HypeAudio[]; trailer?: boolean } | null {
  const P = team.set === "padres", M = team.set === "msu";
  if (!P && !M) return null;
  if (trailerFits(team, s)) {
    const shots = trailer.shots as ({ t: number; img: string } & Fx)[];
    const steps: Step[] = shots.map((x, i) => {
      const secs = (shots[i + 1]?.t ?? trailer.total) - x.t;
      const fx = { fx: x.fx, flash: x.flash, shake: x.shake, dim: x.dim };
      return x.img === "tonight" ? { card: `SD vs ${s!.them.abbr}`, kicker: `${fmt(s!.date)}  ·  Game 4`, secs, hot: true, ...fx } : { shot: `hype/${x.img}.jpg`, secs, ...fx };
    });
    return { steps, audio: [{ at: 0, s: "hype_sd_trailer", direct: true }], trailer: true };
  }
  const shots = P ? PADRES_SHOTS : MSU_SHOTS;
  const flag = seriesFlag(s?.series);
  const cards: Step[] = [];
  cards.push({ card: P ? "PADRES BASEBALL" : "GAME DAY IN STARKVILLE", kicker: P ? "Petco Park" : "Davis Wade Stadium", secs: 3 });
  if (s?.series?.note) cards.push({ card: s.series.note.toUpperCase(), kicker: "Postseason", secs: 2.6 });
  if (s?.series?.summary) cards.push({ card: s.series.summary.toUpperCase(), kicker: "The series", secs: 2.6 });
  if (flag === "elim" || flag === "decider") cards.push({ card: "WIN OR GO HOME", kicker: flag === "decider" ? "Winner take all" : `Game ${s!.series!.usWins + s!.series!.themWins + 1}`, secs: 3.2, hot: true });
  if (s && s.state !== "post") cards.push({ card: `${team.abbr} vs ${s.them.abbr}`, kicker: s.state === "pre" ? fmt(s.date) : s.detail, secs: 2.6 });
  cards.push({ card: P ? "LET'S GO PADRES" : "RING YOUR COWBELLS", kicker: P ? "Brown and gold" : "Hail State", secs: 4, hot: true });
  // Interleave: an opening run of cuts, then a card every few shots, faster cuts toward the end.
  const steps: Step[] = [{ card: P ? "SAN DIEGO" : "MAROON AND WHITE", kicker: "Room OS presents", secs: 3.5 }];
  let si = 0, ci = 0;
  const shot = (secs: number) => steps.push({ shot: shots[si++ % shots.length], secs });
  for (let i = 0; i < 6; i++) shot(3.4);
  while (ci < cards.length - 1) { steps.push(cards[ci++]); shot(2.6); shot(2.2); shot(2.0); }
  for (let i = 0; i < 6; i++) shot(1.4);
  steps.push(cards[cards.length - 1]);
  const total = steps.reduce((a, x) => a + x.secs, 0);
  const audio: HypeAudio[] = [
    { at: 0, s: "sfx_crowd_rise", gain: 0.6 },
    { at: 1.2, s: P ? "pa_sd_hype_intro" : "pa_msu_hype_intro", duck: true },
    { at: total * 0.45, s: P ? "sfx_crowd_hr" : "sfx_crowd_td", gain: 0.7 },
    ...(flag === "elim" || flag === "decider" ? [{ at: total * 0.62, s: P ? "pa_sd_win_or_go_home" : "pa_make_noise", duck: true }] : []),
    { at: total - 7, s: P ? "chant_lets_go_padres" : "chant_hail_state", gain: 0.9 },
    { at: total - 4, s: P ? "sfx_ships_whistle" : "sfx_cowbells", gain: 0.9 },
  ];
  return { steps, audio };
}

export class HypePlayer {
  el = h("div.hype.hidden");
  private stage = h("div.hype-stage");
  private flash = h("div.hype-flash");
  private bar = h("i");
  private run = 0;
  /** Shareable MP4 (Padres only): licensed crowd and announcer audio, no music. */
  dl = h("a.hype-dl.hidden", { download: "padres-hype.mp4", target: "_blank", rel: "noopener" }, "Download MP4");
  playing = false;
  onEnd: () => void = () => {};
  constructor() {
    this.el.append(this.stage, this.flash, h("div.hype-bar", {}, this.bar), h("button.hype-x", { onclick: () => this.stop() }, "Skip"), this.dl);
  }
  async play(plan: { steps: Step[] }, mp4?: string, t0 = performance.now()) {
    this.dl.classList.toggle("hidden", !mp4);
    if (mp4) (this.dl as HTMLAnchorElement).href = mp4;
    const run = ++this.run;
    this.playing = true;
    this.el.classList.remove("hidden");
    const total = plan.steps.reduce((a, x) => a + x.secs, 0);
    this.bar.style.transition = "none"; this.bar.style.width = "0%"; void this.bar.offsetWidth;
    this.bar.style.transition = `width ${total}s linear`; this.bar.style.width = "100%";
    // Preload every still so the cuts land on the beat.
    plan.steps.forEach((st) => { if ("shot" in st && !st.shot.endsWith(".mp4")) new Image().src = `${base}media/${st.shot}`; });
    let k = 0, at = 0;
    for (const st of plan.steps) {
      if (run !== this.run) return;
      this.stage.replaceChildren(this.render(st, k++));
      const fx = st.fx !== undefined;
      if (!fx || st.flash) { this.flash.classList.remove("go"); void this.flash.offsetWidth; this.flash.classList.add("go"); }
      this.stage.classList.remove("shake"); void this.stage.offsetWidth; if (st.shake) this.stage.classList.add("shake");
      at += st.secs;
      // Wait against the start time, not step by step, so the pictures never drift off the narration.
      await new Promise((r) => setTimeout(r, Math.max(0, t0 + at * 1000 - performance.now())));
    }
    if (run === this.run) this.stop();
  }
  private render(st: Step, k: number): HTMLElement {
    if ("card" in st) return h(`div.hype-card${st.hot ? ".hot" : ""}`, {}, h("div.hc-kicker", {}, st.kicker ?? ""), h("div.hc-title", {}, st.card), h("div.hc-scan"));
    const src = `${base}media/${st.shot}`;
    const moves = ["kb-in", "kb-out", "kb-left", "kb-right"];
    const FX: Record<string, string> = { punch: "fx-punch", slow: "kb-in", in: "kb-in", out: "kb-out", left: "kb-left", right: "kb-right" };
    const cls = st.fx ? FX[st.fx] ?? "kb-in" : moves[k % moves.length];
    const m = h(`div.hype-shot.${cls}${st.dim ? ".dim" : ""}`, { style: { animationDuration: `${st.fx === "punch" ? Math.max(st.secs, 1.2) : st.secs + 0.6}s` } as any });
    if (st.shot.endsWith(".mp4")) {
      const v = h("video", { src, muted: true, autoplay: true, playsinline: true, loop: true }) as HTMLVideoElement;
      v.muted = true; void v.play().catch(() => undefined); m.append(v);
    } else m.append(h("img", { src, alt: "" }));
    return m;
  }
  stop() {
    this.run++;
    this.el.classList.add("hidden");
    this.stage.replaceChildren();
    if (this.playing) { this.playing = false; this.onEnd(); }
  }
}
