# Room OS Lite

A free, no-install version of the Room OS game-day room. Open it in any modern browser: a smart TV browser, an iPad, a laptop. Use a phone as the remote.

## How to use it

1. On the big screen, open the site, pick a team, choose **Stadium screen**, and tap **Tap to start** (browsers need one tap before they play sound).
2. Keep the real game on your main TV. Set **TV delay** so the crowd reacts when your broadcast does.
3. Optional: on your phone, open the same site, pick **Remote**, and type the 4 letter code shown on the big screen (or scan the QR code).
4. Not game time? Hit **Demo moment** or **Play full day (demo)**.

## What's inside

- Featured teams: Mississippi State (full game day: Huntsville morning, the drive, the Junction, Davis Wade, the stands, the ride home), Rocket City Trash Pandas, Chicago Sky, San Diego Padres, New Orleans Saints, Ole Miss. Any MLB, NFL, college football or WNBA team works with generic footage.
- Live scores come straight from the browser: ESPN's public scoreboard JSON for MLB, NFL, college football and WNBA, and the MLB Stats API for the minors.
- My Players: add fantasy players (MLB, minors, WNBA). A lower third pops when they homer, drive in a run or hit a three. Saved in your browser only.
- Phone remote pairs over the free PeerJS cloud (WebRTC). If pairing fails, the screen works fine on its own.

## Build

```
npm install
npm run dev      # local
npm run build    # static site in dist/
```

Media in `public/media` and `public/sounds` is already processed and committed. `scripts/` holds the tools that made it (they expect the original Room OS media folder).

## Credits

Every photo and clip is listed on the in-app Credits page and in `public/LICENSES.md`, with author and license. Sounds made for Lite (cowbells, road hum, the sting) were synthesized from scratch. Team names and logos belong to their owners; this is an unofficial fan project. Scores are from ESPN and MLB public endpoints and are not affiliated with or endorsed by them.

## Padres game day

Direct link: https://joshuataggart7-lgtm.github.io/room-os-lite/#/padres (or `?team=padres`). Straight to the big screen: `#/screen?t=padres`.

Six phases (Morning in San Diego, Park at the Park pregame, the walk in, behind the plate, the game, postgame), live ESPN series strip (WIN OR GO HOME only when the series data says so), strikeout K board, ship's whistle home runs, 7th inning stretch, 8th inning singalong, closer entrance banner, hype video (`public/media/padres_hype.mp4` is the downloadable cut, rendered by `scripts/render-hype.py` with no music). Songs play only through Spotify's embedded player (`src/spotify.ts`, every track ID checked against open.spotify.com).

Audio: `scripts/gen-eleven.mjs` renders chants and announcer lines with ElevenLabs once, offline (key from the environment, never stored), and `scripts/stadiumize.sh` adds stadium reverb and a real crowd bed. Nothing calls ElevenLabs at runtime.
