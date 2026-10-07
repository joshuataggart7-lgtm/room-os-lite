/** Teams: hand-built packs plus any MLB, NFL, FBS or WNBA team from ESPN's public team list. */
export type League = "mlb" | "nfl" | "ncaaf" | "wnba" | "milb";
export type Sport = "baseball" | "football" | "basketball";
export type SetId = "padres" | "saints" | "olemiss" | "msu" | "trashpandas" | "sky" | "mlb" | "nfl" | "ncaaf" | "wnba";

export interface Team {
  key: string; league: League; espnId: string; abbr: string; name: string; fullName: string;
  color: string; alt: string; logo: string; set: SetId; venue: string; pack: boolean; tag?: string;
}

export const SPORT: Record<League, Sport> = { mlb: "baseball", nfl: "football", ncaaf: "football", wnba: "basketball", milb: "baseball" };
export const PATH: Record<League, string> = { mlb: "baseball/mlb", nfl: "football/nfl", ncaaf: "football/college-football", wnba: "basketball/wnba", milb: "" };
export const LEAGUE_NAME: Record<League, string> = { mlb: "MLB", nfl: "NFL", ncaaf: "College", wnba: "WNBA", milb: "MiLB" };

export const PACKS: Team[] = [
  { key: "msu", league: "ncaaf", espnId: "344", abbr: "MSST", name: "Bulldogs", fullName: "Mississippi State", color: "#5d1725", alt: "#c1c6c8",
    logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/344.png", set: "msu", venue: "Huntsville to Davis Wade Stadium", pack: true, tag: "Full game day" },
  { key: "rc", league: "milb", espnId: "559", abbr: "RC", name: "Trash Pandas", fullName: "Rocket City Trash Pandas", color: "#0b2e4f", alt: "#e2b13c",
    logo: "https://www.mlbstatic.com/team-logos/559.svg", set: "trashpandas", venue: "Toyota Field, Madison AL", pack: true, tag: "Double-A" },
  { key: "sky", league: "wnba", espnId: "19", abbr: "CHI", name: "Sky", fullName: "Chicago Sky", color: "#418fde", alt: "#ffcd00",
    logo: "https://a.espncdn.com/i/teamlogos/wnba/500/chi.png", set: "sky", venue: "Sky home game", pack: true, tag: "WNBA" },
  { key: "sd", league: "mlb", espnId: "25", abbr: "SD", name: "Padres", fullName: "San Diego Padres", color: "#2f241d", alt: "#ffc425",
    logo: "https://a.espncdn.com/i/teamlogos/mlb/500/sd.png", set: "padres", venue: "Petco Park, behind the plate", pack: true },
  { key: "no", league: "nfl", espnId: "18", abbr: "NO", name: "Saints", fullName: "New Orleans Saints", color: "#101820", alt: "#d3bc8d",
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/no.png", set: "saints", venue: "The Superdome", pack: true },
  { key: "miss", league: "ncaaf", espnId: "145", abbr: "MISS", name: "Ole Miss", fullName: "Ole Miss Rebels", color: "#13294b", alt: "#ce1126",
    logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/145.png", set: "olemiss", venue: "The Grove and Vaught-Hemingway", pack: true },
];

const hex = (c?: string, d = "#333333") => (c && /^[0-9a-f]{6}$/i.test(c) ? `#${c}` : d);
interface EspnTeam { id: string; abbreviation: string; displayName: string; shortDisplayName?: string; name?: string; color?: string; alternateColor?: string; logos?: { href: string }[] }

export function fromEspn(league: League, t: EspnTeam): Team {
  const pack = PACKS.find((p) => p.league === league && p.espnId === String(t.id));
  if (pack) return pack;
  return {
    key: `${league}:${t.id}`, league, espnId: String(t.id), abbr: t.abbreviation, name: league === "ncaaf" ? (t.shortDisplayName || t.displayName) : (t.name || t.shortDisplayName || t.displayName),
    fullName: t.displayName, color: hex(t.color), alt: hex(t.alternateColor, "#ffffff"), logo: t.logos?.[0]?.href ?? "",
    set: league === "milb" ? "mlb" : league, venue: { mlb: "Ballpark night", nfl: "Stadium night", ncaaf: "College game day", wnba: "Arena night", milb: "Ballpark night" }[league], pack: false,
  };
}

const listCache: Partial<Record<League, Promise<Team[]>>> = {};
export function teamList(league: League): Promise<Team[]> {
  const q = league === "ncaaf" ? "?groups=80&limit=400" : "?limit=100";
  listCache[league] ??= fetch(`https://site.api.espn.com/apis/site/v2/sports/${PATH[league]}/teams${q}`)
    .then((r) => r.json())
    .then((d) => ((d.sports?.[0]?.leagues?.[0]?.teams ?? []) as { team: EspnTeam }[]).map((x) => fromEspn(league, x.team)).sort((a, b) => a.fullName.localeCompare(b.fullName)))
    .catch((e) => { delete listCache[league]; throw e; });
  return listCache[league]!;
}

export async function resolveTeam(key: string | null): Promise<Team | null> {
  if (!key) return null;
  const pack = PACKS.find((p) => p.key === key.toLowerCase());
  if (pack) return pack;
  const m = /^(mlb|nfl|ncaaf|wnba):(\d+)$/.exec(key);
  if (!m) return null;
  const league = m[1] as League;
  try {
    const d = await (await fetch(`https://site.api.espn.com/apis/site/v2/sports/${PATH[league]}/teams/${m[2]}`)).json();
    return d.team ? fromEspn(league, d.team) : null;
  } catch { return null; }
}
