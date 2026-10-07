/**
 * The game day journey: the scenes a team pack walks through, each with a chapter card, a time-of-day
 * look and a sound bed. Mississippi State gets the full day from Huntsville; other packs start at the tailgate.
 */
import { SPORT, type Team } from "./teams";

export type Scene = "morning" | "drive" | "tailgate" | "walkIn" | "seats" | "game" | "postgame";
export type Outcome = "win" | "loss" | "over" | undefined;
export type Tod = "dawn" | "day" | "afternoon" | "dusk" | "night";
export interface Chapter { id: Scene; label: string; kicker: string; title: string; sub: string; tod: Tod; bed: string; enter?: { s: string; at?: number; gain?: number; duck?: boolean }[] }

export const LABEL: Record<Scene, string> = { morning: "Morning", drive: "The drive", tailgate: "Tailgate", walkIn: "Walk in", seats: "Behind the plate", game: "In the stands", postgame: "Postgame" };

export function chapters(t: Team, kickoff?: string, outcome?: Outcome, elim = false): Chapter[] {
  const sp = SPORT[t.league];
  const k = kickoff ? new Date(kickoff) : null;
  const nightGame = !k || k.getHours() >= 17;
  const bedGame = t.set === "saints" ? "stands_bed_dome" : sp === "baseball" ? "stands_bed_ballpark" : sp === "basketball" ? "sfx_bed_arena" : "stands_bed_football";
  if (t.set === "padres") {
    const night = nightGame;
    const post: Chapter = outcome === "over"
      ? { id: "postgame", label: "Postgame", kicker: "Thank you, San Diego", title: "Season's over", sub: "Thank you, Padres. See you at Petco in the spring.", tod: "night", bed: "stands_bed_concourse", enter: [{ s: "sfx_crowd_applause", at: 0.5, gain: 0.8 }, { s: "pa_sd_thank_you", at: 4, duck: true }] }
      : outcome === "loss"
        ? { id: "postgame", label: "Postgame", kicker: "Petco Park", title: "Tough one tonight", sub: "Shake it off. On to the next one.", tod: "night", bed: "stands_bed_concourse", enter: [{ s: "sfx_crowd_applause", at: 0.5, gain: 0.6 }] }
        : { id: "postgame", label: "Postgame", kicker: "Petco Park", title: outcome === "win" ? "Padres win" : "Postgame", sub: outcome === "win" ? "Fireworks over the Western Metal building. Ring the ship's whistle." : "Fireworks and the walk out to the Gaslamp.", tod: "night", bed: "stands_bed_ballpark" };
    return [
      { id: "morning", label: "Morning", kicker: "San Diego, CA", title: "Morning in San Diego", sub: elim ? "Sun on the bay. Brown and gold on. Win or go home tonight." : "Sun on the bay. Brown and gold on. Game day.", tod: "day", bed: "sfx_morning" },
      { id: "tailgate", label: "Park at the Park", kicker: "Gaslamp and Petco Park", title: "Pregame in the Gaslamp", sub: "Park at the Park is filling up. Fish tacos, cold drinks, brown and gold everywhere.", tod: "afternoon", bed: "stands_bed_concourse", enter: [{ s: "chant_lets_go_padres", at: 6, gain: 0.45 }] },
      { id: "walkIn", label: "Walk in", kicker: "Petco Park", title: "The walk in", sub: "Through the gates, past the Western Metal building. Find your seats.", tod: "dusk", bed: "stands_bed_concourse", enter: [{ s: "pa_find_seats_first_pitch", at: 2, duck: true }] },
      { id: "seats", label: "Behind the plate", kicker: "Petco Park, behind home plate", title: "In the stands", sub: elim ? "Lights on. Downtown glowing past the outfield. Win or go home." : "Lights on. Downtown glowing past the outfield.", tod: "night", bed: "stands_bed_ballpark", enter: [{ s: "pa_sd_welcome", at: 1.5, duck: true }, ...(elim ? [{ s: "pa_sd_win_or_go_home", at: 7, duck: true }] : [])] },
      { id: "game", label: "The game", kicker: "Petco Park", title: "Play ball", sub: elim ? "Win or go home. Every pitch." : "Let's go Padres.", tod: night ? "night" : "day", bed: "stands_bed_ballpark", enter: [{ s: "chant_lets_go_padres", at: 1, gain: 0.8 }] },
      post,
    ];
  }
  if (t.set === "msu") return [
    { id: "morning", label: "Morning", kicker: "Huntsville, AL", title: "Wake up in Huntsville", sub: "Coffee on. Maroon on. Starkville is calling.", tod: "dawn", bed: "sfx_morning" },
    { id: "drive", label: "The drive", kicker: "Headed to Starkville", title: "Road trip", sub: "Windows down, radio up, maroon flags on the highway.", tod: "day", bed: "bed_road", enter: [{ s: "radio_hype", at: 3, gain: 0.9 }] },
    { id: "tailgate", label: "The Junction", kicker: "Mississippi State", title: "Tailgating at the Junction", sub: "Tents up. Grills going. Cowbells ringing.", tod: "afternoon", bed: "sfx_grove_tailgate", enter: [{ s: "sfx_cowbell_single", at: 2, gain: 0.6 }] },
    { id: "walkIn", label: "Walk in", kicker: "Davis Wade Stadium", title: "Filling Davis Wade", sub: "Find your seats. Kickoff is minutes away.", tod: "dusk", bed: "stands_bed_concourse", enter: [{ s: "pa_find_seats_kickoff", at: 2, duck: true }] },
    { id: "game", label: "In the stands", kicker: "Davis Wade Stadium", title: "Game on", sub: "Ring 'em on every score.", tod: nightGame ? "night" : "day", bed: bedGame, enter: [{ s: "sfx_cowbells", at: 0.5, gain: 0.7 }] },
    { id: "postgame", label: "Postgame", kicker: "Starkville to Huntsville", title: "The ride home", sub: "Win or lose, the cowbell rides shotgun.", tod: "night", bed: "bed_road" },
  ];
  const tg = t.set === "saints" ? "stands_bed_second_line" : t.set === "olemiss" || t.set === "ncaaf" ? "stands_bed_grove" : sp === "baseball" ? "stands_bed_ballpark" : "stands_bed_concourse";
  const place = t.venue;
  return [
    { id: "tailgate", label: sp === "basketball" ? "Pregame" : "Tailgate", kicker: place, title: sp === "basketball" ? "Pregame" : "Tailgate", sub: "Hours to go. Food on, music up.", tod: "afternoon", bed: tg },
    { id: "walkIn", label: "Walk in", kicker: place, title: "Walk in", sub: "Find your seats. The place is filling up.", tod: "dusk", bed: "stands_bed_concourse", enter: [{ s: sp === "baseball" ? "pa_find_seats_first_pitch" : "pa_find_seats_kickoff", at: 2, duck: true }].filter(() => sp !== "basketball") },
    { id: "game", label: "In the stands", kicker: place, title: "Game on", sub: t.fullName, tod: nightGame ? "night" : "day", bed: bedGame },
    { id: "postgame", label: "Postgame", kicker: place, title: "Postgame", sub: "Fireworks and the walk out.", tod: "night", bed: bedGame },
  ];
}

/** Which chapter a real game puts you in, by minutes until kickoff. */
export function sceneFor(t: Team, state: "pre" | "in" | "post", minsToStart: number): Scene {
  if (state === "in") return "game";
  if (state === "post") return "postgame";
  if (t.set === "padres") return minsToStart > 360 ? "morning" : minsToStart > 120 ? "tailgate" : minsToStart > 40 ? "walkIn" : "seats";
  if (t.set === "msu") return minsToStart > 390 ? "morning" : minsToStart > 210 ? "drive" : minsToStart > 45 ? "tailgate" : "walkIn";
  return minsToStart > 75 ? "tailgate" : "walkIn";
}
