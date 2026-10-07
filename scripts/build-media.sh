#!/usr/bin/env bash
# Copies and compresses only the media Room OS Lite needs from the Room OS repo.
# Images: 1600 px wide JPEG. Clips: 1280x720 H.264, max 12 s, no audio. Sounds: copied as is.
set -euo pipefail
SRC=${SRC:-/workspace/stadium-room-v3}
cd "$(dirname "$0")/.."
OUT=$(cd "$(dirname "$0")/.." && pwd)/public
mkdir -p "$OUT/media" "$OUT/sounds"
IMAGES="s_petco_night_behind_plate s_petco_night_lower_level s_petco_night_low s_petco_behind_plate_upper s_petco_dusk_downtown s_sd_dusk_coronado
s_dome_upper_deck_wide s_dome_endzone_2011 s_dome_mid_sideline s_dome_upper_sideline s_dome_exterior_night s_nola_brass_second_line s_dome_black_gold_fans s_nola_bourbon_night
s_vh_auburn_wall s_vh_arkansas_2021 s_grove_tailgate_crowd s_grove_tents_day s_walk_of_champions s_vh_night_aerial_2"
VIDEOS="v_baseball_seats_night v_stadium_crowd_night v_stadium_packed_roof v_crowd_stands v_fireworks_crowd v_crowd_confetti v_ballpark_aerial_night v_lights_in_trees v_arena_crowd_lights"
SOUNDS="stands_bed_ballpark stands_bed_dome stands_bed_football stands_bed_grove stands_bed_second_line sfx_roar_baseball sfx_roar_football sfx_roar_huge sfx_ships_whistle sfx_goal_horn chant_whodat pa_no_who_dat chant_lets_go_padres chant_hotty_toddy pa_miss_are_you_ready chant_hotty_toddy_reply pa_sd_home_run pa_no_touchdown pa_miss_touchdown pa_touchdown pa_home_run pa_field_goal pa_no_field_goal pa_miss_field_goal sfx_organ_charge sfx_organ_lets_go sfx_fireworks pa_sd_welcome pa_no_welcome pa_miss_welcome pa_welcome chant_defense pa_sd_win pa_no_win pa_miss_win pa_win mus_take_me_out_organ sfx_crowd_build sfx_tension_murmur vend_peanuts vend_cracker_jack vend_hotdogs vend_beer vend_water sfx_brass_fanfare sfx_drumline pa_make_noise pa_lets_get_loud pa_sd_strikeout pa_no_defense pa_miss_defense pa_sd_cinematic_intro pa_no_cinematic_intro sfx_morning stands_bed_concourse sfx_grove_tailgate narr_hype_generic pa_kickoff pa_find_seats_kickoff pa_fireworks sfx_roar_basketball sfx_bed_arena sfx_buzzer pa_tip_off pa_play_ball pa_final pa_find_seats_first_pitch"
for f in $IMAGES; do
  [ -f "$OUT/media/$f.jpg" ] || ffmpeg -loglevel error -y -i "$SRC/media/$f.jpg" -vf "scale='min(1600,iw)':-2" -q:v 5 "$OUT/media/$f.jpg"
done
for f in $VIDEOS; do
  [ -f "$OUT/media/$f.mp4" ] || ffmpeg -loglevel error -y -i "$SRC/media/$f.mp4" -t 12 -an -vf "scale=1280:-2,fps=30" -c:v libx264 -profile:v main -pix_fmt yuv420p -preset slow -crf 28 -movflags +faststart "$OUT/media/$f.mp4"
done
for f in $SOUNDS; do cp "$SRC/packages/agent/sounds/$f.mp3" "$OUT/sounds/$f.mp3"; done
# Extra Wikimedia photos for Lite (sources/, credited in sources/EXTRA_LICENSES.md)
for f in sources/*.jpg; do b=$(basename "$f"); [ -f "$OUT/media/$b" ] || ffmpeg -loglevel error -y -i "$f" -vf "scale='min(1600,iw)':-2" -q:v 5 "$OUT/media/$b"; done # EXTRA
# Procedural sounds made for Lite (scripts/synth-lite.py): cowbells, road hum, radio hype, the fan club sting
python3 "$(dirname "$0")/synth-lite.py" "$OUT/sounds"
du -sh "$OUT/media" "$OUT/sounds"
