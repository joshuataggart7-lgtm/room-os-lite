/**
 * Walk-up songs (Padres): opt-in and off by default. Pick hitters; when MLB's live data shows one of them at the
 * plate, the screen shows a NOW BATTING lower third and plays a short clip of his walk-up song on Spotify.
 * Pre-filled songs come only from the official Padres walk-up page (mlb.com/padres/ballpark/music, checked
 * Oct 7, 2026), and every Spotify ID was checked against open.spotify.com. Anyone else can get a pasted Spotify link.
 */
import { h } from "./dom";
import type { Track } from "./spotify";

export interface Hitter { id: number; name: string; num: string; pos: string }
export interface Walkups { on: boolean; picks: Record<string, { uri?: string; title?: string; artist?: string }> }

export const OFFICIAL_SOURCE = "mlb.com/padres/ballpark/music";
/** MLBAM id -> official walk-up song with its Spotify track (from the official page's own Spotify links). */
export const OFFICIAL: Record<number, Track> = {
  592518: { uri: "spotify:track:6Ab2trdJulkRRhaJ9zVGQa", title: "Dichavate", artist: "Ya Ice Dilan, Rey Tony, Helabusador, JipMusic Global" },
  701538: { uri: "spotify:track:5M2KX4eOJLWlPdjV1UPwzS", title: "Like That", artist: "Future, Metro Boomin" },
  665487: { uri: "spotify:track:6b70qcaryJFejODMi3VRl1", title: "Acábame De Matar", artist: "Banda El Recodo" },
  593428: { uri: "spotify:track:7koAf6aZgjO6TS7bipfPD0", title: "YO y TÚ", artist: "Ovy On The Drums, Quevedo, Beéle" },
  669720: { uri: "spotify:track:6ye2zG3DhdwDf6VRVyj4jx", title: "Hard Fought Hallelujah", artist: "Brandon Lake" },
  687957: { uri: "spotify:track:5zJWS7vCcEKAEAk1mBH8PC", title: "Never Hating (feat. Young Thug)", artist: "Lil Baby" },
  806956: { uri: "spotify:track:0zIZos26a6OXHhrfqJfGsD", title: "National Treasures", artist: "Drake" },
  666023: { uri: "spotify:track:4v5cfOtYqnTYN8CagF9tHc", title: "Leo Leo (Remix)", artist: "Bulin 47, Afriken An, Breyco En Producidera" },
  657757: { uri: "spotify:track:1AuNDsNLc7b3tApnlyaGdy", title: "Grave Robber", artist: "Crowder" },
  687749: { uri: "spotify:track:2ggP6WjaTsloaiBxXY5JB7", title: "God I'm Just Grateful", artist: "Elevation Worship, Chandler Moore" },
  669134: { uri: "spotify:track:3dwhsbdb2ZlzLYEcFJ9n9H", title: "wgft (feat. Burna Boy)", artist: "Gunna" },
  609280: { uri: "spotify:track:14lNfanueCRwwxfo6oT2tQ", title: "Amayette", artist: "Roberto Palmero" },
  669392: { uri: "spotify:track:6c20grUPNdmGcCHtMvnDcd", title: "Rich As Hell", artist: "YoungBoy Never Broke Again" },
  664034: { uri: "spotify:track:34d1FpzE7sxdr5jbVrVoyh", title: "Good Life", artist: "Kanye West" },
};

const KEY = "lite.walkups";
export function loadWalkups(): Walkups {
  try { const x = JSON.parse(localStorage.getItem(KEY) ?? ""); if (x && typeof x === "object") return { on: !!x.on, picks: x.picks ?? {} }; } catch { /* */ }
  return { on: false, picks: {} };
}
export function saveWalkups(w: Walkups) { localStorage.setItem(KEY, JSON.stringify(w)); }

/** The song for a picked hitter: his own pasted link first, then the official one. */
export function songFor(w: Walkups, id: number): Track | null {
  const p = w.picks[String(id)];
  if (!p) return null;
  if (p.uri) return { uri: p.uri, title: p.title || "Walk-up song", artist: p.artist || "" };
  return OFFICIAL[id] ?? null;
}

let rosterCache: Promise<Hitter[]> | null = null;
/** Active-roster position players from MLB's free Stats API (CORS open). */
export function hitters(mlbId: number): Promise<Hitter[]> {
  rosterCache ??= fetch(`https://statsapi.mlb.com/api/v1/teams/${mlbId}/roster?rosterType=active`).then((r) => r.json()).then((d) =>
    ((d.roster ?? []) as any[]).filter((p) => p.position?.type !== "Pitcher" || p.position?.abbreviation === "TWP")
      .map((p) => ({ id: p.person.id, name: p.person.fullName, num: p.jerseyNumber ?? "", pos: p.position?.abbreviation ?? "" }))
      .sort((a, b) => a.name.split(" ").slice(-1)[0].localeCompare(b.name.split(" ").slice(-1)[0]))).catch(() => { rosterCache = null; return []; });
  return rosterCache;
}

const trackId = (s: string) => s.match(/(?:track[/:])([A-Za-z0-9]{22})/)?.[1];

/** The picker, used on the big screen and on the phone remote. */
export function walkupPanel(mlbId: number, w: Walkups, onChange: (w: Walkups) => void, onTest?: (x: Hitter) => void): HTMLElement {
  const box = h("div.walkups");
  const list = h("div.wu-list", {}, h("p.muted", {}, "Loading the Padres roster..."));
  const draw = (all: Hitter[]) => {
    if (!all.length) { list.replaceChildren(h("p.muted", {}, "Couldn't load the roster right now. Try again in a minute.")); return; }
    list.replaceChildren(...all.map((x) => {
      const pick = w.picks[String(x.id)], song = songFor({ ...w, picks: { ...w.picks, [x.id]: pick ?? {} } }, x.id);
      const cb = h("input", { type: "checkbox", checked: !!pick, "aria-label": `Walk-up song for ${x.name}` }) as HTMLInputElement;
      cb.onchange = () => { const picks = { ...w.picks }; if (cb.checked) picks[x.id] = picks[x.id] ?? {}; else delete picks[x.id]; w = { ...w, picks }; onChange(w); draw(all); };
      const paste = h("input.wu-paste", { type: "url", placeholder: "Paste a Spotify song link", value: pick?.uri ? `https://open.spotify.com/track/${pick.uri.split(":").pop()}` : "" }) as HTMLInputElement;
      paste.onchange = () => {
        const id = trackId(paste.value); const picks = { ...w.picks };
        picks[x.id] = id ? { uri: `spotify:track:${id}`, title: "Your pick", artist: "" } : {};
        w = { ...w, picks }; onChange(w); draw(all);
      };
      return h(`div.wu-row${pick ? ".on" : ""}`, {},
        h("label.wu-who", {}, cb, h("b", {}, `#${x.num} ${x.name}`), h("span", {}, x.pos)),
        h("div.wu-song", {}, song ? h("span", {}, `${song.title}${song.artist ? ` · ${song.artist}` : ""}`, OFFICIAL[x.id] && !pick?.uri ? h("em", {}, " official") : null) : h("span.muted", {}, "No verified song yet"),
          pick && onTest ? h("button.wu-test", { onclick: () => onTest(x) }, "Test") : null),
        pick && !OFFICIAL[x.id] || pick?.uri ? paste : null);
    }));
  };
  const toggle = h(`button.dock-btn${w.on ? ".on" : ""}`, {
    onclick: () => { w = { ...w, on: !w.on }; onChange(w); toggle.classList.toggle("on", w.on); toggle.textContent = w.on ? "Walk-up songs on" : "Walk-up songs off"; },
  }, w.on ? "Walk-up songs on" : "Walk-up songs off");
  box.append(
    h("div.mc-row", {}, toggle),
    h("p.muted", {}, `Pick your hitters. When one comes up to bat, the screen shows NOW BATTING and plays about 15 seconds of his walk-up song on Spotify. Songs marked official come from the Padres' walk-up page (${OFFICIAL_SOURCE}).`),
    list);
  void hitters(mlbId).then(draw);
  return box;
}
