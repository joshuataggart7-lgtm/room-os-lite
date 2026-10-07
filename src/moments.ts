/** What each moment looks and sounds like, per team pack. */
import type { MomentKind } from "./espn";
import { SPORT, type Team } from "./teams";
import { TRACKS, type Track } from "./spotify";

export interface Cue { s: string; at?: number; gain?: number; duck?: boolean; pan?: number; local?: boolean }
export interface Moment { title: string; sub?: string; cues: Cue[]; fireworks?: number; celebrate?: number; flash?: boolean; small?: boolean; quiet?: boolean; music?: Track; musicSecs?: number; hold?: number }

const is = (t: Team) => ({ P: t.set === "padres", S: t.set === "saints", M: t.set === "olemiss", B: t.set === "msu", R: t.set === "trashpandas", K: t.set === "sky" });

export function chantFor(t: Team): Cue[] {
  const { P, S, M, B } = is(t);
  if (P) return [{ s: "chant_lets_go_padres" }, { s: "sfx_organ_lets_go", at: 9, gain: 0.5 }];
  if (S) return [{ s: "pa_no_who_dat", duck: true }, { s: "chant_whodat", at: 2.4 }];
  if (M) return [{ s: "pa_miss_are_you_ready", duck: true }, { s: "chant_hotty_toddy_reply", at: 1.0 }];
  if (B) return [{ s: "chant_hail_state" }, { s: "sfx_cowbells", at: 0.3, gain: 0.6 }];
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
      ? { title: "HOME RUN", sub: "Light it up, Friars", flash: true, fireworks: 9, celebrate: 14, music: TRACKS.sevenNation, musicSecs: 28, cues: [{ s: "sfx_ships_whistle" }, { s: "sfx_crowd_hr", at: 0.2 }, { s: roar, at: 0.4, gain: 0.6 }, { s: "pa_sd_home_run", at: 2.8, duck: true }, { s: "sfx_fireworks", at: 4, gain: 0.8 }, { s: "chant_lets_go_padres", at: 9, gain: 0.7 }] }
      : { title: "HOME RUN", sub: R ? "Trash Pandas go deep" : t.name, flash: true, fireworks: 7, celebrate: 12, cues: [{ s: "sfx_crowd_hr" }, { s: roar, gain: 0.6 }, { s: "pa_home_run", at: 1.4, duck: true }, { s: "sfx_fireworks", at: 2.4, gain: 0.8 }, ...(R ? [{ s: "sfx_organ_charge", at: 5 }] : [])] };
    case "run": return { title: "RUN SCORES", sub: t.name, flash: true, cues: [{ s: roar }, { s: "sfx_organ_charge", at: 2.2, gain: 0.8 }] };
    case "td": return {
      title: "TOUCHDOWN", sub: B ? "Ring your cowbell" : t.name, flash: true, fireworks: 8, celebrate: 14, music: B ? TRACKS.hailState : S ? TRACKS.halftime : undefined, musicSecs: 35,
      cues: S ? [{ s: "sfx_crowd_td" }, { s: roar, gain: 0.5 }, { s: "pa_no_touchdown", at: 0.8, duck: true }, { s: "pa_no_who_dat", at: 6.5, duck: true }, { s: "chant_whodat", at: 8.6 }]
        : M ? [{ s: roar }, { s: "pa_miss_touchdown", at: 0.8, duck: true }, { s: "sfx_brass_fanfare", at: 2.8, gain: 0.8 }, { s: "pa_miss_are_you_ready", at: 7.4, duck: true }, { s: "chant_hotty_toddy_reply", at: 8.4 }]
        : B ? [{ s: "sfx_cowbells" }, { s: "sfx_crowd_td", at: 0.2 }, { s: "pa_msu_touchdown", at: 1.0, duck: true }, { s: "chant_hail_state", at: 5.5 }, { s: "sfx_cowbells", at: 6.5, gain: 0.8 }]
        : [{ s: "sfx_crowd_td" }, { s: roar, gain: 0.5 }, { s: "pa_touchdown", at: 0.8, duck: true }],
    };
    case "fg": return { title: "IT'S GOOD", sub: "Three points", flash: true, cues: [{ s: roar }, { s: S ? "pa_no_field_goal" : M ? "pa_miss_field_goal" : "pa_field_goal", at: 0.6, duck: true }, ...(B ? [{ s: "sfx_cowbells", at: 2.5, gain: 0.8 }] : [])] };
    case "score": return { title: "POINTS ON THE BOARD", sub: t.name, cues: [{ s: roar, gain: 0.8 }, ...(B ? [{ s: "sfx_cowbell_single" }] : [])] };
    case "three": return { title: "THREE", sub: K ? "Sky from deep" : t.name, flash: true, cues: [{ s: "sfx_crowd_three" }, { s: roar, gain: 0.5 }, { s: "sfx_goal_horn", at: 0.2, gain: 0.5 }] };
    case "bucket": return { title: "", quiet: true, cues: [{ s: roar, gain: 0.35 }] };
    case "opp": return { title: "", small: true, cues: [{ s: "sfx_tension_murmur", gain: 0.7 }] };
    case "win": return {
      title: `${t.name.toUpperCase()} WIN`, sub: B ? "Hail State" : "Ballgame", flash: true, fireworks: 20, celebrate: 30, music: B ? TRACKS.hailState : S ? TRACKS.halftime : undefined, musicSecs: 50,
      cues: [{ s: "sfx_roar_huge" }, { s: sp === "baseball" ? "sfx_crowd_win" : sp === "basketball" ? "sfx_crowd_three" : "sfx_crowd_td", at: 0.3 }, { s: P ? "pa_sd_win" : S ? "pa_no_win" : M ? "pa_miss_win" : "pa_win", at: 1.5, duck: true }, { s: "sfx_fireworks", at: 4, gain: 0.8 }, ...(P ? [{ s: "sfx_ships_whistle", at: 6 }] : []), ...(B ? [{ s: "sfx_cowbells", at: 3 }, { s: "sfx_cowbells", at: 9 }] : [])],
    };
    case "start": return { title: sp === "baseball" ? "PLAY BALL" : sp === "basketball" ? "TIP OFF" : "KICKOFF", sub: t.fullName, cues: [{ s: P ? "pa_play_ball" : S ? "pa_no_cinematic_intro" : sp === "baseball" ? "pa_play_ball" : sp === "basketball" ? "pa_tip_off" : "pa_kickoff", duck: true }, ...(B ? [{ s: "sfx_cowbells", at: 2.5 }] : [{ s: "sfx_crowd_build", at: 2, gain: 0.7 }])] };
    case "strikeout": return { title: "STRIKEOUT", sub: "Sit down", small: true, cues: [{ s: "sfx_crowd_k" }, ...(P ? [{ s: "pa_sd_strikeout", at: 0.4, duck: true }] : [])] };
    case "stretch": return { title: "SEVENTH INNING STRETCH", sub: "Everybody up. Take me out to the ball game.", music: TRACKS.takeMeOut, musicSecs: 44, hold: 12000, cues: [...(P ? [{ s: "pa_sd_stretch", duck: true }] : []), { s: "mus_take_me_out_organ", at: P ? 4.5 : 0.5, gain: 0.9, local: true } as Cue, { s: "sfx_crowd_singalong", at: 6, gain: 0.55 }] };
    case "eighth": return { title: "8TH INNING", sub: "On your feet, San Diego. Sing it loud.", music: TRACKS.smallThings, musicSecs: 60, hold: 10000, cues: [{ s: "pa_sd_eighth", duck: true }, { s: "sfx_crowd_singalong", at: 2.5 }, { s: "chant_lets_go_padres", at: 14, gain: 0.7 }] };
    case "closer": return { title: "", music: P ? TRACKS.blind : undefined, musicSecs: 45, cues: [{ s: "sting_closer" }, { s: "sfx_crowd_closer", at: 1.2 }, ...(P ? [{ s: "pa_sd_closer", at: 6.5, duck: true }] : [])] };
    case "loss": return { title: "", cues: [{ s: "sfx_crowd_applause", gain: 0.6 }] };
    case "over": return { title: "", cues: [{ s: "sfx_crowd_applause" }, ...(P ? [{ s: "pa_sd_thank_you", at: 4, duck: true }] : [])] };
    case "walkout": return { title: P ? "PADRES BASEBALL" : t.name.toUpperCase(), sub: t.venue, music: P ? TRACKS.hellsBells : B ? TRACKS.goState : S ? TRACKS.halftime : undefined, musicSecs: 50, flash: true, fireworks: 6, cues: [{ s: "sfx_crowd_rise" }, { s: P ? "pa_sd_walkout" : B ? "pa_msu_welcome" : S ? "pa_no_cinematic_intro" : "pa_welcome", at: 1, duck: true }, { s: P ? "chant_lets_go_padres" : B ? "chant_hail_state" : "sfx_roar_huge", at: 7, gain: 0.8 }] };
    case "chant": return { title: P ? "LET'S GO PADRES" : S ? "WHO DAT" : M ? "HOTTY TODDY" : B ? "RING YOUR COWBELL" : sp === "baseball" ? "LET'S GO" : "DEFENSE", small: true, cues: chantFor(t) };
    case "cowbell": return { title: "RING YOUR COWBELL", small: true, cues: [{ s: "sfx_cowbells" }] };
    case "horn": return { title: P ? "SHIP'S WHISTLE" : B ? "COWBELLS" : "", small: true, cues: B ? [{ s: "sfx_cowbells" }] : [{ s: P ? "sfx_ships_whistle" : "sfx_goal_horn" }, { s: roar, at: 1, gain: 0.6 }] };
    case "defense": return { title: "DEFENSE", sub: "Make some noise", small: true, cues: [{ s: S ? "pa_no_defense" : M ? "pa_miss_defense" : "pa_make_noise", duck: true }, { s: B ? "sfx_cowbells" : "chant_defense", at: 2.4 }] };
    case "noise": return { title: "MAKE SOME NOISE", small: true, cues: [{ s: "pa_lets_get_loud", duck: true }, { s: "sfx_crowd_build", at: 1.4 }, { s: "sfx_roar_huge", at: 8.5, gain: 0.6 }] };
    case "fireworks": return { title: "", fireworks: 14, celebrate: 16, cues: [{ s: "sfx_fireworks" }, { s: "sfx_fireworks", at: 5, gain: 0.8 }, { s: roar, at: 1, gain: 0.5 }] };
    case "intro": return { title: t.name.toUpperCase(), sub: t.venue, cues: P ? [{ s: "pa_sd_walkout", duck: true }] : S ? [{ s: "pa_no_cinematic_intro", duck: true }] : [{ s: "sfx_drumline" }, ...welcomeFor(t).map((c) => ({ ...c, at: 3 }))] };
  }
}

export const demoKind = (t: Team): MomentKind => (SPORT[t.league] === "baseball" ? "hr" : SPORT[t.league] === "basketball" ? "three" : "td");

export function remoteButtons(t: Team): { k: MomentKind; label: string; big?: boolean }[] {
  const sp = SPORT[t.league];
  const { P, S, M, B } = is(t);
  if (P) return [{ k: "hr", label: "Home run", big: true }, { k: "chant", label: "Let's go Padres" }, { k: "horn", label: "Ship's whistle" }, { k: "strikeout", label: "Strikeout (K)" }, { k: "stretch", label: "7th inning stretch" }, { k: "eighth", label: "8th inning singalong" }, { k: "closer", label: "Closer entrance" }, { k: "walkout", label: "Padres walkout" }, { k: "run", label: "Run scores" }, { k: "fireworks", label: "Fireworks" }, { k: "win", label: "We win" }, { k: "over", label: "Season's over" }];
  if (sp === "baseball") return [{ k: "hr", label: "Home run", big: true }, { k: "run", label: "Run scores" }, { k: "chant", label: P ? "Let's go Padres" : "Organ rally" }, { k: "horn", label: P ? "Ship's whistle" : "Horn" }, { k: "strikeout", label: "Strikeout" }, { k: "noise", label: "Make noise" }, { k: "fireworks", label: "Fireworks" }, { k: "win", label: "We win" }];
  if (sp === "basketball") return [{ k: "three", label: "Three", big: true }, { k: "bucket", label: "Bucket" }, { k: "chant", label: "Defense chant" }, { k: "horn", label: "Horn" }, { k: "noise", label: "Make noise" }, { k: "fireworks", label: "Fireworks" }, { k: "win", label: "We win" }];
  return [{ k: "td", label: "Touchdown", big: true }, { k: "fg", label: "Field goal" }, { k: "chant", label: S ? "Who Dat" : M ? "Hotty Toddy" : B ? "Cowbells" : "Defense chant" }, { k: "defense", label: "Defense" }, { k: "horn", label: B ? "More cowbell" : "Horn" }, { k: "noise", label: "Make noise" }, { k: "fireworks", label: "Fireworks" }, { k: "win", label: "We win" }];
}
