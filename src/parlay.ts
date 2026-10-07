/**
 * Parlay tracker for Lite: bets typed in by hand (no sportsbook logins, no scraping), saved on this device, scored
 * live against tonight's game from ESPN's free scoreboard and box score. Same rules as Room OS (gncore.ts).
 */
import { fill, h } from "./dom";
import type { Snapshot } from "./espn";
import { SPORT, type Team } from "./teams";
import { cleanLeg, evaluateParlay, parseEspnPlayers, PROP_STATS, type Game, type Parlay, type ParlayView, type PlayerLine } from "./gncore";

const KEY = "lite.parlays";
const PATH: Record<string, string> = { mlb: "baseball/mlb", nfl: "football/nfl", ncaaf: "football/college-football", wnba: "basketball/wnba" };
export function loadParlays(): Parlay[] { try { const x = JSON.parse(localStorage.getItem(KEY) ?? "[]"); return Array.isArray(x) ? x.slice(0, 10) : []; } catch { return []; } }
export function saveParlays(list: Parlay[]) { localStorage.setItem(KEY, JSON.stringify(list.slice(-10))); }

/** Lite's snapshot as the shared Game shape. */
export function gameOf(team: Team, s: Snapshot | null, eventId?: string): Game | undefined {
  if (!s) return undefined;
  const home = s.us.home ? s.us : s.them, away = s.us.home ? s.them : s.us;
  return {
    id: `lite:${team.league}:${eventId ?? s.id}`, sport: SPORT[team.league], startTime: Date.parse(s.date),
    status: s.state === "pre" ? "scheduled" : s.state === "post" ? "final" : "live", period: s.inning ?? 0,
    situation: { half: s.half === "bot" ? "bottom" : s.half === "top" ? "top" : s.half === "mid" ? "middle" : s.half === "end" ? "end" : undefined, outs: s.outs, onFirst: s.onFirst, onSecond: s.onSecond, onThird: s.onThird },
    home: { abbreviation: home.abbr }, away: { abbreviation: away.abbr }, homeScore: home.score, awayScore: away.score,
  };
}

const cache = new Map<string, { at: number; lines: PlayerLine[] }>();
/** Box score players from ESPN's game summary (CORS open), at most every 30 seconds. */
export async function players(team: Team, eventId: string | undefined, fresh = false): Promise<PlayerLine[]> {
  const p = PATH[team.league]; if (!p || !eventId) return [];
  const have = cache.get(eventId);
  if (have && (!fresh || Date.now() - have.at < 30000)) return have.lines;
  try { const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${p}/summary?event=${eventId}`, { cache: "no-store" }); if (!r.ok) throw new Error(); const lines = parseEspnPlayers(await r.json()); cache.set(eventId, { at: Date.now(), lines }); return lines; }
  catch { return have?.lines ?? []; }
}

export function evaluateAll(list: Parlay[], game: Game | undefined, lines: PlayerLine[]): ParlayView[] {
  return list.map((p) => evaluateParlay(p, (id) => (game && id === game.id ? game : undefined), () => lines));
}

/** The card in the corner of the big screen, with the sweat meter. */
export function parlayCard(views: ParlayView[]): HTMLElement | null {
  const list = views.slice(0, 2); if (!list.length) return null;
  const col: Record<string, string> = { hit: "#34d399", dead: "#6b7280", push: "#9ca3af", live: "#ffc425", pending: "#94a3b8" };
  return h("div.pl-wrap", {}, ...list.map((p) => h(`div.pl-card${p.sweat >= 0.6 ? ".hot" : ""}`, {},
    h("div.pl-head", {}, h("b", {}, `${p.name}${p.odds ? ` · ${p.odds}` : ""}`), h("span", { style: { color: p.status === "cashed" ? "#34d399" : p.status === "dead" ? "#9ca3af" : "#ffc425" } }, p.status === "cashed" ? "CASHED" : p.status === "dead" ? "BUSTED" : `${p.hits}/${p.total}`)),
    ...p.legs.map((l) => h(`div.pl-leg${l.status === "dead" ? ".dead" : ""}`, {},
      h("div.pl-row", {}, h("span", {}, `${l.status === "hit" ? "✓ " : ""}${l.label}`), h("em", { style: { color: col[l.status] } }, l.current !== undefined && l.target !== undefined ? `${l.current}/${l.target}` : l.note)),
      h("div.pl-bar", {}, h("i", { style: { width: `${Math.round(l.progress * 100)}%`, background: col[l.status] } })))),
    p.status === "live" ? h("div.pl-sweat", {}, h("div.pl-row", {}, h("span", {}, "SWEAT METER"), h("b", {}, p.sweat >= 0.8 ? "FULL SWEAT" : p.sweat >= 0.6 ? "SWEATING" : p.sweat >= 0.35 ? "GETTING CLOSE" : "CALM")), h("div.pl-meter", {}, h("i", { style: { left: `${Math.round(p.sweat * 100)}%` } }))) : null)));
}

/** The bet builder, used on the big screen and on the phone remote. */
export function parlayPanel(ctx: { team: Team; eventId?: string; teams: string[]; gameId: string; label: string }, list: Parlay[], onChange: (list: Parlay[]) => void): HTMLElement {
  const box = h("div.parlay");
  const sport = SPORT[ctx.team.league];
  const stats = PROP_STATS[sport === "football" ? "football" : sport === "basketball" ? "basketball" : "baseball"];
  let legs: Record<string, unknown>[] = [];
  const draw = (names: PlayerLine[]) => {
    const kind = h("select", {}, ...[["player", "Player prop"], ["moneyline", "To win"], ["spread", "Spread / run line"], ["total", "Game total"], ["teamTotal", "Team total"]].map(([v, t]) => h("option", { value: v }, t))) as HTMLSelectElement;
    const player = h("input", { list: "pl-names", placeholder: names.length ? "Start typing a name" : "Player name as ESPN shows it" }) as HTMLInputElement;
    const dl = h("datalist", { id: "pl-names" }, ...names.map((n) => h("option", { value: n.name }, n.team)));
    const stat = h("select", {}, h("option", { value: "" }, "Pick a stat"), ...stats.map((s) => h("option", { value: s.stat }, s.label))) as HTMLSelectElement;
    const teamSel = h("select", {}, ...ctx.teams.map((t) => h("option", { value: t }, t))) as HTMLSelectElement;
    const line = h("input", { inputmode: "decimal", placeholder: "Line, e.g. 0.5 or -1.5" }) as HTMLInputElement;
    const side = h("select", {}, h("option", { value: "over" }, "Over"), h("option", { value: "under" }, "Under")) as HTMLSelectElement;
    const err = h("p.err");
    const pending = h("ul.pl-pending", {}, ...legs.map((l, i) => h("li", {}, String(l.desc), h("button", { onclick: () => { legs.splice(i, 1); draw(names); } }, "✕"))));
    const name = h("input", { placeholder: "Name (optional)" }) as HTMLInputElement;
    const odds = h("input", { placeholder: "Odds, e.g. +650" }) as HTMLInputElement;
    const sync = () => { const k = kind.value; player.parentElement!.style.display = stat.parentElement!.style.display = k === "player" ? "" : "none"; teamSel.parentElement!.style.display = ["moneyline", "spread", "teamTotal"].includes(k) ? "" : "none"; line.parentElement!.style.display = k === "moneyline" ? "none" : ""; side.parentElement!.style.display = ["total", "teamTotal", "player"].includes(k) ? "" : "none"; };
    kind.onchange = sync;
    const add = () => {
      const raw: Record<string, unknown> = { kind: kind.value, gameId: ctx.gameId, team: teamSel.value, line: line.value === "" ? undefined : Number(line.value), side: side.value, player: player.value, stat: stat.value, playerId: names.find((n) => n.name === player.value)?.id };
      const ok = cleanLeg(raw, "x");
      if (typeof ok === "string") { err.textContent = ok; return; }
      legs.push({ ...raw, desc: kind.value === "player" ? `${player.value} ${side.value === "under" ? "U" : "O"} ${line.value} ${stats.find((s) => s.stat === stat.value)?.label ?? ""}` : kind.value === "moneyline" ? `${teamSel.value} to win` : kind.value === "spread" ? `${teamSel.value} ${line.value}` : `${kind.value === "teamTotal" ? teamSel.value + " " : ""}${side.value === "under" ? "Under" : "Over"} ${line.value}` });
      draw(names);
    };
    const save = () => {
      const clean = legs.map((l, i) => cleanLeg(l, `leg_${Date.now().toString(36)}_${i}`)).filter((l): l is Exclude<ReturnType<typeof cleanLeg>, string> => typeof l !== "string");
      if (!clean.length) return;
      list = [...list, { id: `bet_${Date.now().toString(36)}`, legs: clean, createdAt: Date.now(), ...(name.value.trim() ? { name: name.value.trim().slice(0, 40) } : {}), ...(/^[+-]?\d{2,6}$/.test(odds.value.trim()) ? { odds: odds.value.trim() } : {}) }];
      legs = []; onChange(list); draw(names);
    };
    fill(box,
      h("p.muted", {}, `Type your bet in by hand for ${ctx.label}. Live progress comes from ESPN's free scoreboard and box score. Saved on this device only.`),
      ...list.map((b) => h("div.pl-saved", {}, h("b", {}, `${b.name ?? `${b.legs.length}-leg parlay`}${b.odds ? ` · ${b.odds}` : ""}`), h("button.wu-test", { onclick: () => { list = list.filter((x) => x.id !== b.id); onChange(list); draw(names); } }, "Remove"))),
      h("div.pl-form", {}, h("label", {}, "Bet", kind), h("label", {}, "Player", player, dl), h("label", {}, "Stat", stat), h("label", {}, "Team", teamSel), h("label", {}, "Line", line), h("label", {}, "Side", side), h("button.dock-btn", { onclick: add }, "Add leg"), err),
      legs.length ? h("div.pl-build", {}, pending, h("div.pl-form", {}, h("label", {}, "Name", name), h("label", {}, "Odds", odds)), h("button.dock-btn.primary", { onclick: save }, `Track this ${legs.length}-leg bet`)) : null,
    );
    sync();
  };
  draw([]);
  void players(ctx.team, ctx.eventId).then(draw);
  return box;
}
