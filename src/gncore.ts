/**
 * Game night rules shared with Room OS (copied from its packages/core/src/gamenight.ts, the parts Lite uses) so
 * Lite and the room agree on parlay legs and watch party messages.
 */
export type Sport = "football" | "basketball" | "baseball" | "hockey" | "soccer";
export interface Game {
  id: string; sport: Sport; status: "scheduled" | "live" | "halftime" | "final" | "postponed"; period: number; startTime: number;
  situation: { half?: "top" | "bottom" | "middle" | "end"; outs?: number; onFirst?: boolean; onSecond?: boolean; onThird?: boolean };
  home: { abbreviation: string }; away: { abbreviation: string }; homeScore: number; awayScore: number;
}

// ---------------------------------------------------------------- parlay

export type LegKind = "player" | "moneyline" | "spread" | "total" | "teamTotal";
export interface ParlayLeg {
  id: string;
  kind: LegKind;
  gameId: string;
  /** Team abbreviation for moneyline, spread and team total. */
  team?: string;
  /** Spread (-1.5), total (8.5), prop line (0.5). */
  line?: number;
  side?: "over" | "under";
  player?: string;
  playerId?: string;
  /** One or more "category.key" from ESPN's box score joined by "+", e.g. "batting.hits+batting.runs+batting.RBIs". */
  stat?: string;
}
export interface Parlay { id: string; name?: string; odds?: string; stake?: number; legs: ParlayLeg[]; createdAt: number }
export type LegStatus = "pending" | "live" | "hit" | "dead" | "push";
export interface LegView { id: string; label: string; status: LegStatus; current?: number; target?: number; progress: number; sweat: number; note: string }
export interface ParlayView { id: string; name: string; odds?: string; status: "pending" | "live" | "cashed" | "dead" | "push"; legs: LegView[]; hits: number; total: number; sweat: number }

export interface PlayerLine { id: string; name: string; team: string; stats: Record<string, number> }

/** Prop stats offered in the phone form, per sport. Keys are ESPN box score keys. */
export const PROP_STATS: Record<"baseball" | "football" | "basketball", Array<{ stat: string; label: string }>> = {
  baseball: [
    { stat: "batting.hits", label: "Hits" }, { stat: "batting.homeRuns", label: "Home runs" }, { stat: "batting.RBIs", label: "RBIs" },
    { stat: "batting.runs", label: "Runs" }, { stat: "batting.hits+batting.runs+batting.RBIs", label: "Hits + Runs + RBIs" },
    { stat: "batting.walks", label: "Walks" }, { stat: "pitching.strikeouts", label: "Pitcher strikeouts" },
    { stat: "pitching.hits", label: "Hits allowed" }, { stat: "pitching.earnedRuns", label: "Earned runs allowed" },
  ],
  football: [
    { stat: "passing.passingYards", label: "Passing yards" }, { stat: "passing.passingTouchdowns", label: "Passing TDs" },
    { stat: "rushing.rushingYards", label: "Rushing yards" }, { stat: "receiving.receivingYards", label: "Receiving yards" },
    { stat: "receiving.receptions", label: "Receptions" }, { stat: "rushing.rushingTouchdowns+receiving.receivingTouchdowns", label: "Anytime TD (rush + rec)" },
  ],
  basketball: [
    { stat: "stats.points", label: "Points" }, { stat: "stats.rebounds", label: "Rebounds" }, { stat: "stats.assists", label: "Assists" },
    { stat: "stats.threePointFieldGoalsMade", label: "Threes made" }, { stat: "stats.points+stats.rebounds+stats.assists", label: "Pts + Reb + Ast" },
  ],
};
export const statLabel = (stat: string): string => Object.values(PROP_STATS).flat().find((s) => s.stat === stat)?.label ?? stat.split("+").map((s) => s.split(".").pop()).join(" + ");

const num = (s: string): number => { const n = Number(String(s).replace(/^\+/, "")); return Number.isFinite(n) ? n : NaN; };

/** Player lines from an ESPN game summary's box score (any sport). "2-3" style values are split by their keys. */
export function parseEspnPlayers(summary: unknown): PlayerLine[] {
  const teams = ((summary as { boxscore?: { players?: unknown[] } })?.boxscore?.players ?? []) as Array<{ team?: { abbreviation?: string }; statistics?: Array<{ name?: string; type?: string; keys?: string[]; athletes?: Array<{ athlete?: { id?: string; displayName?: string }; stats?: string[] }> }> }>;
  const out = new Map<string, PlayerLine>();
  for (const t of teams) {
    const team = String(t.team?.abbreviation ?? "");
    for (const cat of t.statistics ?? []) {
      const c = cat.name || cat.type || "stats";
      const keys = cat.keys ?? [];
      for (const a of cat.athletes ?? []) {
        const id = String(a.athlete?.id ?? ""); if (!id) continue;
        const p = out.get(id) ?? { id, name: String(a.athlete?.displayName ?? ""), team, stats: {} };
        (a.stats ?? []).forEach((v, i) => {
          const k = keys[i]; if (!k) return;
          const ks = k.split(/[-/]/), vs = String(v).split(/[-/]/);
          if (ks.length > 1 && ks.length === vs.length && !k.includes(".")) ks.forEach((kk, j) => { const n = num(vs[j]); if (!Number.isNaN(n)) p.stats[`${c}.${kk}`] = n; });
          else { const n = num(v); if (!Number.isNaN(n)) p.stats[`${c}.${k}`] = n; }
        });
        out.set(id, p);
      }
    }
  }
  return [...out.values()];
}

export function statValue(p: PlayerLine | undefined, stat: string): number {
  if (!p) return 0;
  return stat.split("+").reduce((sum, k) => sum + (p.stats[k.trim()] ?? 0), 0);
}

/** How far along the game is, 0..1. */
export function gameProgress(g: Game): number {
  if (g.status === "final") return 1;
  if (g.status === "scheduled" || g.status === "postponed") return 0;
  if (g.sport === "baseball") { const half = g.situation.half === "bottom" || g.situation.half === "end" ? 0.5 : g.situation.half === "middle" ? 0.5 : 0; return Math.min(1, Math.max(0, (g.period - 1 + half) / 9)); }
  if (g.status === "halftime") return 0.5;
  const periods = g.sport === "hockey" ? 3 : g.sport === "soccer" ? 2 : 4;
  return Math.min(1, Math.max(0, (g.period - 1 + 0.5) / periods));
}

function sideScores(g: Game, team?: string): { mine: number; theirs: number } | undefined {
  const t = team?.toUpperCase();
  if (g.home.abbreviation.toUpperCase() === t) return { mine: g.homeScore, theirs: g.awayScore };
  if (g.away.abbreviation.toUpperCase() === t) return { mine: g.awayScore, theirs: g.homeScore };
  return undefined;
}

const fmtLine = (n: number | undefined) => (n === undefined ? "" : n > 0 ? `+${n}` : `${n}`);

export function legLabel(l: ParlayLeg, g?: Game): string {
  const opp = g && l.team ? (g.home.abbreviation === l.team ? g.away.abbreviation : g.home.abbreviation) : "";
  switch (l.kind) {
    case "moneyline": return `${l.team} to win${opp ? ` vs ${opp}` : ""}`;
    case "spread": return `${l.team} ${fmtLine(l.line)}`;
    case "total": return `${g ? `${g.away.abbreviation}/${g.home.abbreviation} ` : ""}${l.side === "under" ? "Under" : "Over"} ${l.line}`;
    case "teamTotal": return `${l.team} ${l.side === "under" ? "Under" : "Over"} ${l.line} runs`;
    case "player": return `${l.player ?? "Player"} ${l.side === "under" ? "Under" : "Over"} ${l.line} ${statLabel(l.stat ?? "")}`;
  }
}

/** One leg against the live game (and its box score for player props). */
export function evaluateLeg(l: ParlayLeg, g: Game | undefined, players: PlayerLine[] = []): LegView {
  const label = legLabel(l, g);
  const base = { id: l.id, label };
  if (!g) return { ...base, status: "pending", progress: 0, sweat: 0, note: "Waiting for the game" };
  if (g.status === "postponed") return { ...base, status: "push", progress: 0, sweat: 0, note: "Postponed" };
  const late = gameProgress(g), final = g.status === "final", pre = g.status === "scheduled";
  const live = (o: Partial<LegView> & { note: string }): LegView => ({ ...base, status: pre ? "pending" : "live", progress: 0, sweat: 0, ...o });
  const line = l.line ?? 0;
  if (l.kind === "player" || l.kind === "total" || l.kind === "teamTotal") {
    let cur: number;
    if (l.kind === "player") cur = statValue(players.find((p) => (l.playerId && p.id === l.playerId) || (!l.playerId && p.name.toLowerCase() === (l.player ?? "").toLowerCase())), l.stat ?? "");
    else if (l.kind === "total") cur = g.homeScore + g.awayScore;
    else { const s = sideScores(g, l.team); if (!s) return { ...base, status: "pending", progress: 0, sweat: 0, note: "Team not in this game" }; cur = s.mine; }
    const target = Math.floor(line) + 1; // the smallest value that beats the line
    const need = Math.max(0, target - cur);
    if (l.side !== "under") {
      if (cur > line) return { ...base, status: "hit", current: cur, target, progress: 1, sweat: 0, note: "Cashed" };
      if (final) return { ...base, status: cur === line ? "push" : "dead", current: cur, target, progress: Math.min(1, cur / target), sweat: 0, note: cur === line ? "Push" : `Fell ${need} short` };
      const sweat = pre ? 0 : need <= 1 ? 0.55 + 0.45 * late : need === 2 ? 0.25 + 0.35 * late : 0.1 * late;
      return live({ current: cur, target, progress: Math.min(1, cur / target), sweat: round2(sweat), note: `Needs ${need} more` });
    }
    if (cur > line) return { ...base, status: "dead", current: cur, target, progress: 0, sweat: 0, note: "Went over" };
    if (final) return { ...base, status: cur === line ? "push" : "hit", current: cur, target, progress: 1, sweat: 0, note: cur === line ? "Push" : "Stayed under" };
    const room = line - cur; // how much is left before it dies
    const sweat = pre ? 0 : room < 1 ? 0.55 + 0.45 * late : room < 2 ? 0.25 + 0.35 * late : 0.1 * late;
    return live({ current: cur, target, progress: round2(late), sweat: round2(sweat), note: room < 1 ? "One more kills it" : `${Math.ceil(room)} to spare` });
  }
  const s = sideScores(g, l.team);
  if (!s) return { ...base, status: "pending", progress: 0, sweat: 0, note: "Team not in this game" };
  const margin = s.mine - s.theirs + (l.kind === "spread" ? line : 0);
  if (final) return { ...base, status: margin > 0 ? "hit" : margin === 0 ? "push" : "dead", current: s.mine - s.theirs, progress: margin > 0 ? 1 : 0, sweat: 0, note: margin > 0 ? "Cashed" : margin === 0 ? "Push" : "Lost" };
  if (pre) return { ...base, status: "pending", current: 0, progress: 0, sweat: 0, note: "Not started" };
  const close = Math.abs(margin) <= 1.5 ? 1 : Math.abs(margin) <= 3 ? 0.5 : 0.15;
  const note = margin > 0 ? (l.kind === "spread" ? "Covering" : `Up ${s.mine - s.theirs}`) : margin === 0 ? "Even" : (l.kind === "spread" ? "Not covering" : `Down ${s.theirs - s.mine}`);
  return live({ current: s.mine - s.theirs, progress: round2(margin > 0 ? 0.5 + 0.5 * late : 0.5 * (1 - late) * 0.6), sweat: round2(close * (0.3 + 0.7 * late)), note });
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function evaluateParlay(p: Parlay, game: (id: string) => Game | undefined, players: (gameId: string) => PlayerLine[] = () => []): ParlayView {
  const legs = p.legs.map((l) => evaluateLeg(l, game(l.gameId), players(l.gameId)));
  const counted = legs.filter((l) => l.status !== "push");
  const hits = counted.filter((l) => l.status === "hit").length;
  const status: ParlayView["status"] = legs.some((l) => l.status === "dead") ? "dead" : !counted.length && legs.length ? "push" : counted.length && hits === counted.length ? "cashed" : legs.some((l) => l.status === "live" || l.status === "hit") ? "live" : "pending";
  const open = counted.filter((l) => l.status === "live");
  // The meter climbs when the parlay is down to its last legs and those legs are close.
  const sweat = status !== "live" ? 0 : round2(Math.min(1, Math.max(0, ...open.map((l) => l.sweat)) * (open.length === 1 ? 1 : open.length === 2 ? 0.85 : 0.7) + (counted.length > 1 ? (hits / counted.length) * 0.2 : 0)));
  return { id: p.id, name: p.name || `${p.legs.length}-leg parlay`, odds: p.odds, status, legs, hits, total: counted.length, sweat };
}

export type ParlayChange = { kind: "leg_hit" | "leg_dead" | "cashed" | "busted"; parlay: ParlayView; leg?: LegView };
/** What changed since the last look (each change fires once). */
export function parlayChanges(prev: ParlayView[] | undefined, next: ParlayView[]): ParlayChange[] {
  if (!prev) return [];
  const out: ParlayChange[] = [];
  for (const p of next) {
    const before = prev.find((x) => x.id === p.id); if (!before) continue;
    for (const l of p.legs) {
      const b = before.legs.find((x) => x.id === l.id); if (!b || b.status === l.status) continue;
      if (l.status === "hit") out.push({ kind: "leg_hit", parlay: p, leg: l });
      if (l.status === "dead") out.push({ kind: "leg_dead", parlay: p, leg: l });
    }
    if (before.status !== p.status && p.status === "cashed") out.push({ kind: "cashed", parlay: p });
    if (before.status !== p.status && p.status === "dead" && before.status !== "dead") out.push({ kind: "busted", parlay: p });
  }
  return out;
}

/** Validate one leg from the phone form. Returns an error message or the clean leg. */
export function cleanLeg(raw: Record<string, unknown>, id: string): ParlayLeg | string {
  const kind = raw.kind as LegKind;
  if (!["player", "moneyline", "spread", "total", "teamTotal"].includes(kind)) return "Pick a bet type";
  const gameId = typeof raw.gameId === "string" ? raw.gameId.slice(0, 80) : "";
  if (!/^[A-Za-z0-9_-]+(:[A-Za-z0-9_-]+)*$/.test(gameId)) return "Pick a game";
  const line = raw.line === undefined || raw.line === "" ? undefined : Number(raw.line);
  if (line !== undefined && (!Number.isFinite(line) || Math.abs(line) > 500)) return "The line must be a number";
  const team = typeof raw.team === "string" && /^[A-Z0-9]{2,6}$/.test(raw.team.toUpperCase()) ? raw.team.toUpperCase() : undefined;
  const side = raw.side === "under" ? "under" : "over";
  if ((kind === "moneyline" || kind === "spread" || kind === "teamTotal") && !team) return "Pick a team";
  if ((kind === "spread" || kind === "total" || kind === "teamTotal" || kind === "player") && line === undefined) return "Enter the line";
  const leg: ParlayLeg = { id, kind, gameId, ...(team ? { team } : {}), ...(line !== undefined ? { line } : {}) };
  if (kind === "total" || kind === "teamTotal" || kind === "player") leg.side = side;
  if (kind === "player") {
    const player = typeof raw.player === "string" ? raw.player.replace(/[^\p{L}\p{N} .'-]/gu, "").trim().slice(0, 40) : "";
    const stat = typeof raw.stat === "string" && /^[a-zA-Z]+\.[a-zA-Z]+(\+[a-zA-Z]+\.[a-zA-Z]+){0,3}$/.test(raw.stat) ? raw.stat : "";
    if (!player) return "Enter the player";
    if (!stat) return "Pick a stat";
    leg.player = player; leg.stat = stat;
    if (typeof raw.playerId === "string" && /^\d{1,12}$/.test(raw.playerId)) leg.playerId = raw.playerId;
  }
  return leg;
}

// ---------------------------------------------------------------- watch party

export const PARTY_PEER_PREFIX = "roomos-party-";
export const partyPeerId = (code: string) => `${PARTY_PEER_PREFIX}${code.toUpperCase()}`;
export const validPartyCode = (c: unknown): c is string => typeof c === "string" && /^[A-HJ-NP-Z2-9]{6}$/.test(c);

export const PARTY_EMOJI = ["🔥", "🙌", "😱", "🎉", "💪", "😤", "👏", "⚾", "🐄", "🦝", "😭", "🤫"] as const;
export const PARTY_TALK = ["LET'S GO PADRES", "BIG FLY", "FOR PETER", "WE BELIEVE", "TOLD YOU SO", "NOT LIKE THIS", "HAIL STATE", "HOTTY TODDY", "WHO DAT", "RING YOUR COWBELL"] as const;

/** Moment kinds Room OS Lite knows (its moments.ts). */
export type LiteKind = "hr" | "run" | "win" | "td" | "fg" | "three" | "noise" | "strikeout";
export interface PartyMoment { t: "moment"; kind: LiteKind; title: string; sub?: string; team?: string; feedTs: number }
