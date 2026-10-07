/**
 * Extra live detail for MLB packs from MLB's free Stats API (statsapi.mlb.com, CORS open): our pitchers'
 * strikeouts for the K board, and who is pitching right now (so the closer entrance can fire by itself).
 */
const API = "https://statsapi.mlb.com/api";
export interface MlbLive { gamePk: number; ks: number; pitcherId: number; pitcherName: string; usPitching: boolean; usBatting: boolean; batterId: number; batterName: string; at: number }

export class MlbTracker {
  gamePk = 0;
  last: MlbLive | null = null;
  onUpdate: (x: MlbLive) => void = () => {};
  private timer = 0;
  constructor(private mlbId: number) {}

  /** Finds the MLB gamePk for the ESPN event by start time, then polls while the game is live. */
  async follow(startIso: string) {
    try {
      const d0 = new Date(Date.parse(startIso) - 864e5).toISOString().slice(0, 10), d1 = new Date(Date.parse(startIso) + 864e5).toISOString().slice(0, 10);
      const r = await (await fetch(`${API}/v1/schedule?sportId=1&teamId=${this.mlbId}&startDate=${d0}&endDate=${d1}`)).json();
      const games = ((r.dates ?? []) as any[]).flatMap((x) => x.games);
      const g = games.find((x: any) => Math.abs(Date.parse(x.gameDate) - Date.parse(startIso)) < 3 * 3600e3);
      if (g) this.gamePk = g.gamePk;
    } catch { /* no K board, everything else still works */ }
  }

  async poll(): Promise<MlbLive | null> {
    if (!this.gamePk) return null;
    try {
      const f = await (await fetch(`${API}/v1.1/game/${this.gamePk}/feed/live?fields=gameData,teams,home,away,id,liveData,linescore,inningHalf,inningState,defense,offense,pitcher,batter,fullName,boxscore,team,teamStats,pitching,strikeOuts`)).json();
      const home = f.gameData?.teams?.home?.id, usHome = home === this.mlbId;
      const box = f.liveData?.boxscore?.teams ?? {};
      const ks = Number((usHome ? box.home : box.away)?.teamStats?.pitching?.strikeOuts ?? 0) || 0;
      const half = f.liveData?.linescore?.inningHalf as string | undefined;
      const usPitching = usHome ? half === "Top" : half === "Bottom";
      const p = f.liveData?.linescore?.defense?.pitcher ?? {};
      // Between half innings the offense block already names the next team's leadoff man, so only count a live half.
      const state = f.liveData?.linescore?.inningState as string | undefined;
      const usBatting = (state === "Top" || state === "Bottom") && (usHome ? half === "Bottom" : half === "Top");
      const b = f.liveData?.linescore?.offense?.batter ?? {};
      this.last = { gamePk: this.gamePk, ks, pitcherId: Number(p.id) || 0, pitcherName: String(p.fullName ?? ""), usPitching, usBatting, batterId: Number(b.id) || 0, batterName: String(b.fullName ?? ""), at: Date.now() };
      this.onUpdate(this.last);
      return this.last;
    } catch { return null; }
  }

  /** Polls faster while walk-up songs are on, so the song lands as the hitter walks up. */
  fast = false;
  run(live: () => boolean) {
    clearTimeout(this.timer);
    const tick = async () => { if (live()) await this.poll(); this.timer = window.setTimeout(tick, live() ? (this.fast ? 7000 : 15000) : 60000); };
    void tick();
  }
}

/** The Padres closer, per MLB.com (Mar 29, 2026): Mason Miller, MLBAM id 695243, enters to Korn's "Blind". */
export const PADRES_CLOSER = { id: 695243, name: "Mason Miller", nickname: "The Reaper" };
