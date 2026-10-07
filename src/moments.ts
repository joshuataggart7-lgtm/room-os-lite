/** What each moment looks and sounds like, per team pack. */
import type { MomentKind } from "./espn";
import { SPORT, type Team } from "./teams";

export interface Cue { s: string; at?: number; gain?: number; duck?: boolean; pan?: number }
export interface Moment { title: string; sub?: string; cues: Cue[]; fireworks?: number; celebrate?: number; flash?: boolean; small?: boolean; quiet?: boolean }

const is = (t: Team) => ({ P: t.set === "padres", S: t.set === "saints", M: t.set === "olemiss", B: t.set === "msu", R: t.set === "trashpandas", K: t.set === "sky" });

export function chantFor(t: Team): Cue[] {
  const { P, S, M, B } = is(t);
  if (P) return [{ s: "chant_lets_go_padres" }];
  if (S) return [{ s: "pa_no_who_dat", duck: true }, { s: "chant_whodat", at: 2.4 }];
  if (M) return [{ s: "pa_miss_are_you_ready", duck: true }, { s: "chant_hotty_toddy_reply", at: 1.0 }];
  if (B) return [{ s: "sfx_cowbells" }, { s: "sfx_roar_football", at: 0.5, gain: 0.5 }];
  const sp = SPORT[t.league];
  return sp === "baseball" ? [{ s: "sfx_organ_lets_go" }] : sp === "basketball" ? [{ s: "chant_defense" }] : [{ s: "chant_defense" }];
}

export function welcomeFor(t: Team): Cue[] {
  const { P, S, M } = is(t);
  if (P) return [{ s: "pa_sd_welcome", duck: true }];
  if (S) return [{ s: "pa_no_welcome", duck: true }];
  if (M) return [{ s: "pa_miss_welcome", duck: true }];
  return [{ s: "pa_welcome", duck: true }];
}

export function vendorsFor(t: Team): string[] {
  const sp = SPORT[t.league];
  return sp === "baseball" ? ["vend_peanuts", "vend_cracker_jack", "vend_hotdogs", "vend_water"] : sp === "basketball" ? ["vend_water", "vend_hotdogs"] : ["vend_beer", "vend_hotdogs", "vend_water"];
}

export function moment(t: Team, k: MomentKind): Moment {
  const sp = SPORT[t.league];
  const roar = sp === "baseball" ? "sfx_roar_baseball" : sp === "basketball" ? "sfx_roar_basketball" : "sfx_roar_football";
  const { P, S, M, B, R, K } = is(t);
  switch (k) {
    case "hr": return P
      ? { title: "HOME RUN", sub: "Light it up, Friars", flash: true, fireworks: 9, celebrate: 14, cues: [{ s: "sfx_ships_whistle" }, { s: roar, at: 0.3 }, { s: "pa_sd_home_run", at: 2.6, duck: true }, { s: "sfx_fireworks", at: 3.4, gain: 0.8 }, { s: "sfx_roar_huge", at: 5, gain: 0.6 }] }
      : { title: "HOME RUN", sub: R ? "Trash Pandas go deep" : t.name, flash: true, fireworks: 7, celebrate: 12, cues: [{ s: roar }, { s: "pa_home_run", at: 1.2, duck: true }, { s: "sfx_fireworks", at: 2.2, gain: 0.8 }, ...(R ? [{ s: "sfx_organ_charge", at: 5 }] : [])] };
    case "run": return { title: "RUN SCORES", sub: t.name, flash: true, cues: [{ s: roar }, { s: "sfx_organ_charge", at: 2.2, gain: 0.8 }] };
    case "td": return {
      title: "TOUCHDOWN", sub: B ? "Ring your cowbell" : t.name, flash: true, fireworks: 8, celebrate: 14,
      cues: S ? [{ s: roar }, { s: "pa_no_touchdown", at: 0.8, duck: true }, { s: "sfx_roar_huge", at: 2.5, gain: 0.6 }, { s: "pa_no_who_dat", at: 6.5, duck: true }, { s: "chant_whodat", at: 8.9 }]
        : M ? [{ s: roar }, { s: "pa_miss_touchdown", at: 0.8, duck: true }, { s: "sfx_brass_fanfare", at: 2.8, gain: 0.8 }, { s: "pa_miss_are_you_ready", at: 7.4, duck: true }, { s: "chant_hotty_toddy_reply", at: 8.4 }]
        : B ? [{ s: "sfx_cowbells" }, { s: roar, at: 0.2 }, { s: "pa_touchdown", at: 1.0, duck: true }, { s: "sfx_brass_fanfare", at: 3, gain: 0.7 }, { s: "sfx_cowbells", at: 6.5, gain: 0.9 }]
        : [{ s: roar }, { s: "pa_touchdown", at: 0.8, duck: true }, { s: "sfx_roar_huge", at: 2.5, gain: 0.6 }],
    };
    case "fg": return { title: "IT'S GOOD", sub: "Three points", flash: true, cues: [{ s: roar }, { s: S ? "pa_no_field_goal" : M ? "pa_miss_field_goal" : "pa_field_goal", at: 0.6, duck: true }, ...(B ? [{ s: "sfx_cowbells", at: 2.5, gain: 0.8 }] : [])] };
    case "score": return { title: "POINTS ON THE BOARD", sub: t.name, cues: [{ s: roar, gain: 0.8 }, ...(B ? [{ s: "sfx_cowbell_single" }] : [])] };
    case "three": return { title: "THREE", sub: K ? "Sky from deep" : t.name, flash: true, cues: [{ s: roar }, { s: "sfx_goal_horn", at: 0.2, gain: 0.5 }] };
    case "bucket": return { title: "", quiet: true, cues: [{ s: roar, gain: 0.35 }] };
    case "opp": return { title: "", small: true, cues: [{ s: "sfx_tension_murmur", gain: 0.7 }] };
    case "win": return {
      title: `${t.name.toUpperCase()} WIN`, sub: B ? "Hail State" : "Ballgame", flash: true, fireworks: 20, celebrate: 30,
      cues: [{ s: "sfx_roar_huge" }, { s: P ? "pa_sd_win" : S ? "pa_no_win" : M ? "pa_miss_win" : "pa_win", at: 1.5, duck: true }, { s: "sfx_fireworks", at: 4, gain: 0.8 }, ...(P ? [{ s: "sfx_ships_whistle", at: 6 }] : []), ...(B ? [{ s: "sfx_cowbells", at: 3 }, { s: "sfx_cowbells", at: 9 }] : [])],
    };
    case "start": return { title: sp === "baseball" ? "PLAY BALL" : sp === "basketball" ? "TIP OFF" : "KICKOFF", sub: t.fullName, cues: [{ s: P ? "pa_sd_cinematic_intro" : S ? "pa_no_cinematic_intro" : sp === "baseball" ? "pa_play_ball" : sp === "basketball" ? "pa_tip_off" : "pa_kickoff", duck: true }, ...(B ? [{ s: "sfx_cowbells", at: 2.5 }] : [{ s: "sfx_crowd_build", at: 2, gain: 0.7 }])] };
    case "strikeout": return { title: "STRIKEOUT", sub: "Sit down", cues: [{ s: roar, gain: 0.7 }, ...(P ? [{ s: "pa_sd_strikeout", at: 0.4, duck: true }] : [])] };
    case "chant": return { title: P ? "LET'S GO PADRES" : S ? "WHO DAT" : M ? "HOTTY TODDY" : B ? "RING YOUR COWBELL" : sp === "baseball" ? "LET'S GO" : "DEFENSE", small: true, cues: chantFor(t) };
    case "cowbell": return { title: "RING YOUR COWBELL", small: true, cues: [{ s: "sfx_cowbells" }] };
    case "horn": return { title: P ? "SHIP'S WHISTLE" : B ? "COWBELLS" : "", small: true, cues: B ? [{ s: "sfx_cowbells" }] : [{ s: P ? "sfx_ships_whistle" : "sfx_goal_horn" }, { s: roar, at: 1, gain: 0.6 }] };
    case "defense": return { title: "DEFENSE", sub: "Make some noise", small: true, cues: [{ s: S ? "pa_no_defense" : M ? "pa_miss_defense" : "pa_make_noise", duck: true }, { s: B ? "sfx_cowbells" : "chant_defense", at: 2.4 }] };
    case "noise": return { title: "MAKE SOME NOISE", small: true, cues: [{ s: "pa_lets_get_loud", duck: true }, { s: "sfx_crowd_build", at: 1.4 }, { s: "sfx_roar_huge", at: 8.5, gain: 0.6 }] };
    case "fireworks": return { title: "", fireworks: 14, celebrate: 16, cues: [{ s: "sfx_fireworks" }, { s: "sfx_fireworks", at: 5, gain: 0.8 }, { s: roar, at: 1, gain: 0.5 }] };
    case "intro": return { title: t.name.toUpperCase(), sub: t.venue, cues: P ? [{ s: "pa_sd_cinematic_intro", duck: true }] : S ? [{ s: "pa_no_cinematic_intro", duck: true }] : [{ s: "sfx_drumline" }, ...welcomeFor(t).map((c) => ({ ...c, at: 3 }))] };
  }
}

export const demoKind = (t: Team): MomentKind => (SPORT[t.league] === "baseball" ? "hr" : SPORT[t.league] === "basketball" ? "three" : "td");

export function remoteButtons(t: Team): { k: MomentKind; label: string; big?: boolean }[] {
  const sp = SPORT[t.league];
  const { P, S, M, B } = is(t);
  if (sp === "baseball") return [{ k: "hr", label: "Home run", big: true }, { k: "run", label: "Run scores" }, { k: "chant", label: P ? "Let's go Padres" : "Organ rally" }, { k: "horn", label: P ? "Ship's whistle" : "Horn" }, { k: "strikeout", label: "Strikeout" }, { k: "noise", label: "Make noise" }, { k: "fireworks", label: "Fireworks" }, { k: "win", label: "We win" }];
  if (sp === "basketball") return [{ k: "three", label: "Three", big: true }, { k: "bucket", label: "Bucket" }, { k: "chant", label: "Defense chant" }, { k: "horn", label: "Horn" }, { k: "noise", label: "Make noise" }, { k: "fireworks", label: "Fireworks" }, { k: "win", label: "We win" }];
  return [{ k: "td", label: "Touchdown", big: true }, { k: "fg", label: "Field goal" }, { k: "chant", label: S ? "Who Dat" : M ? "Hotty Toddy" : B ? "Cowbells" : "Defense chant" }, { k: "defense", label: "Defense" }, { k: "horn", label: B ? "More cowbell" : "Horn" }, { k: "noise", label: "Make noise" }, { k: "fireworks", label: "Fireworks" }, { k: "win", label: "We win" }];
}
