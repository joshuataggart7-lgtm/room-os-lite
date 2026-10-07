// Pre-renders Lite's crowd chants (ElevenLabs Sound Effects) and PA lines (ElevenLabs TTS) to raw mp3.
// Reads ELEVENLABS_API_KEY from the environment. The key is never printed or written anywhere.
// Usage: node scripts/gen-eleven.mjs <outdir> [only-id ...]
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error("ELEVENLABS_API_KEY not set"); process.exit(1); }
const OUT = process.argv[2] ?? "el-raw";
const ONLY = process.argv.slice(3);
mkdirSync(OUT, { recursive: true });
const API = "https://api.elevenlabs.io/v1";
const VOICE = "nPczCjzI2devNBz1zQrb"; // ElevenLabs premade "Brian", used before for Room OS; generic, not a real announcer
const live = "real live field recording from inside the stadium, huge open-air reverb, thousands of real voices";
export const ITEMS = [
  // crowd chants and roars (sound effects)
  { id: "crowd_lets_go_padres", sfx: `Massive baseball stadium crowd of 40,000 fans loudly chanting "Let's go Padres!" over and over in rhythm, clap clap clap-clap-clap between chants, ${live}`, sec: 12 },
  { id: "crowd_hail_state", sfx: `Huge college football stadium crowd shouting "Hail State!" while thousands of cowbells ring wildly, ${live}`, sec: 10 },
  { id: "crowd_whodat", sfx: `Packed domed NFL stadium crowd chanting "Who dat! Who dat! Who dat say dey gonna beat dem Saints!" in unison, echoing under the roof, ${live}`, sec: 10 },
  { id: "crowd_roar_homerun", sfx: `Baseball stadium crowd of 40,000 erupts into a massive roar and cheering after a home run, whistles and screams, ${live}`, sec: 9 },
  { id: "crowd_roar_touchdown", sfx: `Football stadium crowd of 60,000 explodes in a huge roar after a touchdown, screaming and stomping, ${live}`, sec: 9 },
  { id: "crowd_roar_arena", sfx: `Basketball arena crowd erupts after a three pointer, loud cheering and screaming, indoor arena reverb, ${live}`, sec: 6 },
  { id: "crowd_singalong", sfx: `Thousands of baseball fans singing along together loudly and happily in a stadium at night, a huge joyful crowd singalong, clapping on the beat, ${live}`, sec: 14 },
  { id: "crowd_strikeout", sfx: `Baseball crowd cheering and clapping after a strikeout, loud and excited, ${live}`, sec: 5 },
  { id: "crowd_win", sfx: `Baseball stadium crowd celebrating a big playoff win, sustained roaring, cheering and chanting, ${live}`, sec: 15 },
  { id: "crowd_quiet_applause", sfx: `Large stadium crowd after a season-ending loss, a disappointed groan that turns into long respectful applause for the team, ${live}`, sec: 12 },
  { id: "crowd_closer_build", sfx: `Stadium goes dark and 40,000 baseball fans roar and scream as the closer jogs in, rising crowd noise with whistles, ${live}`, sec: 10 },
  { id: "crowd_cheer_build", sfx: `Stadium crowd noise building from murmur to a huge roar, fans on their feet, ${live}`, sec: 8 },
  // PA and broadcaster lines (text to speech)
  { id: "pa_sd_welcome", tts: "[excited] Good evening, San Diego! [shouting] Welcome... to Petco Park!" },
  { id: "pa_sd_walkout", tts: "Ladies and gentlemen... [shouting] please welcome... your San Diego... PADRES!" },
  { id: "pa_sd_home_run", tts: "[shouting] Swung on... and BELTED! That ball is GONE! Padres home run!" },
  { id: "pa_sd_strikeout", tts: "[excited] Strike three! Sit down!" },
  { id: "pa_sd_closer", tts: "[dramatic] Now pitching for your San Diego Padres... [shouting] Mason... MILLER!" },
  { id: "pa_sd_win", tts: "[shouting] That's ballgame! The Padres... WIN IT! [excited] Ring that ship's whistle, San Diego!" },
  { id: "pa_sd_stretch", tts: "[excited] Alright San Diego, everybody on your feet! It's time for the seventh inning stretch!" },
  { id: "pa_sd_eighth", tts: "[shouting] Eighth inning, San Diego! Let me hear you!" },
  { id: "pa_sd_win_or_go_home", tts: "[intense] Tonight... it's win or go home. [shouting] Make some noise, San Diego!" },
  { id: "pa_sd_hype_intro", tts: "[dramatic] One city. One team. Forty thousand strong. [shouting] This... is... Padres baseball!" },
  { id: "pa_sd_thank_you", tts: "[warm] San Diego... thank you for an incredible season. We'll see you at Petco in the spring." },
  { id: "pa_msu_welcome", tts: "[excited] Welcome to Davis Wade Stadium! [shouting] Ring those cowbells, Bulldogs!" },
  { id: "pa_msu_touchdown", tts: "[shouting] TOUCHDOWN, Mississippi State! Ring 'em!" },
  { id: "pa_msu_hype_intro", tts: "[dramatic] Saturday in Starkville. Maroon and white. [shouting] Ring your cowbells... it's game day in Davis Wade!" },
  { id: "pa_no_touchdown", tts: "[shouting] TOUCHDOWN, SAINTS! [excited] Who dat!" },
  { id: "pa_home_run", tts: "[shouting] That ball is outta here! Home run!" },
  { id: "pa_touchdown", tts: "[shouting] TOUCHDOWN!" },
  { id: "pa_win", tts: "[shouting] That's the ballgame! [excited] What a win!" },
  { id: "pa_welcome", tts: "[excited] Welcome to game day! [shouting] Let's get loud!" },
  { id: "pa_play_ball", tts: "[shouting] It's time... to play... BALL!" },
  // batch 2: the rest of the announcer and chant clips
  { id: "crowd_defense", sfx: `Football stadium crowd chanting "DE-FENSE! DE-FENSE!" loudly in unison with stomping, ${live}`, sec: 9 },
  { id: "crowd_hotty_toddy", sfx: `Huge college football crowd shouting "Hotty Toddy!" together in unison and then cheering, ${live}`, sec: 8 },
  { id: "pa_no_welcome", tts: "[excited] Ladies and gentlemen... welcome to the Superdome! [shouting] Let's hear it for your New Orleans Saints!" },
  { id: "pa_no_win", tts: "[shouting] That's the ballgame! Your Saints... WIN! [excited] Who dat!" },
  { id: "pa_no_who_dat", tts: "[shouting] Who dat say dey gonna beat dem Saints?!" },
  { id: "pa_no_field_goal", tts: "[excited] The kick is... GOOD! Three points, Saints!" },
  { id: "pa_no_defense", tts: "[shouting] Saints defense... let me hear you!" },
  { id: "pa_miss_welcome", tts: "[excited] Welcome to Vaught-Hemingway Stadium! [shouting] Are you ready, Rebels?!" },
  { id: "pa_miss_touchdown", tts: "[shouting] TOUCHDOWN, Ole Miss!" },
  { id: "pa_miss_win", tts: "[shouting] Ballgame! The Rebels WIN! [excited] Hotty Toddy!" },
  { id: "pa_miss_field_goal", tts: "[excited] It's good! Three points, Rebels!" },
  { id: "pa_miss_defense", tts: "[shouting] Rebel defense... get loud!" },
  { id: "pa_miss_are_you_ready", tts: "[shouting] ARE YOU READY?!" },
  { id: "pa_field_goal", tts: "[excited] The kick is... GOOD!" },
  { id: "pa_make_noise", tts: "[shouting] Make some NOISE!" },
  { id: "pa_lets_get_loud", tts: "[shouting] Let's get LOUD in here!" },
  { id: "pa_find_seats_first_pitch", tts: "[excited] Fans, please find your seats. First pitch is just minutes away!" },
  { id: "pa_find_seats_kickoff", tts: "[excited] Fans, please find your seats. Kickoff is just minutes away!" },
  { id: "pa_kickoff", tts: "[shouting] Here we go! It's time for... KICKOFF!" },
  { id: "pa_tip_off", tts: "[shouting] Ladies and gentlemen... it's time for TIP OFF!" },
  { id: "pa_final", tts: "[excited] And that's a final!" },
  { id: "pa_no_cinematic_intro", tts: "[dramatic] The Superdome. The loudest house in football. [shouting] Here come your New Orleans... SAINTS!" },
  { id: "pa_hype_generic", tts: "[dramatic] Tonight... the lights are on. The crowd is in. [shouting] It's GAME TIME!" },
  // Padres underdog trailer (hype video). Facts from ESPN: lost Games 1 and 2 at Milwaukee (3-2, 4-3), won Game 3 at Petco 4-3.
  { id: "tr_heartbeat", sfx: "Slow heavy cinematic heartbeat, deep low thumps, lub-dub, lub-dub, movie trailer tension, dry and close", sec: 10 },
  { id: "tr_boom", sfx: "Massive cinematic movie trailer impact boom, deep sub bass hit with a long rumbling tail", sec: 4 },
  { id: "tr_drum_hit", sfx: "Epic cinematic taiko war drums, one huge synchronized hit with big hall reverb", sec: 3 },
  { id: "tr_drum_build", sfx: "Building cinematic trailer percussion, taiko drums and toms accelerating and rising to a huge climax", sec: 9 },
  { id: "tr_riser", sfx: "Cinematic trailer riser, rising tension whoosh climbing in pitch and ending in a hard hit", sec: 5 },
  { id: "tr_crowd_swell", sfx: `Baseball stadium crowd at night building from a nervous murmur to a deafening roar, 40,000 fans rising to their feet, ${live}`, sec: 16 },
  { id: "tr_01", tts: "[whispers] Oh and two." },
  { id: "tr_02", tts: "[serious] Down two games to none... in Milwaukee." },
  { id: "tr_03", tts: "[dramatic] Everybody... counted them out." },
  { id: "tr_04", tts: "[serious] They said it was over." },
  { id: "tr_05", tts: "[intense] Then the Padres... came home." },
  { id: "tr_06", tts: "[dramatic] Game three. Petco Park. [excited] Padres four... Brewers three!" },
  { id: "tr_07", tts: "[intense] Two games to one. Still alive." },
  { id: "tr_08", tts: "[serious] All the odds against them. [whispers] Nobody believes." },
  { id: "tr_09", tts: "[dramatic] But Goose... Peter... and this city... [intense] need this." },
  { id: "tr_10", tts: "[shouting] WIN... OR GO HOME!" },
  { id: "tr_11", tts: "[intense] N L D S. Game four. Petco Park." },
  { id: "tr_12", tts: "[shouting] LET'S... GO... PADRES!" },
];
async function call(url, body) {
  const r = await fetch(url, { method: "POST", headers: { "xi-api-key": KEY, "content-type": "application/json", accept: "audio/mpeg" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
  return Buffer.from(await r.arrayBuffer());
}
for (const it of ITEMS) {
  if (ONLY.length && !ONLY.includes(it.id)) continue;
  const out = `${OUT}/${it.id}.mp3`;
  if (existsSync(out)) { console.log("skip", it.id); continue; }
  try {
    let buf;
    if (it.sfx) buf = await call(`${API}/sound-generation?output_format=mp3_44100_128`, { text: it.sfx, duration_seconds: it.sec, prompt_influence: 0.6 });
    else {
      try { buf = await call(`${API}/text-to-speech/${VOICE}?output_format=mp3_44100_128`, { text: it.tts, model_id: "eleven_v3", voice_settings: { stability: 0.0, similarity_boost: 0.8, style: 0.9, use_speaker_boost: true } }); it.model = "eleven_v3"; }
      catch (e) { console.log("v3 failed for", it.id, String(e.message).slice(0, 120)); buf = await call(`${API}/text-to-speech/${VOICE}?output_format=mp3_44100_128`, { text: it.tts.replace(/\[[^\]]+\]\s*/g, ""), model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.3, similarity_boost: 0.8, style: 0.75, use_speaker_boost: true } }); it.model = "eleven_multilingual_v2"; }
    }
    writeFileSync(out, buf);
    console.log("ok", it.id, buf.length, it.model ?? "sfx");
  } catch (e) { console.log("FAIL", it.id, String(e.message).slice(0, 200)); }
}
