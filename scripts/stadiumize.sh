#!/usr/bin/env bash
# Turns raw ElevenLabs renders (el-raw/) into stadium-sounding clips in public/sounds:
# PA lines get a PA band-pass, compression, a convolution stadium reverb (scripts/stadium_ir.py) and the slap echo
# of delay towers, laid over a real crowd bed. Crowd chants get reverb, stereo width and a crowd bed underneath.
set -euo pipefail
RAW=${RAW:-/workspace/el-raw}
cd "$(dirname "$0")/.."
S=public/sounds
IR=$RAW/stadium_ir.wav
[ -f "$IR" ] || python3 scripts/stadium_ir.py "$IR"
pa() { # raw-id out-name bed
  local in=$RAW/$1.mp3; [ -f "$in" ] || { echo "missing $1"; return; }
  local d; d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in"); local dur; dur=$(python3 -c "print(round($d+2.6,2))")
  ffmpeg -loglevel error -y -i "$in" -i "$IR" -stream_loop -1 -i "$S/$3.mp3" -filter_complex "
    [0]aresample=44100,highpass=f=150,lowpass=f=7800,acompressor=threshold=-20dB:ratio=4:attack=4:release=120:makeup=3,pan=stereo|c0=c0|c1=c0,apad=pad_dur=2.6[v];
    [v]asplit=3[d][w][s];
    [w][1]afir=dry=0:wet=1:irgain=1,volume=0.42[wet];
    [s]adelay=175|205,highpass=f=300,volume=0.30[slap];
    [d][wet][slap]amix=inputs=3:normalize=0[pa];
    [2]atrim=0:$dur,volume=0.30[bed];
    [pa][bed]amix=inputs=2:duration=first:normalize=0,afade=t=out:st=$(python3 -c "print(round($dur-0.8,2))"):d=0.8,loudnorm=I=-15:TP=-1.5:LRA=11" -ar 44100 -ac 2 -b:a 112k "$S/$2.mp3"
  echo "pa $2"
}
crowd() { # raw-id out-name bed wet
  local in=$RAW/$1.mp3; [ -f "$in" ] || { echo "missing $1"; return; }
  local d; d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in")
  ffmpeg -loglevel error -y -i "$in" -i "$IR" -stream_loop -1 -i "$S/$3.mp3" -filter_complex "
    [0]aresample=44100,aformat=channel_layouts=stereo,asplit=2[d][w];
    [w][1]afir=dry=0:wet=1:irgain=1,volume=${4:-0.28}[wet];
    [d]extrastereo=m=1.5[dw];
    [dw][wet]amix=inputs=2:normalize=0[c];
    [2]atrim=0:$d,volume=0.22[bed];
    [c][bed]amix=inputs=2:duration=first:normalize=0,afade=t=in:d=0.15,afade=t=out:st=$(python3 -c "print(round($d-0.7,2))"):d=0.7,loudnorm=I=-14:TP=-1.2:LRA=14" -ar 44100 -ac 2 -b:a 128k "$S/$2.mp3"
  echo "crowd $2"
}
BB=stands_bed_ballpark; FB=stands_bed_football; DB=stands_bed_dome; CB=stands_bed_concourse
pa pa_sd_welcome pa_sd_welcome $BB; pa pa_sd_walkout pa_sd_walkout $BB; pa pa_sd_home_run pa_sd_home_run $BB
pa pa_sd_strikeout pa_sd_strikeout $BB; pa pa_sd_closer pa_sd_closer $BB; pa pa_sd_win pa_sd_win $BB
pa pa_sd_stretch pa_sd_stretch $BB; pa pa_sd_eighth pa_sd_eighth $BB; pa pa_sd_win_or_go_home pa_sd_win_or_go_home $BB
pa pa_sd_hype_intro pa_sd_hype_intro $BB; pa pa_sd_thank_you pa_sd_thank_you $BB
pa pa_msu_welcome pa_msu_welcome $FB; pa pa_msu_touchdown pa_msu_touchdown $FB; pa pa_msu_hype_intro pa_msu_hype_intro $FB
pa pa_no_touchdown pa_no_touchdown $DB; pa pa_no_welcome pa_no_welcome $DB; pa pa_no_win pa_no_win $DB; pa pa_no_who_dat pa_no_who_dat $DB
pa pa_no_field_goal pa_no_field_goal $DB; pa pa_no_defense pa_no_defense $DB; pa pa_no_cinematic_intro pa_no_cinematic_intro $DB
pa pa_miss_welcome pa_miss_welcome $FB; pa pa_miss_touchdown pa_miss_touchdown $FB; pa pa_miss_win pa_miss_win $FB; pa pa_miss_field_goal pa_miss_field_goal $FB
pa pa_miss_defense pa_miss_defense $FB; pa pa_miss_are_you_ready pa_miss_are_you_ready $FB
pa pa_home_run pa_home_run $BB; pa pa_play_ball pa_play_ball $BB; pa pa_find_seats_first_pitch pa_find_seats_first_pitch $BB
pa pa_touchdown pa_touchdown $FB; pa pa_field_goal pa_field_goal $FB; pa pa_kickoff pa_kickoff $FB; pa pa_find_seats_kickoff pa_find_seats_kickoff $FB
pa pa_win pa_win $CB; pa pa_welcome pa_welcome $CB; pa pa_make_noise pa_make_noise $CB; pa pa_lets_get_loud pa_lets_get_loud $CB
pa pa_tip_off pa_tip_off sfx_bed_arena; pa pa_final pa_final $CB; pa pa_hype_generic pa_hype_generic $CB
crowd crowd_lets_go_padres chant_lets_go_padres $BB; crowd crowd_hail_state chant_hail_state $FB; crowd crowd_whodat chant_whodat $DB 0.4
crowd crowd_defense chant_defense $FB; crowd crowd_hotty_toddy chant_hotty_toddy_reply $FB
crowd crowd_roar_homerun sfx_crowd_hr $BB; crowd crowd_roar_touchdown sfx_crowd_td $FB; crowd crowd_roar_arena sfx_crowd_three sfx_bed_arena 0.2
crowd crowd_singalong sfx_crowd_singalong $BB; crowd crowd_strikeout sfx_crowd_k $BB; crowd crowd_win sfx_crowd_win $BB
crowd crowd_quiet_applause sfx_crowd_applause $BB; crowd crowd_closer_build sfx_crowd_closer $BB; crowd crowd_cheer_build sfx_crowd_rise $BB
