/** Landing: pick a team, then pick what this device is (the big screen or the phone remote). */
import { h } from "./dom";
import { LEAGUE_NAME, PACKS, teamList, type League, type Team } from "./teams";

const base = import.meta.env.BASE_URL;

export function mountLanding(root: HTMLElement) {
  let team: Team | null = null;
  const step2 = h("section.step.step2.hidden");
  const picked = h("div.picked");
  const others = h("div.others.hidden");
  const list = h("div.team-list");
  const search = h("input.search", { type: "search", placeholder: "Search teams", "aria-label": "Search teams" }) as HTMLInputElement;
  let league: League = "mlb";
  let all: Team[] = [];
  const tabs = (["mlb", "nfl", "ncaaf", "wnba"] as League[]).map((l) => h("button.seg", { onclick: () => loadLeague(l), "data-l": l }, LEAGUE_NAME[l]));

  const card = (t: Team) => h(t.tag ? "button.team-card.tagged" : "button.team-card", { onclick: () => choose(t), style: { "--team": t.color, "--alt": t.alt } as any },
    h("img", { src: t.logo, alt: "" }),
    h("div", {}, h("b", {}, t.fullName), h("span", {}, t.venue)), t.tag ? h("em.tag", {}, t.tag) : null);

  function choose(t: Team) {
    team = t;
    localStorage.setItem("lite.team", t.key);
    picked.replaceChildren(h("img", { src: t.logo, alt: "" }), h("div", {}, h("span", {}, "Your team"), h("b", {}, t.fullName)));
    step2.classList.remove("hidden");
    step2.scrollIntoView({ behavior: "smooth", block: "start" });
    (step2.querySelector("button.mode") as HTMLElement | null)?.focus({ preventScroll: true });
  }

  async function loadLeague(l: League) {
    league = l;
    tabs.forEach((b) => b.classList.toggle("on", b.dataset.l === l));
    list.replaceChildren(h("p.muted", {}, "Loading teams..."));
    try { all = await teamList(l); if (league === l) renderList(); }
    catch { list.replaceChildren(h("p.muted", {}, "Couldn't load teams. Check the connection and try again.")); }
  }
  function renderList() {
    const qv = search.value.trim().toLowerCase();
    const items = all.filter((t) => !qv || t.fullName.toLowerCase().includes(qv) || t.abbr.toLowerCase() === qv).slice(0, 80);
    list.replaceChildren(...items.map((t) => h("button.mini-team", { onclick: () => choose(t), style: { "--team": t.color } as any }, h("img", { src: t.logo, alt: "", loading: "lazy" }), h("span", {}, t.fullName))));
  }
  search.oninput = renderList;

  const go = (mode: "screen" | "remote") => { if (mode === "remote") location.hash = "#/remote"; else if (team) location.hash = `#/screen?t=${encodeURIComponent(team.key)}`; };

  step2.append(
    h("h2", {}, "2. What is this device?"),
    picked,
    h("div.modes", {},
      h("button.mode", { onclick: () => go("screen") },
        h("div.mode-icon", { html: `<svg viewBox="0 0 48 36"><rect x="2" y="2" width="44" height="28" rx="3"/><path d="M16 34h16"/></svg>` }),
        h("b", {}, "Stadium screen"), h("span", {}, "For the TV, iPad or laptop. Goes full screen with the crowd and live score.")),
      h("button.mode", { onclick: () => go("remote") },
        h("div.mode-icon", { html: `<svg viewBox="0 0 48 36"><rect x="16" y="1" width="16" height="34" rx="3"/><path d="M22 30h4"/></svg>` }),
        h("b", {}, "Remote"), h("span", {}, "For your phone. Pair with the screen and fire off moments."))),
  );

  root.replaceChildren(h("div.landing", {},
    h("div.hero", { style: { backgroundImage: `url(${base}media/s_petco_night_behind_plate.jpg)` } }),
    h("header.top", {}, h("div.logo-word", {}, h("b", {}, "ROOM OS"), h("span", {}, "LITE")), h("a.credits-link", { href: "#/credits" }, "Credits")),
    h("main.wrap", {},
      h("section.intro", {},
        h("p.kicker", {}, "Free. Nothing to install."),
        h("h1", {}, "Turn any screen into the stadium."),
        h("p.lede", {}, "Real ballpark and stadium footage, a crowd that reacts to the live score, and your phone as the remote. Keep the game on your main TV and put this on any other screen."),
      ),
      h("section.step", {},
        h("h2", {}, "1. Pick your team"),
        h("div.packs", {}, ...PACKS.map(card)),
        h("button.link-btn", { onclick: () => { others.classList.toggle("hidden"); if (!all.length) void loadLeague(league); } }, "Another MLB, NFL, college or WNBA team"),
        others,
      ),
      step2,
      h("section.how", {},
        h("h2", {}, "How it works"),
        h("ol", {},
          h("li", {}, h("b", {}, "Big screen. "), "Open this page on a smart TV browser, iPad or laptop and choose Stadium screen. Tap to start so the sound can play."),
          h("li", {}, h("b", {}, "Phone. "), "Scan the code on the screen, or open this page and choose Remote. Fire off a home run, a chant or the horn."),
          h("li", {}, h("b", {}, "Game on. "), "During a live game it reacts to every score by itself. If your TV runs behind, use TV delay so the crowd lands with the picture."),
          h("li", {}, h("b", {}, "No game today? "), "Tap Play full day (demo) to see the whole game day in three minutes."),
          h("li", {}, h("b", {}, "My Players. "), "Add your fantasy guys and the screen pops an alert when one homers, drives in a run or hits a three."),
        )),
      h("footer.foot", {}, "Room OS Lite. Photos and clips are free licensed; see ", h("a", { href: "#/credits" }, "credits"), ". Scores from ESPN. Not affiliated with any team or league."),
    )));
  others.append(h("div.seg-row", {}, ...tabs), search, list);

  const saved = localStorage.getItem("lite.team");
  const pre = PACKS.find((p) => p.key === saved);
  if (pre) choose(pre);
}
