/**
 * My Players: a watchlist saved in this browser (localStorage, no login). Baseball players (MLB and the
 * minors) come from MLB's Stats API; WNBA players from ESPN. While their team plays, the box score is
 * checked and a lower third pops when one homers, drives in a run or hits a three.
 */
export type PLeague = "mlb" | "wnba";
export interface Player { id: string; name: string; league: PLeague; teamId: string; team: string; level?: string }
export interface Alert { player: Player; title: string; sub: string; kind: "hr" | "rbi" | "three" }

const KEY = "lite.players";
export const loadPlayers = (): Player[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } };
export const savePlayers = (p: Player[]) => localStorage.setItem(KEY, JSON.stringify(p.slice(0, 40)));

const MLB = "https://statsapi.mlb.com/api/v1";
const LEVEL: Record<number, string> = { 1: "MLB", 11: "AAA", 12: "AA", 13: "High-A", 14: "Single-A" };
const j = async (u: string) => { const r = await fetch(u, { cache: "no-store" }); if (!r.ok) throw new Error(String(r.status)); return r.json(); };

export async function searchPlayers(q: string, league: PLeague): Promise<Player[]> {
  q = q.trim();
  if (q.length < 2) return [];
  if (league === "mlb") {
    const d = await j(`${MLB}/people/search?names=${encodeURIComponent(q)}&sportIds=1,11,12,13,14&active=true&hydrate=currentTeam`);
    const ppl = ((d.people ?? []) as any[]).filter((p) => p.currentTeam?.id).slice(0, 12);
    const teamIds = [...new Set(ppl.map((p) => p.currentTeam.id))];
    const teams: Record<string, any> = {};
    if (teamIds.length) { try { const t = await j(`${MLB}/teams?teamIds=${teamIds.join(",")}`); for (const x of t.teams ?? []) teams[x.id] = x; } catch { /* names optional */ } }
    return ppl.map((p) => { const t = teams[p.currentTeam.id]; return { id: String(p.id), name: p.fullName, league, teamId: String(p.currentTeam.id), team: t?.name ?? "", level: LEVEL[t?.sport?.id] ?? "" }; });
  }
  const d = await j(`https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(q)}&limit=20&type=player`);
  return ((d.items ?? []) as any[]).filter((x) => x.league === "wnba").slice(0, 12).map((x) => {
    const t = (x.teamRelationships ?? []).find((r: any) => r.type === "team")?.core;
    return { id: String(x.id), name: x.displayName, league, teamId: t ? String(t.id) : "", team: t?.displayName ?? "", level: "WNBA" };
  });
}

/** Watches the box scores of games involving the list's teams. Baseline on first sight, then alerts on increases. */
export class Watcher {
  private seen = new Map<string, number>();   // `${game}:${player}:${stat}` -> value
  private timer = 0;
  onAlert: (a: Alert) => void = () => {};
  constructor(private list: () => Player[]) {}
  start() { void this.tick(); }
  stop() { clearTimeout(this.timer); }

  private bump(key: string, v: number): number {
    const prev = this.seen.get(key);
    this.seen.set(key, v);
    return prev === undefined ? 0 : Math.max(0, v - prev);
  }

  private async tick() {
    let live = false;
    const ps = this.list();
    try {
      const bb = ps.filter((p) => p.league === "mlb" && p.teamId);
      if (bb.length) live = (await this.baseball(bb)) || live;
      const wn = ps.filter((p) => p.league === "wnba" && p.teamId);
      if (wn.length) live = (await this.wnba(wn)) || live;
    } catch { /* try again next round */ }
    this.timer = window.setTimeout(() => void this.tick(), live ? 30000 : 180000);
  }

  private async baseball(ps: Player[]): Promise<boolean> {
    const today = new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);
    const teams = [...new Set(ps.map((p) => p.teamId))].join(",");
    const d = await j(`${MLB}/schedule?sportId=1,11,12,13,14&teamId=${teams}&date=${today}`);
    const games = ((d.dates ?? []) as any[]).flatMap((x) => x.games).filter((g: any) => g.status?.abstractGameState === "Live");
    for (const g of games) {
      const box = await j(`${MLB}/game/${g.gamePk}/boxscore?fields=teams,away,home,players,person,id,stats,batting,homeRuns,rbi`);
      for (const side of ["away", "home"]) {
        const pl = box.teams?.[side]?.players ?? {};
        for (const p of ps) {
          const s = pl[`ID${p.id}`]?.stats?.batting;
          if (!s) continue;
          const hr = this.bump(`${g.gamePk}:${p.id}:hr`, Number(s.homeRuns ?? 0));
          const rbi = this.bump(`${g.gamePk}:${p.id}:rbi`, Number(s.rbi ?? 0));
          if (hr) this.onAlert({ player: p, kind: "hr", title: `${p.name} homers`, sub: `${s.homeRuns > 1 ? `${s.homeRuns} HR today` : "Home run"}${s.rbi ? `  ·  ${s.rbi} RBI today` : ""}` });
          else if (rbi) this.onAlert({ player: p, kind: "rbi", title: `${p.name} drives in ${rbi > 1 ? `${rbi} runs` : "a run"}`, sub: `${s.rbi} RBI today` });
        }
      }
    }
    return games.length > 0;
  }

  private async wnba(ps: Player[]): Promise<boolean> {
    const d = await j("https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard");
    const ids = new Set(ps.map((p) => p.teamId));
    const games = ((d.events ?? []) as any[]).filter((e) => e.status?.type?.state === "in" && e.competitions?.[0]?.competitors?.some((c: any) => ids.has(String(c.team?.id))));
    for (const e of games) {
      const s = await j(`https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/summary?event=${e.id}`);
      for (const t of s.boxscore?.players ?? []) for (const g of t.statistics ?? []) {
        const i = (g.keys ?? []).indexOf("threePointFieldGoalsMade-threePointFieldGoalsAttempted");
        if (i < 0) continue;
        for (const a of g.athletes ?? []) {
          const p = ps.find((x) => x.id === String(a.athlete?.id));
          if (!p) continue;
          const made = Number(String(a.stats?.[i] ?? "0").split("-")[0]) || 0;
          if (this.bump(`${e.id}:${p.id}:3pm`, made)) this.onAlert({ player: p, kind: "three", title: `${p.name} hits a three`, sub: `${made} three${made > 1 ? "s" : ""} today` });
        }
      }
    }
    return games.length > 0;
  }
}
