import { h } from "./dom";
import credits from "./credits.json";

export function mountCredits(root: HTMLElement) {
  const base = import.meta.env.BASE_URL;
  root.replaceChildren(h("div.credits", {},
    h("header.top", {}, h("a.logo-word", { href: "#/" }, h("b", {}, "ROOM OS"), h("span", {}, "LITE")), h("a.credits-link", { href: "#/" }, "Back")),
    h("main.wrap", {},
      h("h1", {}, "Credits"),
      h("p.lede", {}, "Every photo and clip is free licensed. Wikimedia Commons photos are credited as their licenses require. Pexels and Pixabay clips need no credit, but they are listed anyway. Files were cropped, resized and re-encoded; CC BY-SA adaptations are shared under the same license."),
      h("div.credit-list", {}, ...(credits as any[]).map((c) => h("div.credit", {},
        /\.jpg$/.test(c.file) ? h("img", { src: `${base}media/${c.file}`, alt: "", loading: "lazy" }) : h("div.credit-vid", {}, "Clip"),
        h("div", {},
          h("b", {}, c.notes.replace(/\s*\(.*?\)\s*/g, " ").trim()),
          h("p", {}, c.author, "  ·  ", c.licenseUrl ? h("a", { href: c.licenseUrl, target: "_blank", rel: "noopener" }, c.license) : c.license, "  ·  ", c.url ? h("a", { href: c.url, target: "_blank", rel: "noopener" }, c.source) : c.source),
        )))),
      h("h2", {}, "Sound"),
      h("p", {}, "Real crowd recordings: the crowd beds and roars are derived from \"AF Crowd Cheer Nat End\" by mglennsound on Freesound (CC0). AI-generated: the crowd chants (Let's Go Padres, Hail State, Who Dat, Defense, Hotty Toddy) and extra crowd swells were made with ElevenLabs Sound Effects, and every announcer line was made with ElevenLabs text to speech using a generic premade voice; nothing imitates a real announcer. Each clip then gets a stadium reverb and a real crowd bed underneath. Cowbells, the road hum and the stings are original synthesized audio. The organ Take Me Out to the Ball Game is an original arrangement of a public domain song."),
      h("h2", {}, "Music"),
      h("p", {}, "No copyrighted music ships with Room OS Lite. Songs (Korn's Blind for the closer, blink-182's All The Small Things in the 8th, AC/DC's Hells Bells for the walkout and hype video, The White Stripes' Seven Nation Army on home runs, a Take Me Out to the Ball Game organ track, the Mississippi State Famous Maroon Band and the Ying Yang Twins' Halftime) play only inside Spotify's own embedded player, which plays full songs when you're logged in to Spotify in that browser and 30 second previews otherwise."),
      h("h2", {}, "Scores and logos"),
      h("p", {}, "Live scores, schedules and team logos come from ESPN's public site API and are loaded in your browser. Room OS Lite is a fan project and is not affiliated with ESPN, MLB, the NFL, the NCAA or any team."),
      h("h2", {}, "Code"),
      h("p", {}, "Fonts: Oswald and Inter (SIL Open Font License). PeerJS and qrcode-generator (MIT). Full list: ", h("a", { href: `${base}LICENSES.md` }, "LICENSES.md"), "."),
    )));
}
