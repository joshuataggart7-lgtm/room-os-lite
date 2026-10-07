/**
 * Live game data from ESPN's public JSON (site.api.espn.com sends Access-Control-Allow-Origin: *, so the
 * browser reads it directly; no server of ours). Finds the team's current or next game from its schedule,
 * then polls the scoreboard for that day and turns each poll into a Snapshot.
 */
import { PATH, SPORT, type Team } from "./teams";

export interface Side { id: string; abbr: string; name: string; score: number; logo: string; color: string; home: boolean }
export interface Snapshot {
  id: string;
  state: "pre" | "in" | "post";
  detail: string;            // "Top 7th", "Q3 4:12", "Final"
  date: string;              // ISO start
  broadcast: string;
  us: Side;
  them: Side;
  balls?: number; strikes?: number; outs?: number;
  onFirst?: boolean; onSecond?: boolean; onThird?: boolean;
  downDistance?: string; possession?: string; redZone?: boolean;
  lastPlay?: { id: string; text: string; teamId?: string };
  inning?: number; half?: "top" | "bot" | "mid" | "end";
  /** Playoff series straight from ESPN's competition.series and notes; absent when ESPN doesn't send it. */
  series?: Series;
  at: number;                // when it was fetched (ms)
}

export interface Series { summary: string; note: string; usWins: number; themWins: number; needed: number; total: number; completed: boolean }
/** Win-or-go-home is only claimed when the series numbers say so. */
export const seriesFlag = (x?: Series): "elim" | "decider" | "clinch" | "" => {
  if (!x || x.completed || !x.needed) return "";
  const ue = x.themWins === x.needed - 1, ce = x.usWins === x.needed - 1;
  return ue && ce ? "decider" : ue ? "elim" : ce ? "clinch" : "";
};
function seriesOf(comp: any, usId: string): Series | undefined {
  const s = comp?.series;
  if (!s || s.type !== "playoff" || !Array.isArray(s.competitors)) return undefined;
  const us = s.competitors.find((c: any) => String(c.id) === usId), them = s.competitors.find((c: any) => String(c.id) !== usId);
  if (!us || !them) return undefined;
  const total = Number(s.totalCompetitions) || 0;
  return { summary: String(s.summary ?? ""), note: String(comp.notes?.[0]?.headline ?? ""), usWins: Number(us.wins) || 0, themWins: Number(them.wins) || 0, needed: total ? Math.floor(total / 2) + 1 : 0, total, completed: !!s.completed };
}
const halfOf = (d: string): Snapshot["half"] => (/^top/i.test(d) ? "top" : /^bot/i.test(d) ? "bot" : /^mid/i.test(d) ? "mid" : /^end/i.test(d) ? "end" : undefined);

const API = "https://site.api.espn.com/apis/site/v2/sports/";
/** MLB's free Stats API (statsapi.mlb.com, CORS open): minor league games, which ESPN doesn't carry. */
const MLB = "https://statsapi.mlb.com/api/v1";
const mlbState = (st: any): Snapshot["state"] => (st?.abstractGameState === "Live" ? "in" : st?.abstractGameState === "Final" ? "post" : "pre");
const getJson = async (url: string) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`ESPN ${r.status}`); return r.json(); };

/** The event to follow: one in progress, else one that started or ends within a few hours, else the next one. */
export async function findEvent(team: Team): Promise<{ id: string; date: string } | null> {
  let evs: { id: string; date: string; state?: string }[];
  if (team.league === "milb") {
    const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
    const d = await getJson(`${MLB}/schedule?sportId=11,12,13,14&teamId=${team.espnId}&startDate=${day(-1)}&endDate=${day(21)}`);
    evs = ((d.dates ?? []) as any[]).flatMap((x) => x.games).map((g: any) => ({ id: String(g.gamePk), date: String(g.gameDate), state: mlbState(g.status) }));
  } else {
    const d = await getJson(`${API}${PATH[team.league]}/teams/${team.espnId}/schedule`);
    evs = ((d.events ?? []) as any[]).map((e) => ({ id: String(e.id), date: String(e.date), state: e.competitions?.[0]?.status?.type?.state as string | undefined }));
  }
  const now = Date.now();
  const live = evs.find((e) => e.state === "in");
  if (live) return live;
  const recent = evs.filter((e) => e.state === "post" && now - Date.parse(e.date) < 7 * 3600e3).pop();
  const next = evs.filter((e) => e.state !== "post" && Date.parse(e.date) > now - 6 * 3600e3).sort((a, b) => Date.parse(a.date) - Date.parse(b.date))[0];
  if (next && (!recent || Date.parse(next.date) - now < 3 * 3600e3)) return next;
  return recent ?? next ?? null;
}

const etDate = (iso: string) => {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("year")}${g("month")}${g("day")}`;
};

function side(c: any, fallbackColor: string): Side {
  const t = c.team ?? {};
  return {
    id: String(t.id ?? c.id), abbr: t.abbreviation ?? "", name: t.shortDisplayName ?? t.name ?? t.displayName ?? "",
    score: Number(c.score?.value ?? c.score ?? 0) || 0, logo: t.logo ?? t.logos?.[0]?.href ?? "",
    color: t.color ? `#${t.color}` : fallbackColor, home: c.homeAway === "home",
  };
}

function toSnapshot(team: Team, e: any, comp: any): Snapshot | null {
  const cs = (comp?.competitors ?? []) as any[];
  const usC = cs.find((c) => String(c.team?.id ?? c.id) === team.espnId);
  const themC = cs.find((c) => c !== usC);
  if (!usC || !themC) return null;
  const st = comp.status ?? e.status ?? {};
  const s = comp.situation ?? {};
  const lp = s.lastPlay;
  return {
    id: String(e.id), state: (st.type?.state ?? "pre") as Snapshot["state"], detail: st.type?.shortDetail ?? st.type?.detail ?? "",
    date: String(e.date ?? comp.date), broadcast: (comp.broadcasts ?? []).flatMap((b: any) => b.names ?? []).join(", ") || (comp.broadcasts?.[0]?.media?.shortName ?? ""),
    us: side(usC, team.color), them: side(themC, "#555555"),
    balls: s.balls, strikes: s.strikes, outs: s.outs, onFirst: s.onFirst, onSecond: s.onSecond, onThird: s.onThird,
    downDistance: s.downDistanceText ?? s.shortDownDistanceText, possession: s.possession, redZone: s.isRedZone,
    lastPlay: lp ? { id: String(lp.id ?? lp.text ?? ""), text: String(lp.text ?? ""), teamId: lp.team?.id ? String(lp.team.id) : undefined } : undefined,
    inning: Number(st.period) || undefined, half: halfOf(String(st.type?.shortDetail ?? "")),
    series: seriesOf(comp, team.espnId),
    at: Date.now(),
  };
}

/** One poll for the event: the scoreboard for its day (light), or the event summary when the board lacks it. */
export async function pollEvent(team: Team, ev: { id: string; date: string }): Promise<Snapshot | null> {
  if (team.league === "milb") return pollMilb(team, ev);
  const groups = team.league === "ncaaf" ? "&groups=80&limit=300" : "";
  try {
    const d = await getJson(`${API}${PATH[team.league]}/scoreboard?dates=${etDate(ev.date)}${groups}`);
    const e = ((d.events ?? []) as any[]).find((x) => String(x.id) === ev.id);
    if (e) return toSnapshot(team, e, e.competitions?.[0]);
  } catch { /* fall through */ }
  const d = await getJson(`${API}${PATH[team.league]}/summary?event=${ev.id}`);
  const comp = d.header?.competitions?.[0];
  if (!comp) return null;
  const snap = toSnapshot(team, { id: ev.id, date: comp.date, status: comp.status }, comp);
  if (snap && d.situation) {
    const s = d.situation;
    Object.assign(snap, { balls: s.balls, strikes: s.strikes, outs: s.outs, onFirst: s.onFirst, onSecond: s.onSecond, onThird: s.onThird });
  }
  return snap;
}

export type MomentKind = "stretch" | "eighth" | "closer" | "loss" | "over" | "walkout" | "hr" | "run" | "td" | "fg" | "score" | "opp" | "win" | "start" | "strikeout" | "chant" | "horn" | "defense" | "noise" | "fireworks" | "intro" | "three" | "bucket" | "cowbell";

/** Moments between two snapshots of the same game, from our side's point of view. */
export function diff(team: Team, a: Snapshot | null, b: Snapshot): MomentKind[] {
  if (!a || a.id !== b.id) return [];
  const out: MomentKind[] = [];
  const sport = SPORT[team.league];
  if (a.state === "pre" && b.state === "in") out.push("start");
  const du = b.us.score - a.us.score, dt = b.them.score - a.them.score;
  const text = (b.lastPlay?.text ?? "").toLowerCase();
  if (du > 0) {
    if (sport === "baseball") out.push(/homer|home run|grand slam/.test(text) ? "hr" : "run");
    else if (sport === "basketball") out.push(du === 3 || /three point/.test(text) ? "three" : "bucket");
    else out.push(du >= 6 ? "td" : du === 3 ? "fg" : "score");
  }
  if (dt > 0 && sport !== "basketball") out.push("opp");
  if (sport === "baseball" && du <= 0 && dt <= 0 && b.lastPlay && b.lastPlay.id !== a.lastPlay?.id && /struck out/.test(text) && b.lastPlay.teamId && b.lastPlay.teamId !== team.espnId) out.push("strikeout");
  if (sport === "baseball" && b.state === "in" && b.half === "mid" && (a.half !== "mid" || a.inning !== b.inning)) {
    if (b.inning === 7) out.push("stretch");
    if (b.inning === 8 && team.set === "padres") out.push("eighth");
  }
  if (a.state !== "post" && b.state === "post") {
    if (b.us.score > b.them.score) out.push("win");
    else if (b.us.score < b.them.score) out.push(b.series?.completed || seriesFlag(a.series) === "elim" || seriesFlag(a.series) === "decider" ? "over" : "loss");
  }
  return out;
}

/** A pretend game for the hidden ?sim=1 test mode: our side scores every ~20 s. */
export function simSnapshots(team: Team): () => Snapshot {
  const t0 = Date.now();
  return () => {
    const n = Math.floor((Date.now() - t0) / 20000);
    const baseball = SPORT[team.league] === "baseball";
    const hoops = SPORT[team.league] === "basketball";
    const us = baseball ? n : hoops ? 40 + n * 3 : Math.floor(n / 2) * 7 + (n % 2) * 3;
    return {
      id: "sim", state: "in", detail: baseball ? `Bot ${3 + n}th` : `Q${Math.min(4, 1 + n)} 8:4${n % 10}`, date: new Date(t0).toISOString(), broadcast: "SIM",
      us: { id: team.espnId, abbr: team.abbr, name: team.name, score: us, logo: team.logo, color: team.color, home: true },
      them: { id: "0", abbr: "OPP", name: "Visitors", score: 2, logo: "", color: "#555555", home: false },
      balls: 2, strikes: 1, outs: n % 3, onFirst: true, onSecond: false, onThird: n % 2 === 1,
      downDistance: "2nd & 7 at OPP 24", lastPlay: { id: String(n), text: baseball && n % 2 ? "homered to left" : "scores" }, at: Date.now(),
    };
  };
}

async function pollMilb(team: Team, ev: { id: string; date: string }): Promise<Snapshot | null> {
  const d = await getJson(`${MLB}/schedule?gamePk=${ev.id}&hydrate=linescore,team`);
  const g = d.dates?.[0]?.games?.[0];
  if (!g) return null;
  const sideOf = (x: any): Side => ({ id: String(x.team.id), abbr: x.team.abbreviation ?? x.team.teamName ?? "", name: x.team.teamName ?? x.team.name, score: Number(x.score ?? 0), logo: `https://www.mlbstatic.com/team-logos/${x.team.id}.svg`, color: String(x.team.id) === team.espnId ? team.color : "#555555", home: false });
  const home = { ...sideOf(g.teams.home), home: true }, away = sideOf(g.teams.away);
  const us = home.id === team.espnId ? home : away, them = us === home ? away : home;
  const ls = g.linescore ?? {};
  const state = mlbState(g.status);
  let lastPlay: Snapshot["lastPlay"];
  if (state === "in") {
    try {
      const f = await getJson(`https://statsapi.mlb.com/api/v1.1/game/${ev.id}/feed/live?fields=liveData,plays,currentPlay,result,description,about,atBatIndex,halfInning`);
      const cp = f.liveData?.plays?.currentPlay;
      if (cp) lastPlay = { id: String(cp.about?.atBatIndex ?? ""), text: String(cp.result?.description ?? ""), teamId: cp.about?.halfInning === "top" ? away.id : home.id };
    } catch { /* score still works */ }
  }
  return {
    id: ev.id, state, date: g.gameDate, broadcast: "",
    detail: state === "pre" ? "" : state === "post" ? "Final" : `${ls.inningHalf === "Bottom" ? "Bot" : ls.inningHalf === "Top" ? "Top" : ls.inningState ?? ""} ${ls.currentInningOrdinal ?? ""}`.trim(),
    us, them, balls: ls.balls, strikes: ls.strikes, outs: ls.outs,
    onFirst: !!ls.offense?.first, onSecond: !!ls.offense?.second, onThird: !!ls.offense?.third, lastPlay, at: Date.now(),
  };
}
